// pdf-parse v1 tries to load a test file on require(), so we lazy-import it
async function parsePdf(buffer: Buffer): Promise<{ text: string }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  return pdfParse(buffer);
}
import { Parser } from "json2csv";
import { generateOutputName } from "../helpers";

interface Transaction {
  date: string;
  description: string;
  withdrawal: string;
  deposit: string;
  balance: string;
}

// ====================================================================
// DATE DETECTION
// ====================================================================

const MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
const MONTH_NUM: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function normalizeDate(d: string, m: string, y: string): string {
  const dd = d.padStart(2, "0");
  let yy = y;
  if (yy.length === 2) yy = parseInt(yy) > 50 ? "19" + yy : "20" + yy;
  const mm = MONTH_NUM[m.toLowerCase()] || m.padStart(2, "0");
  return `${dd}/${mm}/${yy}`;
}

// All date regexes — applied to already-stitched text
// Month-name patterns don't need digit-boundary — month name itself is the anchor.
// This handles "S733339411-Apr-2025" where "11-Apr-2025" is glued to a txn ID.
const DATE_PATTERNS = [
  // DD-Mon-YYYY (most common Indian bank format, handles glued prefixes)
  { re: new RegExp(`(\\d{1,2})[\\s\\-\\/](${MONTHS})[,\\s\\-\\/]+(\\d{4})`, "i"), groups: [1, 2, 3] },
  // DD-Mon-YY (Canara: 22-JUL-22)
  { re: new RegExp(`(\\d{1,2})[\\s\\-\\/](${MONTHS})[,\\s\\-\\/]+(\\d{2})(?!\\d)`, "i"), groups: [1, 2, 3] },
  // DD/MM/YYYY or DD-MM-YYYY (needs digit boundary to avoid false matches)
  { re: /(?<!\d)(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, groups: [1, 2, 3] },
  // DD/MM/YY
  { re: /(?<!\d)(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})(?!\d)/, groups: [1, 2, 3] },
  // YYYY-MM-DD (ISO)
  { re: /(?<!\d)(\d{4})[\/\-](\d{2})[\/\-](\d{2})/, groups: [3, 2, 1] },
];

function findDateInLine(line: string): { date: string; start: number; end: number } | null {
  for (const { re, groups } of DATE_PATTERNS) {
    const m = re.exec(line);
    if (m) {
      // Skip if followed by a dot (part of a decimal number)
      if (line.charAt(m.index + m[0].length) === ".") continue;
      const d = m[groups[0]];
      const month = m[groups[1]];
      const y = m[groups[2]];
      // Validate: day should be 1-31, month 1-12 for numeric
      const dayNum = parseInt(d);
      if (dayNum < 1 || dayNum > 31) continue;
      if (/^\d+$/.test(month)) {
        const monNum = parseInt(month);
        if (monNum < 1 || monNum > 12) continue;
      }
      return {
        date: normalizeDate(d, month, y),
        start: m.index,
        end: m.index + m[0].length,
      };
    }
  }
  return null;
}

// ====================================================================
// AMOUNT EXTRACTION — handles Indian numbering AND concatenated amounts
// ====================================================================

function extractAmounts(text: string): number[] {
  // First, fix concatenated amounts: "81250.0081250.00" → "81250.00 81250.00"
  const fixed = text.replace(/(\d\.\d{2})(\d)/g, "$1 $2");
  // Match amounts: 542.00, 1,200.00, 85,000.00, 1,23,456.78
  const matches = fixed.match(/\d[\d,]*\.\d{2}/g);
  if (!matches) return [];
  return matches.map((s) => parseFloat(s.replace(/,/g, "")));
}

function isAmountOnlyLine(line: string): boolean {
  const fixed = line.replace(/(\d\.\d{2})(\d)/g, "$1 $2");
  const stripped = fixed.replace(/\d[\d,]*\.\d{2}/g, "").replace(/[\s\/\-,|()DrCr]/gi, "");
  return stripped.length < 4 && extractAmounts(line).length >= 1;
}

