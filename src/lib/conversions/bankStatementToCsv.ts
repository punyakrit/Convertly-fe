// pdf-parse's index.js loads a test PDF on require() which breaks on Vercel.
// Import the internal lib directly to skip that.
async function parsePdf(buffer: Buffer): Promise<{ text: string }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
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
  if (/\bdirect\s*debit\b/i.test(d)) return "Direct Debit";
  if (/\bdirect\s*credit\b/i.test(d)) return "Direct Credit";
  if (/\bfast\s*transfer\b/i.test(d)) return "Transfer";
  if (/\btransfer\s+to\b/i.test(d)) return "Transfer";
  if (/\btransfer\s+from\b/i.test(d)) return "Transfer";
  if (/\badjust\s*purchase\b/i.test(d)) return "Refund";
  if (/\baldi|coles|woolworths|kmart|costco\b/i.test(d)) return "Groceries";
  if (/\bhungry\s*jacks|mcdonald|domino|pizza|zomato|swiggy|uber\s*eats\b/i.test(d)) return "Food";
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
// COMMBANK / AUSTRALIAN BANK PARSER
// ====================================================================
// CommBank format: "DD Mon[YYYY] Description Debit$$BalanceCR" or "Description$Credit$BalanceCR"
// Amounts prefixed with $, balance suffixed with CR. Debit/Credit separated by $$

// ====================================================================
// AUSTRALIAN BANK DETECTION & PARSER
// Handles CommBank, ANZ, NAB — all use "DD Mon" dates + $ amounts
// ====================================================================

function isAustralianFormat(text: string): boolean {
  if (/\b(CommBank|Commonwealth|NetBank)\b/i.test(text) && /\$[\d,]+\.\d{2}CR/i.test(text)) return true;
  if (/\bANZ\b/.test(text) && /\bblank\b/.test(text)) return true;
  if (/\bNational\s*Australia\s*Bank\b/i.test(text) || /\bNAB\b/.test(text)) return true;
  if (/\b(Bendigo|Adelaide\s*Bank)\b/i.test(text)) return true;
  if (/\$\s*[\d,]+\.\d{2}\s*(?:CR|DR)/i.test(text) && /\b(AUS|VIC|NSW|QLD)\b/.test(text)) return true;
  return false;
}

