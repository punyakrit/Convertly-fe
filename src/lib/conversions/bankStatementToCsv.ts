import { Parser } from "json2csv";
import { generateOutputName } from "../helpers";

// pdfreader gives x/y coordinates for every text element in a PDF.
// We use these positions to detect table columns automatically —
// no bank-specific parsing needed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PdfReader } = require("pdfreader");

// Fallback: pdf-parse for PDFs that pdfreader can't handle
async function parsePdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  const data = await pdfParse(buffer);
  return data.text;
}

// ====================================================================
// TYPES
// ====================================================================

interface PdfItem {
  x: number;
  y: number;
  w: number;
  text: string;
  page: number;
}

interface Row {
  y: number;
  page: number;
  items: PdfItem[];
}

interface ColumnPositions {
  date: number;
  description: number;
  debit?: number;
  credit?: number;
  balance?: number;
}

interface Transaction {
  date: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
}

// ====================================================================
// PDF EXTRACTION — get every text element with x/y/page
// ====================================================================

function extractPdfItems(buffer: Buffer): Promise<PdfItem[]> {
  return new Promise((resolve, reject) => {
    const items: PdfItem[] = [];
    let currentPage = 0;

    new PdfReader().parseBuffer(buffer, (err: Error | null, item: { page?: number; x?: number; y?: number; w?: number; text?: string } | null) => {
      if (err) { reject(err); return; }
      if (!item) { resolve(items); return; }
      if (item.page) { currentPage = item.page; return; }
      if (item.text && currentPage > 0) {
        items.push({
          x: item.x ?? 0,
          y: item.y ?? 0,
          w: item.w ?? 0,
          text: item.text,
          page: currentPage,
        });
      }
    });
  });
}

// ====================================================================
// GROUP ITEMS INTO ROWS (same y-position = same row)
// ====================================================================

function groupIntoRows(items: PdfItem[]): Row[] {
  items.sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
  const rows: Row[] = [];
  let currentRow: PdfItem[] = [];
  let currentY = -1;
  let currentPage = -1;

  for (const item of items) {
    if (currentPage === item.page && Math.abs(item.y - currentY) < 0.3) {
      currentRow.push(item);
    } else {
      if (currentRow.length > 0) rows.push({ y: currentY, page: currentPage, items: currentRow });
      currentRow = [item];
      currentY = item.y;
      currentPage = item.page;
    }
  }
  if (currentRow.length > 0) rows.push({ y: currentY, page: currentPage, items: currentRow });
  return rows;
}

// ====================================================================
// FIND TABLE HEADERS — detect column positions automatically
// ====================================================================

const HEADER_PATTERNS: Record<string, RegExp> = {
  date: /^date$/i,
  description: /^(transaction|description|details|particulars|narration)$/i,
  debit: /^(debit|withdrawal|dr|withdrawals?)$/i,
  credit: /^(credit|deposit|cr|deposits?)$/i,
  balance: /^(balance|closing)$/i,
};

// Some headers span two rows (e.g. "Transaction" on one line, "Date" below it)
const AMOUNT_HEADER = /^(amount|\$)$/i;

function findHeaders(rows: Row[]): { headerRowIndex: number; columns: ColumnPositions } | null {
  for (let i = 0; i < Math.min(rows.length, 60); i++) {
    const row = rows[i];
    const joined = row.items.map(it => it.text.trim()).join(" ");

    if (!/date/i.test(joined)) continue;
    if (!/debit|credit|balance|withdrawal|deposit|amount/i.test(joined)) continue;

    const cols: Partial<ColumnPositions> = {};
    for (const it of row.items) {
      const t = it.text.trim();
      for (const [colName, re] of Object.entries(HEADER_PATTERNS)) {
        if (re.test(t)) {
          (cols as Record<string, number>)[colName] = it.x;
        }
      }
      if (AMOUNT_HEADER.test(t) && !cols.debit) {
        cols.debit = it.x;
      }
    }

    if (cols.date !== undefined && (cols.debit !== undefined || cols.credit !== undefined || cols.balance !== undefined)) {
      // If no description column found, infer it as just right of date
      if (cols.description === undefined) {
        cols.description = (cols.date ?? 0) + 2;
      }
      return { headerRowIndex: i, columns: cols as ColumnPositions };
    }
  }
  return null;
}