// ====================================================================
// DR/CR DETECTION
// ====================================================================

function detectDrCr(text: string): "DR" | "CR" | null {
  const cleaned = text.replace(/\d[\d,]*\.\d{2}/g, "");
  if (/\bDR\b/i.test(cleaned)) return "DR";
  if (/\bCR\b/i.test(cleaned)) return "CR";
  return null;
}

function directionFromDescription(desc: string): "CR" | "DR" | null {
  if (/^by\s+transfer/i.test(desc) || /transfer\s+from/i.test(desc)) return "CR";
  if (/^to\s+transfer/i.test(desc) || /transfer\s+to/i.test(desc)) return "DR";
  if (/neft\s*cr\b/i.test(desc) || /upi\/cr\b/i.test(desc)) return "CR";
  if (/neft\s*dr\b/i.test(desc) || /upi\/dr\b/i.test(desc)) return "DR";
  if (/salary|payroll|interest\s*(credit|earned)|refund|cashback|reward|dividend|pension|subsidy/i.test(desc)) return "CR";
  if (/emi\s*debit|loan\s*debit|insurance\s*premium/i.test(desc)) return "DR";
  return null;
}

// ====================================================================
// JUNK LINE FILTER
// ====================================================================

function isJunkLine(line: string): boolean {
  const l = line.trim();
  if (!l || l.length < 2) return true;
  const patterns = [
    /^page\s*\d+/i,
    /generated\s+on\s*:/i,
    /^statement\s*(of|period|from)/i,
    /^account\s*(statement|details|name|number|type|no|holder|summary|currency)/i,
    /^communication\s*address/i,
    /^customer\s*(id|number)/i,
    /^(ifsc|micr|cin|swift|branch)\s*(code|:)/i,
    /^s\.?\s*no\s*transaction/i,
    /^(txn|tran|transaction)\s*(date|id|no)\s*$/i,
    /^value\s*(date|dt)\s*$/i,
    /^(cheque|chq)\s*(no|number|details)?\s*$/i,
    /^(withdrawal|debit)\s*(amt\.?|amount)?/i,
    /^(deposit|credit)\s*(amt\.?|amount)?/i,
    /^(closing|available|total\s*effective)\s*(balance|available)/i,
    /^(opening|closing)\s*balance\b/i,
    /^balance\s*(b\/f|c\/f|brought|carried|\(inr\))/i,
    /^(narration|particulars|description)\s*$/i,
    /^\*{3,}|^-{5,}|^={5,}|^_{5,}/,
    /this\s+is\s+a\s+(computer|system)/i,
    /does\s+not\s+require/i,
    /legends?\s+(used|:)/i,
    /toll\s*free|customer\s*care|helpline/i,
    /www\.\w+|http/i,
    /regd\.?\s*office/i,
    /nomination\s*(registered|details)/i,
    /contents\s+of\s+this/i,
    /^available\s*balance\s*:?\s*$/i,
    /^\u20b9/,  // starts with ₹ symbol (balance display)
    /^inr\s*$/i,
    /^balance\s*$/i,
  ];
  return patterns.some((p) => p.test(l));
}

// ====================================================================
// TEXT PREPROCESSING — the key fix for ICICI-style PDFs
// ====================================================================

