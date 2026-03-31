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

const MONTH_NAMES = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
const MONTH_NUM: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

const RE_MON_DATE = new RegExp(
  `(\\d{1,2})[\\s\\-\\/](${MONTH_NAMES})[\\s\\-\\/](\\d{2,4})(?!\\d)`,
  "i"
);
const RE_NUM_DATE = /(?<!\d)(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?!\d)/;
const RE_ISO_DATE = /(?<!\d)(\d{4})[\/\-](\d{2})[\/\-](\d{2})(?!\d)/;
const RE_MON_PARTIAL = new RegExp(
  `(\\d{1,2})[\\-](${MONTH_NAMES})[\\-]\\s*$`,
  "i"
);

function normalizeDate(d: string, m: string, y: string): string {
  const dd = d.padStart(2, "0");
  const yy = y.length === 2 ? "20" + y : y;
  if (MONTH_NUM[m.toLowerCase()]) {
    return `${dd}/${MONTH_NUM[m.toLowerCase()]}/${yy}`;
  }
  return `${dd}/${m.padStart(2, "0")}/${yy}`;
}

function findDateInLine(
  line: string
): { date: string; start: number; end: number } | null {
  const m1 = RE_MON_DATE.exec(line);
  if (m1) {
    return { date: normalizeDate(m1[1], m1[2], m1[3]), start: m1.index, end: m1.index + m1[0].length };
  }
  const m3 = RE_ISO_DATE.exec(line);
  if (m3) {
    return { date: normalizeDate(m3[3], m3[2], m3[1]), start: m3.index, end: m3.index + m3[0].length };
  }
  const m2 = RE_NUM_DATE.exec(line);
  if (m2) {
    if (line.charAt(m2.index + m2[0].length) === ".") return null;
    return { date: normalizeDate(m2[1], m2[2], m2[3]), start: m2.index, end: m2.index + m2[0].length };
  }
  return null;
}

function extractAmounts(text: string): number[] {
  return (text.match(/\d[\d,]*\.\d{2}/g) ?? []).map((s) =>
    parseFloat(s.replace(/,/g, ""))
  );
}

function isAmountOnlyLine(line: string): boolean {
  const withoutAmounts = line
    .replace(/\d[\d,]*\.\d{2}/g, "")
    .replace(/[\s\/\-,|]/g, "");
  return withoutAmounts.length < 4 && extractAmounts(line).length >= 1;
}

function isJunkLine(line: string): boolean {
  const l = line.trim();
  if (!l || l.length < 2) return true;
  const patterns = [
    /^page\s*\d+(\s*(of\s*)?\d+)?$/i,
    /generated\s+(on|at|by)/i,
    /^s\.?\s*no\.?\b/i,
    /^(sl|sr)\.?\s*no\b/i,
    /^transaction\s*(id|no|date)$/i,
    /^(cheque|chq)\s*(no|number)?$/i,
    /^(withdrawal|debit)\s*(\(dr\))?$/i,
    /^(deposit|credit)\s*(\(cr\))?$/i,
    /^available\s*balance$/i,
    /^(opening|closing)\s*balance\b/i,
    /^balance\s*(b\/f|c\/f|brought|carried)/i,
    /^statement\s*(of\s*transactions)?/i,
    /^\*{3,}|^-{5,}|^={5,}|^_{5,}/,
    /this\s+is\s+a\s+(computer|system)/i,
    /does\s+not\s+require\s+signature/i,
    /^(dr|cr)\s*$/i,
    /legends\s+used/i,
    /^account\s*(name|number|type|no|holder)/i,
    /^(ifsc|micr|cin|swift)\s*(code)?/i,
    /^customer\s*(id|number)/i,
    /communication\s*address/i,
    /nomination\s*(details)?/i,
    /^(balance|description|narration|particulars|mode)\s*$/i,
    /^(ref|chq)\s*(no|number)?\s*$/i,
  ];
  return patterns.some((p) => p.test(l));
}

function stripSerialPrefix(text: string): string {
  return text
    .replace(/^\d+\s*[A-Z]\d{5,}\s*/i, "")
    .replace(/^\d+\s+/, "")
    .trim();
}

function buildDescription(parts: string[]): string {
  return parts.join(" ").replace(/\s+/g, " ").replace(/^[\s\/|]+|[\s\/|]+$/g, "").trim();
}