// ====================================================================
// ASSIGN TEXT ITEMS TO COLUMNS BY X-POSITION
// ====================================================================

function assignToColumn(x: number, columns: ColumnPositions): string | null {
  let bestCol: string | null = null;
  let bestDist = Infinity;
  for (const [col, colX] of Object.entries(columns)) {
    if (colX === undefined) continue;
    const dist = Math.abs(x - (colX as number));
    if (dist < bestDist) { bestDist = dist; bestCol = col; }
  }
  // Items far to the left of the date column are reference numbers — skip them
  if (bestCol === "date" && x < (columns.date - 1.5)) return null;
  return bestCol;
}

// ====================================================================
// DATE DETECTION
// ====================================================================

const MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
const MONTH_NUM: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

const DATE_RE_MONTH = new RegExp(`^(\\d{1,2})\\s+(${MONTHS})`, "i");
const DATE_RE_NUM = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;

function looksLikeDate(text: string): boolean {
  const t = text.trim();
  return DATE_RE_MONTH.test(t) || DATE_RE_NUM.test(t);
}

function normalizeDate(dateText: string, year: string): string {
  const t = dateText.trim();

  const monthMatch = t.match(new RegExp(`(\\d{1,2})\\s+(${MONTHS})(?:\\s*(\\d{2,4}))?`, "i"));
  if (monthMatch) {
    const dd = monthMatch[1].padStart(2, "0");
    const mm = MONTH_NUM[monthMatch[2].substring(0, 3).toLowerCase()] || "01";
    let yy = monthMatch[3] || year;
    if (yy.length === 2) yy = parseInt(yy) > 50 ? "19" + yy : "20" + yy;
    return `${dd}/${mm}/${yy}`;
  }

  const numMatch = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (numMatch) {
    const dd = numMatch[1].padStart(2, "0");
    const mm = numMatch[2].padStart(2, "0");
    let yy = numMatch[3];
    if (yy.length === 2) yy = parseInt(yy) > 50 ? "19" + yy : "20" + yy;
    return `${dd}/${mm}/${yy}`;
  }

  return t;
}

// ====================================================================
// EXTRACT STATEMENT YEAR FROM HEADER/PERIOD TEXT
// ====================================================================

function extractYear(items: PdfItem[]): { year: string; startMonth: number; endYear: string } {
  const allText = items.map(it => it.text).join(" ");
  const now = new Date();
  let year = now.getFullYear().toString();
  let endYear = year;
  let startMonth = 1;

  // "18 Oct 2024 - 17 Jan 2025" or "Period 01/10/2024 to 31/12/2024"
  const periodRe = new RegExp(
    `(\\d{1,2})\\s*(${MONTHS})\\w*\\s*(\\d{4})\\s*(?:to|-|–)\\s*(\\d{1,2})\\s*(${MONTHS})\\w*\\s*(\\d{4})`,
    "i"
  );
  const pm = allText.match(periodRe);
  if (pm) {
    year = pm[3];
    endYear = pm[6];
    const sm = MONTH_NUM[pm[2].substring(0, 3).toLowerCase()];
    if (sm) startMonth = parseInt(sm);
    return { year, startMonth, endYear };
  }

  // "Statement starts 30 August 2025"
  const startsRe = /(?:starts?|from|period)\s*.*?(\d{4})/i;
  const sm = allText.match(startsRe);
  if (sm) {
    year = sm[1];
    endYear = year;
  }

  // "Statement ends 30 September 2025"
  const endsRe = /(?:ends?|to)\s*.*?(\d{4})/i;
  const em = allText.match(endsRe);
  if (em) endYear = em[1];

  return { year, startMonth, endYear };
}

// ====================================================================
// CATEGORIZE TRANSACTIONS
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
  if (/\beftpos\b/i.test(d)) return "Card";
  return "Other";
}

// ====================================================================
// NOISE FILTERS — skip non-transaction rows
// ====================================================================

function isNoiseLine(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^(page\s+\d|statement\s+\d|\(page\s+\d)/i.test(t)) return true;
  if (/^account\s*(number|details)/i.test(t)) return true;
  if (/opening\s*balance|closing\s*balance/i.test(t)) return true;
  if (/transaction\s*(totals|summary)/i.test(t)) return true;
  if (/credit\s*limit|available\s*credit|minimum\s*payment|payment\s*due/i.test(t)) return true;
  if (/please\s+retain|taxation\s+purposes|enquir/i.test(t)) return true;
  if (/enjoy\s+the\s+convenience|checked\s+your\s+statement/i.test(t)) return true;
  return false;
}