function preprocessText(text: string): string {
  let lines = text.split("\n");

  // Remove page footers like "Generated on : 20 Mar'26 (11:14 AM)Page 2 of 83"
  lines = lines.filter(l => !/generated\s+on\s*:/i.test(l));
  lines = lines.filter(l => !/^page\s*\d+\s*of\s*\d+\s*$/i.test(l.trim()));

  // Rejoin into single string then re-split for stitching
  let joined = lines.join("\n");

  // Stitch dates split across lines:
  // "11-Apr-\n2025" → "11-Apr-2025"
  // "11-Apr-\r\n2025" → "11-Apr-2025"
  const monthPattern = MONTHS.replace(/\|/g, "|");
  const stitchRe = new RegExp(
    `(\\d{1,2})[\\-\\/](${monthPattern})[\\-\\/]\\s*\\n\\s*(\\d{2,4})`, "gi"
  );
  joined = joined.replace(stitchRe, "$1-$2-$3");

  // Also stitch: "11-Apr\n-2025" variant
  const stitchRe2 = new RegExp(
    `(\\d{1,2})[\\-\\/](${monthPattern})\\s*\\n\\s*[\\-\\/](\\d{2,4})`, "gi"
  );
  joined = joined.replace(stitchRe2, "$1-$2-$3");

  // Fix concatenated amounts: "81250.0081250.00" → "81250.00 81250.00"
  joined = joined.replace(/(\d\.\d{2})(\d)/g, "$1 $2");

  return joined;
}

// ====================================================================
// HELPERS
// ====================================================================

function stripSerialPrefix(text: string): string {
  // Remove serial number + transaction ID like "1S73333941" or "123 " at start
  return text
    .replace(/^\d{1,4}\s*[A-Z]\d{5,}\s*/i, "")  // "1S73333941..."
    .replace(/^\d{1,4}\s{2,}/, "")                // "  123  ..."
    .replace(/^\d{1,4}\s+(?=[A-Z])/i, "")         // "1 UPI/..."
    .trim();
}

function buildDescription(parts: string[]): string {
  return parts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\/|]+|[\s\/|]+$/g, "")
    .trim();
}

// ====================================================================
// CATEGORIZATION
// ====================================================================

function categorize(desc: string): string {
  const d = desc.toLowerCase();
  if (/\bupi\b/i.test(d)) return "UPI";
  if (/\bneft\b/i.test(d)) return "NEFT";
  if (/\brtgs\b/i.test(d)) return "RTGS";
  if (/\b(imps|mmt)\b/i.test(d)) return "IMPS";
  if (/\b(ach|nach|ecs)\b/i.test(d)) return "ACH";
  if (/\b(atm|cash\s*withdraw)/i.test(d)) return "ATM";
  if (/\b(emi|loan\s*(?:repay|debit))\b/i.test(d)) return "EMI";
  if (/\b(bil\/|bill\s*pay|bbps|bpay)\b/i.test(d)) return "Bill Payment";
  if (/\b(pos|swipe|card|visa|mastercard|rupay|pcd|pci)\b/i.test(d)) return "Card";
  if (/\b(cheque|chq|clg|clearing)\b/i.test(d)) return "Cheque";
  if (/\binterest\b/i.test(d)) return "Interest";
  if (/\b(salary|payroll|bulk\s*posting)\b/i.test(d)) return "Salary";
  if (/\b(tax|gst|tds|income\s*tax)\b/i.test(d)) return "Tax";
  if (/\b(inft|inf\/|ift|fund\s*transfer)\b/i.test(d)) return "Fund Transfer";
  if (/\b(insurance|lic|vps)\b/i.test(d)) return "Insurance";
  if (/\b(cash\s*deposit)\b/i.test(d)) return "Cash Deposit";
  if (/\b(trf)\b/i.test(d)) return "Transfer";
  return "Other";
}

// ====================================================================
// PAYEE EXTRACTION
// ====================================================================