function parseAustralian(text: string): Transaction[] {
  // --- Detect which bank ---
  const isCommBank = /\b(CommBank|Commonwealth|NetBank)\b/i.test(text);
  const isANZ = /\bANZ\b/.test(text) && /\bblank\b/.test(text);
  const isNAB = /\bNational\s*Australia\s*Bank\b/i.test(text) || (/\bNAB\b/.test(text) && /Cr\s*$/.test(text));
  const isBendigo = /\b(Bendigo|Adelaide\s*Bank)\b/i.test(text);

  // --- NAB preprocessing: insert spaces in spaceless text ---
  if (isNAB) {
    // Fix date-glued lines: "1Sep2025SumSokheng" → "1 Sep 2025 SumSokheng"
    const nabDateRe = new RegExp(`(\\d{1,2})(${MONTHS})(\\d{4})`, "gi");
    text = text.replace(nabDateRe, "$1 $2 $3 ");
    // Fix amount-glued: "...500.00\n" is usually fine, but "amount Cr" needs space
    text = text.replace(/([\d,]+\.\d{2})(Cr|Dr)/gi, "$1 $2");
    // Remove dot separators: "SumSokheng..........500.00" → "SumSokheng 500.00"
    text = text.replace(/\.{3,}/g, " ");
  }

  const lines = text.split("\n");

  // --- Extract statement year ---
  let statementYear = new Date().getFullYear();
  for (const line of lines) {
    // "Period18 Oct 2024 - 17 Jan 2025" or "28 NOVEMBER 2025 TO 31 DECEMBER 2025"
    const ym = line.match(/(\d{4})\s*(?:to|-)\s*\d/i);
    if (ym) { statementYear = parseInt(ym[1]); break; }
    const ym2 = line.match(/(?:period|starts?|ends?)\s*.*?(\d{4})/i);
    if (ym2) { statementYear = parseInt(ym2[1]); break; }
  }

  const txnDateRe = new RegExp(`^(\\d{1,2})\\s+(${MONTHS})`, "i");

  // --- Filter noise ---
  const filtered = lines.filter(l => {
    const t = l.trim();
    if (!t) return false;
    if (/^statement\s+\d+|^\(page\s+\d+/i.test(t)) return false;
    if (/^account\s*(number|details|descriptor)/i.test(t)) return false;
    if (/^(date|transaction\s*details?)\s*$/i.test(t)) return false;
    if (/^transactiondebitcreditbalance$/i.test(t.replace(/\s+/g, ""))) return false;
    if (/^13\d{3}\.\d+.*ZZ/i.test(t)) return false;
    if (/^(SL\.R3|V\d{2}\.\d{2})/i.test(t)) return false;
    if (/^06\s+\d{4}\s+\d+/.test(t)) return false;
    if (/^(name|note):/i.test(t)) return false;
    if (/smart\s*access|enjoy\s+the\s+convenience/i.test(t)) return false;
    if (/checked\s+your\s+statement|logging\s+on\s+to/i.test(t)) return false;
    if (/cheque\s+proceeds|questions\s+on\s+fees/i.test(t)) return false;
    if (/the\s+date\s+of\s+transactions|appears\s+on\s+the/i.test(t)) return false;
    if (/enquiries|need\s+to\s+get\s+in\s+touch/i.test(t) && !/\d+\.\d{2}/.test(t)) return false;
    if (/please\s+retain|taxation\s+purposes/i.test(t)) return false;
    if (/^page\s+\d+\s+of\s+\d+$/i.test(t)) return false;
    if (/^withdrawals\s*\(\$\)|^deposits\s*\(\$\)|^balance\s*\(\$\)/i.test(t)) return false;
    if (/australia\s+and\s+new\s+zealand\s+banking/i.test(t)) return false;
    if (/^\d+\s*$/.test(t)) return false;
    return true;
  });

  // --- Merge continuation lines ---
  const merged: string[] = [];
  for (const line of filtered) {
    const trimmed = line.trim();
    if (txnDateRe.test(trimmed)) {
      merged.push(trimmed);
    } else if (merged.length > 0) {
      merged[merged.length - 1] += " " + trimmed;
    }
  }

  const transactions: Transaction[] = [];

  for (const line of merged) {
    const dateMatch = txnDateRe.exec(line);
    if (!dateMatch) continue;

    const day = dateMatch[1];
    const month = dateMatch[2];
    let rest = line.substring(dateMatch[0].length).trim();

    // Check if year follows
    let year = statementYear.toString();
    const yearMatch = rest.match(/^(\d{4})\s*/);
    if (yearMatch) {
      year = yearMatch[1];
      rest = rest.substring(yearMatch[0].length);
    }

    const dateStr = normalizeDate(day, month, year);

    // Skip balance lines
    if (/opening\s*balance|closing\s*balance|brought\s*forward/i.test(rest)) continue;

    let withdrawal = "";
    let deposit = "";
    let balance = "";
    let cleanDesc = rest;

    if (isBendigo) {
      // Bendigo: "DESC RETAIL PURCHASE DD/MM CARD NUMBER xxx AMOUNT BALANCE"
      // or "DESC RETAIL PURCHASE RETURN DD/MM CARD NUMBER xxx AMOUNT BALANCE"
      // Amounts are concatenated: "16.136,017.88" = 16.13 + 6,017.88
      const isReturn = /RETAIL PURCHASE RETURN|REFUND|CREDIT/i.test(rest);
      const isPayment = /PAYMENT\s*-?\s*THANK/i.test(rest) || /^PAYMENT\b/i.test(rest);

      // Extract amounts from the full line (extractAmounts handles concatenation)
      const amounts = extractAmounts(rest);
      if (amounts.length >= 2) {
        const txnAmt = amounts[amounts.length - 2];
        const bal = amounts[amounts.length - 1];
        balance = bal.toFixed(2);
        if (isReturn || isPayment) {
          deposit = txnAmt.toFixed(2);
        } else {
          withdrawal = txnAmt.toFixed(2);
        }
      } else if (amounts.length === 1) {
        if (isReturn || isPayment) deposit = amounts[0].toFixed(2);
        else withdrawal = amounts[0].toFixed(2);
      }

      // Clean description: remove amounts, card info, purchase type
      cleanDesc = rest
        .replace(/[\d,]+\.\d{2}/g, "")
        .replace(/RETAIL PURCHASE\s*(RETURN)?/gi, "")
        .replace(/CARD NUMBER\s*\d+[X\*]+\d*/gi, "")
        .replace(/\d{2}\/\d{2}/g, "")  // effective date DD/MM
        .replace(/AUS\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();

    } else if (isCommBank) {
      // CommBank: "desc amount$$balanceCR" or "desc$credit$balanceCR"
      const balMatch = rest.match(/\$([\d,]+\.\d{2})(?:CR|DR)\s*$/i);
      if (balMatch) {
        balance = parseFloat(balMatch[1].replace(/,/g, "")).toFixed(2);
        cleanDesc = rest.substring(0, rest.lastIndexOf(balMatch[0]));
      }
      const debitMatch = cleanDesc.match(/([\d,]+\.\d{2})\$\$\s*$/);
      if (debitMatch) {
        withdrawal = parseFloat(debitMatch[1].replace(/,/g, "")).toFixed(2);
        cleanDesc = cleanDesc.substring(0, cleanDesc.lastIndexOf(debitMatch[0]));
      } else {
        const creditMatch = cleanDesc.match(/\$([\d,]+\.\d{2})\$\s*$/);
        if (creditMatch) {
          deposit = parseFloat(creditMatch[1].replace(/,/g, "")).toFixed(2);
          cleanDesc = cleanDesc.substring(0, cleanDesc.lastIndexOf(creditMatch[0]));
        } else {
          const singleMatch = cleanDesc.match(/([\d,]+\.\d{2})\$?\s*$/);
          if (singleMatch) {
            const before = cleanDesc.substring(0, cleanDesc.lastIndexOf(singleMatch[0]));
            if (before.endsWith("$")) {
              deposit = parseFloat(singleMatch[1].replace(/,/g, "")).toFixed(2);
              cleanDesc = before.slice(0, -1);
            } else {
              withdrawal = parseFloat(singleMatch[1].replace(/,/g, "")).toFixed(2);
              cleanDesc = before;
            }
          }
        }
      }
    } else if (isANZ) {
      // ANZ: "desc AMOUNT blank BALANCE" or "desc blank AMOUNT BALANCE"
      // "blank" is literal text meaning the column is empty
      // Pattern: withdrawal blank balance OR blank deposit balance
      const anzMatch = rest.match(/([\d,]+\.\d{2})\s+blank\s+([\d,]+\.\d{2})\s*$/);
      if (anzMatch) {
        withdrawal = parseFloat(anzMatch[1].replace(/,/g, "")).toFixed(2);
        balance = parseFloat(anzMatch[2].replace(/,/g, "")).toFixed(2);
        cleanDesc = rest.substring(0, rest.indexOf(anzMatch[0]));
      } else {
        const anzCrMatch = rest.match(/blank\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/);
        if (anzCrMatch) {
          deposit = parseFloat(anzCrMatch[1].replace(/,/g, "")).toFixed(2);
          balance = parseFloat(anzCrMatch[2].replace(/,/g, "")).toFixed(2);
          cleanDesc = rest.substring(0, rest.indexOf(anzCrMatch[0]));
        } else {
          // Just amounts at the end
          const amounts = extractAmounts(rest);
          if (amounts.length >= 2) {
            balance = amounts[amounts.length - 1].toFixed(2);
            withdrawal = amounts[amounts.length - 2].toFixed(2);
            cleanDesc = rest.replace(/[\d,]+\.\d{2}/g, "").trim();
          }
        }
      }
    } else {
      // NAB or generic Australian
      // NAB format after preprocessing: "1 Sep 2025 SumSokheng 500.00" or "1 Sep 2025 Broughtforward 61,050.02 Cr"
      // Balance has Cr/Dr suffix, amounts are plain numbers

      // Check for Cr/Dr balance at end
      const crMatch = rest.match(/([\d,]+\.\d{2})\s*(?:Cr|CR|Dr|DR)\s*$/i);
      if (crMatch) {
        balance = parseFloat(crMatch[1].replace(/,/g, "")).toFixed(2);
        cleanDesc = rest.substring(0, rest.lastIndexOf(crMatch[0])).trim();
      }

      // NAB has columns: Debits | Credits | Balance
      // After removing balance (with Cr), remaining amounts are debit or credit
      const amounts = extractAmounts(cleanDesc);
      if (amounts.length >= 2) {
        // Two amounts: first is debit, second is credit (one might be from description)
        withdrawal = amounts[amounts.length - 1].toFixed(2);
        cleanDesc = cleanDesc.replace(/[\d,]+\.\d{2}/g, "").trim();
      } else if (amounts.length === 1) {
        const amt = amounts[0];
        const amtStr = cleanDesc.match(/[\d,]+\.\d{2}/g);
        if (amtStr) {
          const lastAmt = amtStr[amtStr.length - 1];
          const idx = cleanDesc.lastIndexOf(lastAmt);
          const beforeAmt = cleanDesc.substring(0, idx).trim();
          // Check if it's a deposit (credit keywords or "Cr" context)
          if (/\bcredit|salary|deposit|refund|payment\s+received|direct\s+credit\b/i.test(beforeAmt)) {
            deposit = amt.toFixed(2);
          } else {
            // Use balance to determine direction if available
            withdrawal = amt.toFixed(2);
          }
          cleanDesc = beforeAmt;
        }
      }
    }

    // Clean description
    cleanDesc = cleanDesc
      .replace(/\$+/g, " ")
      .replace(/Card\s+xx\d+/gi, "")
      .replace(/Value\s+Date:\s*\d{1,2}\/\d{1,2}\/\d{4}/gi, "")
      .replace(/EFFECTIVE\s+DATE\s+\d{1,2}\s+\w+\s+\d{4}/gi, "")
      .replace(/\bblank\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (dateStr && (withdrawal || deposit || cleanDesc)) {
      transactions.push({ date: dateStr, description: cleanDesc || "N/A", withdrawal, deposit, balance });
    }
  }

  return transactions;
}

// ====================================================================
// MAIN PARSER
// ====================================================================

function parseTransactions(text: string): Transaction[] {
  // Try Australian bank format first
  if (isAustralianFormat(text)) {
    console.log("[Parser] Detected Australian bank format");
    return parseAustralian(text);
  }

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