// ====================================================================
// EXTRACT AMOUNT FROM COLUMN TEXT
// ====================================================================

function extractAmount(texts: string[]): string {
  const joined = texts.join(" ").replace(/[$,\s]/g, "");
  // Remove "CR", "DR" suffixes
  const cleaned = joined.replace(/CR|DR/gi, "").trim();
  const match = cleaned.match(/(\d+\.?\d*)/);
  if (match) {
    const num = parseFloat(match[1]);
    if (num > 0 && num < 100000) return num.toFixed(2);
  }
  return "";
}

function extractBalance(texts: string[]): string {
  const joined = texts.join(" ");
  const match = joined.match(/\$?([\d,]+\.\d{2})/);
  if (match) return match[1].replace(/,/g, "");
  return "";
}

// ====================================================================
// MAIN PARSER — generic position-based table extraction
// ====================================================================

function parseTransactions(items: PdfItem[]): Transaction[] {
  const rows = groupIntoRows(items);

  // Find the header row
  const headerInfo = findHeaders(rows);
  if (!headerInfo) {
    console.log("[Parser] Could not find table headers in PDF");
    return [];
  }

  const columns = headerInfo.columns;
  console.log("[Parser] Detected columns:", JSON.stringify(columns));

  // Extract year from all text
  const { year, startMonth, endYear } = extractYear(items);
  console.log("[Parser] Statement year:", year, "end year:", endYear);

  // Collect data rows from all pages (skip header rows, stop at closing balance)
  const dataRows: Row[] = [];
  let inData = false;

  for (const row of rows) {
    const joined = row.items.map(it => it.text.trim()).join(" ");

    // Stop at closing balance — but only after we've collected some data
    if (inData && dataRows.length > 10 && /closing\s*balance/i.test(joined) && !/opening/i.test(joined)) {
      break;
    }

    // Detect header rows (repeated on each page)
    if (/\bdate\b/i.test(joined) && /\bdebit|credit|balance|withdrawal|deposit\b/i.test(joined)) {
      inData = true;
      continue;
    }

    if (!inData) continue;

    // Skip noise
    if (isNoiseLine(joined)) continue;

    dataRows.push(row);
  }

  // Build transactions
  const transactions: Transaction[] = [];
  let current: Transaction | null = null;

  for (const row of dataRows) {
    // Assign each item to a column
    const colData: Record<string, string[]> = {};
    for (const it of row.items) {
      const col = assignToColumn(it.x, columns);
      if (!col) continue; // skip items that don't belong to any column
      if (!colData[col]) colData[col] = [];
      colData[col].push(it.text.trim());
    }

    // Check individual items in the date column for a date
    const dateItems = colData.date || [];
    let foundDate = "";
    for (const dt of dateItems) {
      if (looksLikeDate(dt)) { foundDate = dt; break; }
    }

    const descText = (colData.description || []).join(" ").trim();

    // Skip rows that look like footer/noise content
    const allText = row.items.map(it => it.text).join(" ");
    if (/terms\s+and\s+conditions|info@|\.com\.au|authorised\s+person/i.test(allText)) continue;
    if (/online\s*:|logging\s+on|contact\s+us/i.test(allText)) continue;
    // Detect spaced-out character rows (PDF footer styling: "u s o n l i n e")
    const singleCharItems = row.items.filter(it => it.text.trim().length === 1);
    if (singleCharItems.length > row.items.length * 0.5 && row.items.length > 5) continue;
    // Skip summary rows
    if (/opening\s*balance.*transaction\s*type|01\s+oct\s+to\s+31/i.test(allText)) continue;

    // Does this row start a new transaction?
    if (foundDate) {
      if (current) transactions.push(current);

      // Determine year for this date
      let txnYear = year;
      if (endYear !== year) {
        const monthMatch = foundDate.match(new RegExp(`\\d{1,2}\\s+(${MONTHS})`, "i"));
        if (monthMatch) {
          const txnMonth = parseInt(MONTH_NUM[monthMatch[1].substring(0, 3).toLowerCase()] || "0");
          if (txnMonth > 0 && txnMonth < startMonth) txnYear = endYear;
        }
      }

      current = {
        date: normalizeDate(foundDate, txnYear),
        description: descText,
        debit: "",
        credit: "",
        balance: "",
      };
    } else if (current && descText) {
      // Continuation line — only append if it looks like transaction content
      if (!/document\s+the|guideline\s+only|reasonable\s+measures|authorised\s+person|contact\s+the\s+merchant/i.test(descText)) {
        current.description += " " + descText;
      }
    }

    if (!current) continue;

    // Extract amounts (take the last non-empty value for each column)
    const debit = extractAmount(colData.debit || []);
    const credit = extractAmount(colData.credit || []);
    const balance = extractBalance(colData.balance || []);

    if (debit) current.debit = debit;
    if (credit) current.credit = credit;
    if (balance) current.balance = balance;
  }
  if (current) transactions.push(current);

  // Filter: must have at least a debit or credit amount
  return transactions.filter(t => t.debit || t.credit);
}