function extractPayee(desc: string): string {
  // HDFC: UPI-NAME-VPA-...
  const hdfc = desc.match(/^UPI[-\/]([^-\/]{2,})/i);
  if (hdfc) return hdfc[1].trim().substring(0, 50);
  // UPI/CR/REF/NAME or UPI/P2A/REF/NAME
  const upiSub = desc.match(/UPI\/(?:CR|DR|P2A|P2M)\/\d+\/([^\/]+)/i);
  if (upiSub) return upiSub[1].trim().substring(0, 50);
  // UPI/REF/desc/VPA
  const upiRef = desc.match(/UPI\/\d+\/([^\/]+)/i);
  if (upiRef) return upiRef[1].trim().substring(0, 50);
  // UPI/NAME (generic)
  const upiGen = desc.match(/UPI\/([^\/]{2,})/i);
  if (upiGen) return upiGen[1].trim().substring(0, 50);
  // NEFT: NEFT CR-IFSC-NAME or NEFT-UTR-NAME
  const neftIfsc = desc.match(/NEFT\s*(?:CR|DR)?[-\/]([A-Z]{4}[A-Z0-9]+)[-\/]([^-\/]+)/i);
  if (neftIfsc) return neftIfsc[2].trim().substring(0, 50);
  const neft = desc.match(/NEFT[-\/]([^-\/]{2,})/i);
  if (neft) return neft[1].trim().substring(0, 50);
  // RTGS: RTGS-UTR-NAME
  const rtgs = desc.match(/RTGS[-\/]([A-Z0-9]+)[-\/]([^-\/]+)/i);
  if (rtgs) return rtgs[2].trim().substring(0, 50);
  // IMPS/MMT: MMT/IMPS/REF/NAME or IMPS-REF-NAME
  const mmt = desc.match(/(?:MMT\/IMPS|IMPS)[-\/]\d+[-\/]([^-\/]+)/i);
  if (mmt) return mmt[1].trim().substring(0, 50);
  // INFT: INFT/X/NAME or INF/INFT/REF/NAME
  const inft = desc.match(/(?:INF\/INFT|INFT|IFT)\/\d+\/([^\/]+)/i);
  if (inft) return inft[1].trim().substring(0, 50);
  // CLG: CLG/NAME
  const clg = desc.match(/CLG\/([^\/]+)/i);
  if (clg) return clg[1].trim().substring(0, 50);
  // TRF/NAME
  const trf = desc.match(/TRF\/([^\/]+)/i);
  if (trf) return trf[1].trim().substring(0, 50);
  // Union Bank: BY/TO TRANSFER
  const union = desc.match(/(?:BY|TO)\s+TRANSFER[-\s]+(.+)/i);
  if (union) return union[1].trim().substring(0, 50);
  // Fallback
  return desc.replace(/\b[A-Z]{4}0\d{6}\b/g, "").replace(/\b\d{10,}\b/g, "").trim().substring(0, 50);
}

// ====================================================================
// MAIN PARSER
// ====================================================================