function categorize(desc: string): string {
  const d = desc.toLowerCase();
  if (/upi/i.test(d)) return "UPI";
  if (/neft/i.test(d)) return "NEFT";
  if (/rtgs/i.test(d)) return "RTGS";
  if (/imps|mmt/i.test(d)) return "IMPS";
  if (/ach/i.test(d)) return "ACH";
  if (/atm|cash\s*withdrawal/i.test(d)) return "ATM";
  if (/emi|loan/i.test(d)) return "EMI";
  if (/bil\/|bill/i.test(d)) return "Bill Payment";
  if (/pos|swipe|card/i.test(d)) return "Card";
  if (/cheque|chq|clg/i.test(d)) return "Cheque";
  if (/interest/i.test(d)) return "Interest";
  if (/salary|payroll/i.test(d)) return "Salary";
  if (/tax|gst|tds/i.test(d)) return "Tax";
  if (/inft|inf\//i.test(d)) return "Fund Transfer";
  return "Other";
}

function extractPayee(desc: string): string {
  const upiMatch = desc.match(/UPI\/([^\/]+)/i);
  if (upiMatch) return upiMatch[1].trim().substring(0, 40);
  const neftMatch = desc.match(/NEFT[-\/]([^\/]+)/i);
  if (neftMatch) return neftMatch[1].trim().substring(0, 40);
  const achMatch = desc.match(/ACH\/([^\/\s]+(?:\s+[^\/\s]+)*)/i);
  if (achMatch) return achMatch[1].trim().substring(0, 40);
  const inftMatch = desc.match(/INFT\/[^\/]*\/([^\/]+)/i);
  if (inftMatch) return inftMatch[1].trim().substring(0, 40);
  const mmtMatch = desc.match(/MMT\/IMPS\/\d+\/([^\/]+)/i);
  if (mmtMatch) return mmtMatch[1].trim().substring(0, 40);
  return desc.substring(0, 40);
}

function parseTransactions(text: string): Transaction[] {
  const rawLines = text.split("\n");
  const stitched: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (RE_MON_PARTIAL.test(line) && i + 1 < rawLines.length) {
      const next = rawLines[i + 1].trim();
      if (/^\d{4}$/.test(next)) {
        stitched.push(line.trimEnd() + next);
        i++;
        continue;
      }
    }
    stitched.push(line);
  }

  // --- Find opening balance ---
  let prevBalance = -1;
  const balancePatterns = [
    /(?:opening\s*balance|balance\s*(?:b\/f|brought\s*forward))[:\s]*([\d,]+\.\d{2})/i,
    /(?:balance\s*as\s*on)[:\s]*([\d,]+\.\d{2})/i,
    /(?:o\/b|ob)[:\s]*([\d,]+\.\d{2})/i,
  ];
  for (const line of stitched) {
    for (const pat of balancePatterns) {
      const m = pat.exec(line);
      if (m) {
        prevBalance = parseFloat(m[1].replace(/,/g, ""));
        break;
      }
    }
    if (prevBalance >= 0) break;
  }

  const lines = stitched.map((l) => l.trim()).filter((l) => l && !isJunkLine(l));

  // --- First pass: collect raw transaction data with all amounts ---
  interface RawTxn {
    date: string;
    descParts: string[];
    amounts: number[];
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

    let j = i + 1;
    while (j < lines.length && !findDateInLine(lines[j])) {
      allParts.push(lines[j]);
      j++;
    }

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

    if (!amountText.trim() && descParts.length > 0) {
      const lastPart = descParts[descParts.length - 1];
      if (extractAmounts(lastPart).length >= 1) {
        amountText = lastPart;
        descParts.pop();
      }
    }

    const amounts = extractAmounts(amountText);
    if (date && (amounts.length > 0 || descParts.length > 0)) {
      rawTxns.push({ date, descParts, amounts });
    }
    i = j;
  }

  // --- If we didn't find opening balance, infer from first transaction ---
  // Look at the first transaction with 2+ amounts: balance is last amount
  // prevBalance = balance +/- txnAmount
  if (prevBalance < 0 && rawTxns.length > 0) {
    for (const rt of rawTxns) {
      if (rt.amounts.length >= 2) {
        const bal = rt.amounts[rt.amounts.length - 1];
        const txn = rt.amounts[rt.amounts.length - 2];
        // We don't know direction yet; try both and pick the positive one
        const asDebit = bal + txn;
        const asCredit = bal - txn;
        prevBalance = asDebit > 0 ? asDebit : (asCredit > 0 ? asCredit : 0);
        break;
      }
    }
    if (prevBalance < 0) prevBalance = 0;
  }

  // --- Second pass: assign debit/credit using balance math ---
  const transactions: Transaction[] = [];

  for (const rt of rawTxns) {
    const { date, descParts, amounts } = rt;
    let withdrawal = "";
    let deposit = "";
    let balance = "";

    if (amounts.length >= 3) {
      // Likely: [debit, credit, balance] or [credit, debit, balance]
      const bal = amounts[amounts.length - 1];
      balance = bal.toFixed(2);

      // Use actual balance difference to determine debit/credit
      if (prevBalance >= 0) {
        const diff = bal - prevBalance;
        const absDiff = Math.abs(diff);
        // Find which of the earlier amounts matches the difference
        let matched = false;
        for (let a = amounts.length - 2; a >= 0; a--) {
          if (Math.abs(amounts[a] - absDiff) < 0.01) {
            if (diff > 0) deposit = amounts[a].toFixed(2);
            else withdrawal = amounts[a].toFixed(2);
            matched = true;
            break;
          }
        }
        if (!matched) {
          // Fallback: use the non-zero amounts before balance
          const txnAmounts = amounts.slice(0, amounts.length - 1).filter(a => a > 0);
          if (txnAmounts.length === 1) {
            if (diff > 0) deposit = txnAmounts[0].toFixed(2);
            else withdrawal = txnAmounts[0].toFixed(2);
          } else if (txnAmounts.length >= 2) {
            // Two non-zero amounts before balance - first is usually debit, second credit
            withdrawal = txnAmounts[0].toFixed(2);
            deposit = txnAmounts[1].toFixed(2);
          }
        }
      } else {
        // No prevBalance context - use positional heuristic
        withdrawal = amounts[0] > 0 ? amounts[0].toFixed(2) : "";
        deposit = amounts[1] > 0 ? amounts[1].toFixed(2) : "";
      }
      prevBalance = bal;

    } else if (amounts.length === 2) {
      const bal = amounts[1];
      const txn = amounts[0];
      balance = bal.toFixed(2);

      if (prevBalance >= 0) {
        // Use actual balance difference - this is the ground truth
        const diff = bal - prevBalance;
        const absDiff = Math.abs(diff);

        // Verify the transaction amount matches the balance change
        if (Math.abs(txn - absDiff) < 0.01) {
          // Transaction matches balance change exactly
          if (diff > 0) deposit = txn.toFixed(2);
          else withdrawal = txn.toFixed(2);
        } else {
          // Transaction amount doesn't match balance change
          // Trust the balance column - derive the actual amount from balance diff
          if (diff > 0) deposit = absDiff.toFixed(2);
          else if (diff < 0) withdrawal = absDiff.toFixed(2);
          else {
            // Balance unchanged - use keyword heuristic
            const desc = buildDescription(descParts).toLowerCase();
            if (/salary|credit|refund|cashback|interest|reward|received|deposit/i.test(desc)) {
              deposit = txn.toFixed(2);
            } else {
              withdrawal = txn.toFixed(2);
            }
          }
        }
      } else {
        // No prevBalance - use keyword heuristic
        const desc = buildDescription(descParts).toLowerCase();
        if (/salary|credit|refund|cashback|interest|reward|received|deposit|inft|inf\//i.test(desc)) {
          deposit = txn.toFixed(2);
        } else {
          withdrawal = txn.toFixed(2);
        }
      }
      prevBalance = bal;

    } else if (amounts.length === 1) {
      const desc = buildDescription(descParts).toLowerCase();
      if (/salary|credit|refund|cashback|interest|reward|received|deposit|inft|inf\/|rtgs.*credit/i.test(desc)) {
        deposit = amounts[0].toFixed(2);
      } else {
        withdrawal = amounts[0].toFixed(2);
      }
    }

    const description = buildDescription(descParts);
    if (date && (withdrawal || deposit || description)) {
      transactions.push({ date, description: description || "N/A", withdrawal, deposit, balance });
    }
  }

  return transactions;
}

export async function bankStatementToCsv(
  buffer: Buffer,
  originalName: string
): Promise<{ fileName: string; csvBuffer: Buffer; mimeType: string }> {
  const data = await parsePdf(buffer);
  let text = data.text;

  if (text.trim().length < 50) {
    throw new Error("Could not extract text from this PDF. It may be a scanned image - try a text-based statement.");
  }

  const transactions = parseTransactions(text);

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