// ====================================================================
// TEXT-BASED FALLBACK — for PDFs that pdfreader can't parse
// ====================================================================

function parseFromText(text: string): Transaction[] {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);

  // Detect format: NAB credit card (spaceless DD/MM/YYDD/MM/YY lines)
  const nabCcLines = lines.filter(l => /^\d{2}\/\d{2}\/\d{2}\d{2}\/\d{2}\/\d{2}/.test(l));
  if (nabCcLines.length > 5) {
    return parseNABCreditCardText(lines);
  }

  // Detect format: NAB business account (spaceless DDMonYYYY + dot separators)
  const nabDateRe = new RegExp(`^\\d{1,2}(${MONTHS})\\d{4}`, "i");
  const nabDateLines = lines.filter(l => nabDateRe.test(l));
  if (nabDateLines.length > 3 && /\.{3,}/.test(text)) {
    return parseNABBusinessText(lines);
  }

  // Detect format: Bendigo credit card ("DD Mon YY" + amount+balance concatenated)
  const bendigoDateRe = new RegExp(`^\\d{1,2}\\s+(${MONTHS})\\s+\\d{2}\\S`, "i");
  const bendigoLines = lines.filter(l => bendigoDateRe.test(l));
  if (bendigoLines.length > 3 && /Bendigo|Platinum\s*Rewards/i.test(text)) {
    return parseBendigoCreditCardText(lines, text);
  }

  // Generic text-based: look for lines with dates and amounts
  return parseGenericText(lines, text);
}