function parseTransactions(text: string): Transaction[] {
  // --- Preprocess: fix split lines, concatenated amounts, page footers ---
  const processed = preprocessText(text);
  const allLines = processed.split("\n");

  // --- Detect DR/CR column layout (Axis, IDBI, Federal) ---
  let hasDrCrColumn = false;
  for (const line of allLines.slice(0, 40)) {
    if (/\bDR\s*\/\s*CR\b/i.test(line) || /\bCR\s*\/\s*DR\b/i.test(line)) {
      hasDrCrColumn = true;
      break;
    }
  }

  // --- Find opening balance ---
  let prevBalance = -1;
  for (const line of allLines) {
    const patterns = [
      /(?:opening\s*balance|balance\s*(?:b\/f|brought\s*forward))[:\s]*([\d,]+\.\d{2})/i,
      /(?:balance\s*as\s*on|b\/f)[:\s]*([\d,]+\.\d{2})/i,
      /(?:o\/b|ob)\s*:?\s*([\d,]+\.\d{2})/i,
    ];
    for (const pat of patterns) {
      const m = pat.exec(line);
      if (m) { prevBalance = parseFloat(m[1].replace(/,/g, "")); break; }
    }
    if (prevBalance >= 0) break;
  }

  // --- Filter junk ---
  const lines = allLines.map(l => l.trim()).filter(l => l && !isJunkLine(l));

  // --- First pass: group lines into transactions ---
  interface RawTxn {
    date: string;
    descParts: string[];
    amounts: number[];
    drCrFlag: "DR" | "CR" | null;
  }
  const rawTxns: RawTxn[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const dateInfo = findDateInLine(line);
    if (!dateInfo) { i++; continue; }

    const { date, start, end } = dateInfo;
    const before = stripSerialPrefix(line.substring(0, start).trim());
    const after = line.substring(end).trim();

    const allParts: string[] = [];
    if (before) allParts.push(before);
    if (after) allParts.push(after);

    
    // Collect continuation lines until the next date
    let j = i + 1;
    while (j < lines.length) {
      const nextLine = lines[j];
      const nextDate = findDateInLine(nextLine);
      // If next line starts with a date (within first ~20 chars), it's a new txn
      if (nextDate && nextDate.start < 20) break;
      allParts.push(nextLine);
      j++;
    }

    // Separate amounts from description parts
    // Work backwards: amount-only lines at the end are amount data
    let amountBlockStart = allParts.length;
    for (let k = allParts.length - 1; k >= 0; k--) {
      if (isAmountOnlyLine(allParts[k])) amountBlockStart = k;
      else break;
    }

    let amountText = "";
    const descParts: string[] = [];
    for (let k = 0; k < allParts.length; k++) {
      if (k >= amountBlockStart) amountText += " " + allParts[k];
      else descParts.push(allParts[k]);
    }

    // If no amount block found, check last desc part for embedded amounts
    if (!amountText.trim() && descParts.length > 0) {
      const lastPart = descParts[descParts.length - 1];
      if (extractAmounts(lastPart).length >= 1) {
        amountText = lastPart;
        descParts.pop();
      }
    }

    // Also scan all parts for amounts if still empty
    if (!amountText.trim()) {
      for (let k = allParts.length - 1; k >= 0; k--) {
        if (extractAmounts(allParts[k]).length > 0) {
          amountText = allParts.slice(k).join(" ");
          // Remove those from descParts
          while (descParts.length > k) descParts.pop();
          break;
        }
      }
    }

    const amounts = extractAmounts(amountText);
    const drCrFlag = hasDrCrColumn ? detectDrCr(allParts.join(" ")) : null;

    if (date && (amounts.length > 0 || descParts.length > 0)) {
      rawTxns.push({ date, descParts, amounts, drCrFlag });
    }
    i = j;
  }

  // --- Infer opening balance from first transaction if not found ---
  if (prevBalance < 0 && rawTxns.length > 0) {
    for (const rt of rawTxns) {
      if (rt.amounts.length >= 2) {
        const bal = rt.amounts[rt.amounts.length - 1];
        const txn = rt.amounts[rt.amounts.length - 2];
        prevBalance = Math.max(bal + txn, bal - txn, 0);
        break;
      }
    }
    if (prevBalance < 0) prevBalance = 0;
  }

  // --- Second pass: assign debit/credit ---
  const transactions: Transaction[] = [];

  for (const rt of rawTxns) {
    const { date, descParts, amounts, drCrFlag } = rt;
    const description = buildDescription(descParts);
    let withdrawal = "";
    let deposit = "";
    let balance = "";

    if (drCrFlag && amounts.length >= 1) {
      // Single amount + DR/CR (Axis, IDBI)
      const bal = amounts.length >= 2 ? amounts[amounts.length - 1] : -1;
      const txn = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0];
      if (bal >= 0) balance = bal.toFixed(2);
      if (drCrFlag === "DR") withdrawal = txn.toFixed(2);
      else deposit = txn.toFixed(2);
      if (bal >= 0) prevBalance = bal;

    } else if (amounts.length >= 3) {
      // 3+ amounts: [debit?, credit?, balance] or variations
      const bal = amounts[amounts.length - 1];
      balance = bal.toFixed(2);
      if (prevBalance >= 0) {
        const diff = bal - prevBalance;
        const absDiff = Math.abs(diff);
        let matched = false;
        for (let a = amounts.length - 2; a >= 0; a--) {
          if (Math.abs(amounts[a] - absDiff) < 0.015) {
            if (diff > 0) deposit = amounts[a].toFixed(2);
            else withdrawal = amounts[a].toFixed(2);
            matched = true;
            break;
          }
        }
        if (!matched) {
          if (Math.abs(diff) > 0.01) {
            if (diff > 0) deposit = absDiff.toFixed(2);
            else withdrawal = absDiff.toFixed(2);
          }
        }
      } else {
        const dir = directionFromDescription(description);
        const nonBal = amounts.slice(0, -1).filter(a => a > 0);
        if (nonBal.length >= 1) {
          if (dir === "CR") deposit = nonBal[0].toFixed(2);
          else withdrawal = nonBal[0].toFixed(2);
        }
      }
      prevBalance = bal;

    } else if (amounts.length === 2) {
      // [txn, balance]
      const bal = amounts[1];
      const txn = amounts[0];
      balance = bal.toFixed(2);

      if (prevBalance >= 0) {
        const diff = bal - prevBalance;
        const absDiff = Math.abs(diff);
        if (Math.abs(txn - absDiff) < 0.015) {
          if (diff > 0) deposit = txn.toFixed(2);
          else withdrawal = txn.toFixed(2);
        } else {
          const dir = directionFromDescription(description);
          if (dir === "CR") deposit = txn.toFixed(2);
          else if (dir === "DR") withdrawal = txn.toFixed(2);
          else if (diff > 0.01) deposit = absDiff.toFixed(2);
          else if (diff < -0.01) withdrawal = absDiff.toFixed(2);
          else withdrawal = txn.toFixed(2);
        }
      } else {
        const dir = directionFromDescription(description);
        if (dir === "CR") deposit = txn.toFixed(2);
        else withdrawal = txn.toFixed(2);
      }
      prevBalance = bal;

    } else if (amounts.length === 1) {
      const dir = directionFromDescription(description);
      if (dir === "CR") deposit = amounts[0].toFixed(2);
      else withdrawal = amounts[0].toFixed(2);
    }

    if (date && (withdrawal || deposit || description)) {
      transactions.push({ date, description: description || "N/A", withdrawal, deposit, balance });
    }
  }

  return transactions;
}