// --- NAB Credit Card (spaceless) ---
function parseNABCreditCardText(lines: string[]): Transaction[] {
  // Extract statement period for year: "09Dec25-07Jan26"
  let stmtYear = 2025;
  let endYear = 2026;
  for (const line of lines.slice(0, 30)) {
    const pm = line.match(/(\d{2})\w{3}(\d{2})\s*-\s*\d{2}\w{3}(\d{2})/);
    if (pm) {
      stmtYear = parseInt(pm[2]) > 50 ? 1900 + parseInt(pm[2]) : 2000 + parseInt(pm[2]);
      endYear = parseInt(pm[3]) > 50 ? 1900 + parseInt(pm[3]) : 2000 + parseInt(pm[3]);
      break;
    }
  }

  // Collect transaction blobs: lines starting with DD/MM/YYDD/MM/YY
  // Some credit transactions span 3 lines: date-pair, card-no, description+amount
  const txnLineRe = /^(\d{2}\/\d{2}\/\d{2})(\d{2}\/\d{2}\/\d{2})(.*)$/;
  const cardNoRe = /^[VM]\d{4}$/;

  // Merge multi-line entries
  const merged: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = txnLineRe.exec(lines[i]);
    if (!m) continue;
    let full = lines[i];
    // If only dates (no card/desc), merge next lines
    if (m[3].trim() === "" || cardNoRe.test(m[3].trim())) {
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        if (txnLineRe.test(lines[j])) break;
        full += lines[j];
      }
    }
    merged.push(full);
  }

  // Build a set of known PayPal-like reference numbers (appear many times)
  const refCounts = new Map<string, number>();
  const allDigitBlobs = merged.map(line => {
    const m = txnLineRe.exec(line);
    if (!m) return "";
    const rest = m[3].replace(/^[VM]\d{4}/, "");
    // Get the digit blob at the end (after last letter)
    const lastLetterIdx = rest.search(/[a-zA-Z][^a-zA-Z]*$/);
    if (lastLetterIdx < 0) return "";
    return rest.substring(lastLetterIdx + 1).replace(/[.,\s]/g, "");
  });

  for (const blob of allDigitBlobs) {
    if (blob.length < 10) continue;
    for (let len = 10; len <= 11; len++) {
      if (blob.length >= len) {
        const ref = blob.substring(0, len);
        refCounts.set(ref, (refCounts.get(ref) || 0) + 1);
      }
    }
  }
  const knownRefs = Array.from(refCounts.entries())
    .filter(([, count]) => count >= 3)
    // Sort by length DESC (longer refs first to avoid partial matches)
    .sort((a, b) => b[0].length - a[0].length || b[1] - a[1])
    .map(([ref]) => ref);

  // Parse each merged transaction
  const transactions: Transaction[] = [];
  for (const line of merged) {
    const m = txnLineRe.exec(line);
    if (!m) continue;

    const txnDateRaw = m[1]; // DD/MM/YY
    const rest = m[3];
    if (!rest || rest.trim().length < 3) continue;

    // Parse date
    const [dd, mm, yy] = txnDateRaw.split("/");
    const yyNum = parseInt(yy);
    const fullYear = yyNum > 50 ? 1900 + yyNum : 2000 + yyNum;
    const date = `${dd}/${mm}/${fullYear}`;

    // Strip card number
    let desc = rest.replace(/^[VM]\d{4}/, "");

    // Check for CR suffix (credit)
    const isCredit = /CR$/i.test(desc);
    if (isCredit) desc = desc.replace(/CR$/i, "");

    // Extract amount from end: find the last decimal number
    // Handle PayPal refs glued to amounts
    let amount = 0;
    let amountStr = "";

    // Try known refs first
    let refFound = "";
    for (const ref of knownRefs) {
      const idx = desc.indexOf(ref);
      if (idx >= 0) {
        const afterRef = desc.substring(idx + ref.length);
        const amtMatch = afterRef.match(/^(\d[\d,]*\.\d{2})/);
        if (amtMatch) {
          amount = parseFloat(amtMatch[1].replace(/,/g, ""));
          amountStr = amtMatch[1];
          refFound = ref;
          break;
        }
      }
    }

    if (!refFound) {
      // No ref — amount is the last decimal number
      const amtMatch = desc.match(/([\d,]+\.\d{2})$/);
      if (amtMatch) {
        amount = parseFloat(amtMatch[1].replace(/,/g, ""));
        amountStr = amtMatch[1];
      }
    }

    if (amount <= 0 || amount > 50000) continue;

    // Clean description: remove amount and ref from end
    if (amountStr) {
      const cutIdx = desc.lastIndexOf(amountStr);
      if (cutIdx >= 0) desc = desc.substring(0, cutIdx);
    }
    if (refFound) {
      const refIdx = desc.lastIndexOf(refFound);
      if (refIdx >= 0) desc = desc.substring(0, refIdx);
    }

    // Clean up camelCase
    desc = desc
      .replace(/\*/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")
      .replace(/(\.com)([A-Za-z])/g, "$1 $2")
      .replace(/(\d)([A-Z])/g, "$1 $2")
      .replace(/\be Bay\b/g, "eBay")
      .replace(/\s+/g, " ")
      .trim();

    if (!desc) desc = "Transaction";

    transactions.push({
      date,
      description: desc,
      debit: isCredit ? "" : amount.toFixed(2),
      credit: isCredit ? amount.toFixed(2) : "",
      balance: "",
    });
  }

  return transactions;
}

// --- Bendigo Credit Card ---
// Format: 4-line transactions:
//   "7 Sep 257-ELEVEN 1381, TARNE ITAUS"  (date + merchant)
//   "RETAIL PURCHASE05/09"                 (type)
//   "CARD NUMBER 518840XXXXXXX0141"        (card)
//   "1.505,865.65"                          (amount.XX + balance.XX concatenated)
function parseBendigoCreditCardText(lines: string[], fullText: string): Transaction[] {
  const transactions: Transaction[] = [];
  const dateRe = new RegExp(`^(\\d{1,2})\\s+(${MONTHS})\\s+(\\d{2})(.+)$`, "i");

  // Extract opening balance
  let prevBal = 0;
  const openMatch = fullText.match(/Opening\s*balance\s*\$?([\d,]+\.\d{2})/i);
  if (openMatch) prevBal = parseFloat(openMatch[1].replace(/,/g, ""));

  // Extract statement year
  let year = new Date().getFullYear().toString();
  const periodMatch = fullText.match(/Statement\s*period\s*.*?(\d{4})/i);
  if (periodMatch) year = periodMatch[1];

  for (let i = 0; i < lines.length; i++) {
    const dm = dateRe.exec(lines[i]);
    if (!dm) continue;

    // Parse date
    const dd = dm[1].padStart(2, "0");
    const mm = MONTH_NUM[dm[2].substring(0, 3).toLowerCase()] || "01";
    const yy = parseInt(dm[3]) > 50 ? "19" + dm[3] : "20" + dm[3];
    const date = `${dd}/${mm}/${yy}`;
    const merchant = dm[4].trim();

    // Look ahead for amount line (within next 5 lines)
    let amount = 0;
    let balance = 0;
    let txnType = "";

    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      // Transaction type line
      if (/^RETAIL\s*PURCHASE|^CASH\s*ADVANCE|^PAYMENT/i.test(lines[j])) {
        txnType = lines[j].replace(/\d{2}\/\d{2}/, "").trim();
      }
      // Amount+Balance line: "1.505,865.65" (digits only, no letters)
      if (/^[\d,.]+$/.test(lines[j]) && lines[j].includes(".")) {
        const raw = lines[j];
        const dot1 = raw.indexOf(".");
        if (dot1 >= 0 && dot1 + 3 <= raw.length) {
          const amtStr = raw.substring(0, dot1 + 3);
          const balStr = raw.substring(dot1 + 3);
          amount = parseFloat(amtStr.replace(/,/g, ""));
          if (balStr) balance = parseFloat(balStr.replace(/,/g, ""));
          break;
        }
      }
      // Stop if we hit another date line
      if (dateRe.test(lines[j])) break;
    }

    if (amount <= 0) continue;

    // Determine debit vs credit by balance change
    // Credit card: balance increase = purchase (debit), decrease = payment/return (credit)
    const isCredit = balance > 0 && balance < prevBal;
    const isReturn = /RETURN/i.test(txnType);

    let desc = merchant
      .replace(/,\s*/g, ", ")
      .replace(/\s+/g, " ")
      .trim();

    if (txnType && !/RETAIL PURCHASE$/i.test(txnType)) {
      desc += " (" + txnType.replace(/\s+/g, " ").trim() + ")";
    }

    transactions.push({
      date,
      description: desc,
      debit: (isCredit || isReturn) ? "" : amount.toFixed(2),
      credit: (isCredit || isReturn) ? amount.toFixed(2) : "",
      balance: balance > 0 ? balance.toFixed(2) : "",
    });

    if (balance > 0) prevBal = balance;
  }

  return transactions;
}