// ====================================================================
// EXPORT
// ====================================================================

export async function bankStatementToCsv(
  buffer: Buffer,
  originalName: string
): Promise<{ fileName: string; csvBuffer: Buffer; mimeType: string }> {
  const data = await parsePdf(buffer);
  const text = data.text;

  console.log("=== PDF TEXT DEBUG ===");
  console.log("Length:", text.length);
  console.log("First 2000 chars:", text.substring(0, 2000));
  console.log("=== END ===");

  if (text.trim().length < 50) {
    throw new Error("Could not extract text from this PDF. It may be a scanned image - try a text-based statement.");
  }

  const transactions = parseTransactions(text);

  console.log(`[Parser] Found ${transactions.length} transactions`);
  if (transactions.length > 0) {
    console.log("[Parser] First:", JSON.stringify(transactions[0]));
    console.log("[Parser] Last:", JSON.stringify(transactions[transactions.length - 1]));
  }

  if (transactions.length === 0) {
    throw new Error("No transactions found. The PDF may not be a recognized bank statement format.");
  }

  const rows = transactions.map((t) => ({
    Date: t.date,
    Payee: extractPayee(t.description),
    Description: t.description,
    Category: categorize(t.description),
    Debit: t.withdrawal,
    Credit: t.deposit,
    Balance: t.balance,
  }));

  const fields = ["Date", "Payee", "Description", "Category", "Debit", "Credit", "Balance"];
  const parser = new Parser({ fields });
  const csv = parser.parse(rows);

  return {
    fileName: generateOutputName(originalName, "_bank_statement.csv"),
    csvBuffer: Buffer.from(csv, "utf-8"),
    mimeType: "text/csv",
  };
}