// --- NAB Business Account (spaceless, dot separators) ---
function parseNABBusinessText(lines: string[]): Transaction[] {
  const transactions: Transaction[] = [];
  const fusedDateRe = new RegExp(`^(\\d{1,2})(${MONTHS})(\\d{4})(.*)$`, "i");
  const amountRe = /(?:^|\.{3,})([\d,]+\.\d{2})\s*(Cr)?\s*([\d,]+\.\d{2})?\s*(Cr)?$/i;

  let currentDate = "";

  // Filter out single-char lines (barcode artifacts), page headers, noise
  const cleaned = lines.filter(l => {
    if (l.length <= 2) return false;
    if (/^(Statementnumber|NABBusiness|Forfurther|BusinessServicing|TransactionDetails|DateParticulars)/i.test(l)) return false;
    if (/^(Broughtforward|Carriedforward)/i.test(l)) return false;
    if (/^(AccountBalance|Openingbalance|Totalcredits|Totaldebits|Closingbalance)/i.test(l)) return false;
    if (/Identifyingatransaction|NABVisaDebit|CREDITbutton|Particularscolumn/i.test(l)) return false;
    if (/OutletDetails|AccountDetails|BSBnumber|Accountnumber/i.test(l)) return false;
    if (/followedbythelast|whichyouinitiated|selectthe|usingyour/i.test(l)) return false;
    // Filter long boilerplate paragraphs (>80 chars, no dot separators, no amounts at end)
    if (l.length > 80 && !/\.{3,}/.test(l) && !/[\d,]+\.\d{2}\s*$/.test(l)) return false;
    if (/^\d{13,}/.test(l)) return false; // barcode numbers
    if (/^[(\dÂ?NÚ)/]$/.test(l)) return false;
    return true;
  });

  let pendingDesc = "";

  for (const line of cleaned) {
    // Check for fused date at start: "1Sep2025SumSokheng..."
    const dateMatch = fusedDateRe.exec(line);
    if (dateMatch) {
      const dd = dateMatch[1].padStart(2, "0");
      const mm = MONTH_NUM[dateMatch[2].substring(0, 3).toLowerCase()] || "01";
      const yyyy = dateMatch[3];
      currentDate = `${dd}/${mm}/${yyyy}`;

      const rest = dateMatch[4];
      if (!rest || /^Broughtforward/i.test(rest)) continue;

      // Process the rest of this line as a transaction line
      pendingDesc = processNABLine(rest, currentDate, transactions, pendingDesc);
      continue;
    }

    if (!currentDate) continue;

    // Skip carried forward lines
    if (/Carriedforward/i.test(line)) continue;

    // Non-date line: check if it has an amount
    const result = processNABLine(line, currentDate, transactions, pendingDesc);
    pendingDesc = result;
  }

  return transactions;
}

function cleanNABDesc(desc: string): string {
  return desc
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/\//g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Process a NAB line. Returns pending description for next line. */
function processNABLine(line: string, date: string, transactions: Transaction[], pendingDesc: string): string {
  // Replace dot separators with space
  const cleaned = line.replace(/\.{3,}/g, " ").trim();
  if (!cleaned) return pendingDesc;

  // Extract amount at end: "SumSokheng 500.00" or "Hilux2019 45,000.00Cr47,050.27"
  const amtMatch = cleaned.match(/([\d,]+\.\d{2})\s*(Cr)?\s*([\d,]+\.\d{2})?\s*(Cr)?$/i);

  if (amtMatch) {
    const amount = parseFloat(amtMatch[1].replace(/,/g, ""));
    const isCr = !!amtMatch[2];
    const balanceStr = amtMatch[3] ? amtMatch[3].replace(/,/g, "") : "";

    if (amount <= 0 || amount > 1000000) return "";

    // Description is everything before the amount
    let desc = cleaned.substring(0, cleaned.indexOf(amtMatch[0])).trim();

    // Skip standalone amount lines with no description (summary/total rows)
    if (!desc && !pendingDesc) return "";

    // Prepend pending description (context from previous non-amount line)
    if (pendingDesc) desc = pendingDesc + " " + desc;

    desc = cleanNABDesc(desc);
    if (!desc) desc = "Transaction";

    transactions.push({
      date,
      description: desc,
      debit: isCr ? "" : amount.toFixed(2),
      credit: isCr ? amount.toFixed(2) : "",
      balance: balanceStr,
    });
    return ""; // clear pending
  }

  // No amount — this is a description line for the next transaction
  return (pendingDesc ? pendingDesc + " " : "") + cleanNABDesc(cleaned);
}

// --- Generic text-based parser ---
function parseGenericText(lines: string[], fullText: string): Transaction[] {
  const transactions: Transaction[] = [];

  // Extract year from text
  let year = new Date().getFullYear().toString();
  const yearMatch = fullText.match(/(?:period|statement|from)\s*.*?(\d{4})/i);
  if (yearMatch) year = yearMatch[1];

  const dateMonthRe = new RegExp(`^(\\d{1,2})\\s*(${MONTHS})\\s*(\\d{2,4})?`, "i");
  const dateNumRe = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;

  let current: Transaction | null = null;

  for (const line of lines) {
    // Skip noise
    if (isNoiseLine(line)) continue;
    if (line.length < 5) continue;

    // Check for date
    let dateStr = "";
    let rest = line;

    const mm = dateMonthRe.exec(line);
    if (mm) {
      const txnYear = mm[3] || year;
      dateStr = normalizeDate(mm[0], typeof txnYear === "string" ? txnYear : year);
      rest = line.substring(mm[0].length).trim();
    } else {
      const nm = dateNumRe.exec(line);
      if (nm) {
        dateStr = normalizeDate(nm[0], year);
        rest = line.substring(nm[0].length).trim();
      }
    }

    if (dateStr) {
      if (current) transactions.push(current);
      current = { date: dateStr, description: "", debit: "", credit: "", balance: "" };
    }

    if (!current) continue;

    // Extract amounts from rest
    const amounts = rest.match(/[\d,]+\.\d{2}/g);
    if (amounts) {
      for (const amtStr of amounts) {
        const amt = parseFloat(amtStr.replace(/,/g, ""));
        if (amt <= 0 || amt > 100000) continue;
        // Check context for credit
        const idx = rest.indexOf(amtStr);
        const after = rest.substring(idx + amtStr.length, idx + amtStr.length + 5);
        if (/cr/i.test(after) || /credit|deposit|salary|refund/i.test(rest)) {
          if (!current.credit) current.credit = amt.toFixed(2);
        } else {
          if (!current.debit) current.debit = amt.toFixed(2);
        }
      }
      // Remove amounts from description
      rest = rest.replace(/[\d,]+\.\d{2}/g, "").replace(/\s*(CR|DR)\b/gi, "").replace(/\$/g, "").replace(/\s+/g, " ").trim();
    }

    if (rest && rest.length > 2) {
      current.description += (current.description ? " " : "") + rest;
    }
  }
  if (current) transactions.push(current);

  return transactions.filter(t => t.debit || t.credit);
}

// ====================================================================
// EXPORTED CONVERTER
// ====================================================================

export async function bankStatementToCsv(
  buffer: Buffer,
  originalName: string
): Promise<{ fileName: string; csvBuffer: Buffer; mimeType: string }> {
  const items = await extractPdfItems(buffer);

  console.log(`[Parser] Extracted ${items.length} text items from PDF`);

  let transactions: Transaction[] = [];

  // Check if pdfreader gave usable items (not just single chars with no page info)
  const usableItems = items.length >= 10 &&
    items.some(it => it.page > 0) &&
    items.filter(it => it.text.length > 1).length > items.length * 0.3;

  if (usableItems) {
    // Primary: position-based extraction (works for most PDFs)
    transactions = parseTransactions(items);
  }

  if (transactions.length === 0) {
    // Fallback: text-based extraction (for PDFs that pdfreader can't handle)
    console.log("[Parser] Position-based parsing failed, falling back to text-based");
    const text = await parsePdfText(buffer);
    if (text.trim().length < 50) {
      throw new Error("Could not extract text from this PDF. It may be a scanned image - try a text-based statement.");
    }
    transactions = parseFromText(text);
  }

  console.log(`[Parser] Found ${transactions.length} transactions`);
  if (transactions.length > 0) {
    console.log("[Parser] First:", JSON.stringify(transactions[0]));
    console.log("[Parser] Last:", JSON.stringify(transactions[transactions.length - 1]));
  }

  if (transactions.length === 0) {
    throw new Error("No transactions found. The PDF may not be a recognized bank statement format.");
  }

  // Clean descriptions
  const rows = transactions.map((t) => {
    let desc = t.description
      .replace(/\s+/g, " ")
      .replace(/Card\s+xx\d+/gi, "")
      .replace(/Value\s+Date:\s*\d{1,2}\/\d{1,2}\/\d{4}/gi, "")
      // Remove spaced-out footer text (single chars separated by spaces)
      .replace(/(\s[a-z]\s){5,}/gi, " ")
      .replace(/\$[\d,]+\.\d{2}\s*CR?\s*/gi, " ")
      .replace(/\d{2}\s+\w+\s+to\s+\d{2}\s+\w+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Truncate if unreasonably long (footer bleed)
    if (desc.length > 120) desc = desc.substring(0, 120).trim();
    return {
      Date: t.date,
      Description: desc,
      Category: categorize(t.description),
      Debit: t.debit,
      Credit: t.credit,
      Balance: t.balance,
    };
  });

  const fields = ["Date", "Description", "Category", "Debit", "Credit", "Balance"];
  const parser = new Parser({ fields });
  const csv = parser.parse(rows);

  return {
    fileName: generateOutputName(originalName, "_bank_statement.csv"),
    csvBuffer: Buffer.from(csv, "utf-8"),
    mimeType: "text/csv",
  };
}
