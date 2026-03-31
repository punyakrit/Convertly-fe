// pdf-parse's index.js loads a test PDF on require() which breaks on Vercel.
async function parsePdf(buffer: Buffer): Promise<{ text: string }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  return pdfParse(buffer);
}
import { Parser } from "json2csv";
import { generateOutputName } from "../helpers";

function textToCsv(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error("No text content found in PDF");

  const rows = lines.map((line) => line.split(/\s{2,}|\t/));
  const maxCols = Math.max(...rows.map((r) => r.length));
  const headers = Array.from({ length: maxCols }, (_, i) => `Column_${i + 1}`);

  const data = rows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => { obj[header] = row[i] || ""; });
    return obj;
  });

  const parser = new Parser({ fields: headers });
  return parser.parse(data);
}

export async function pdfToCsv(
  buffer: Buffer,
  originalName: string
): Promise<{ fileName: string; csvBuffer: Buffer; mimeType: string }> {
  const data = await parsePdf(buffer);
  const text = data.text;

  if (text.trim().length < 10) {
    throw new Error("Could not extract text from this PDF. It may be a scanned image.");
  }

  const csv = textToCsv(text);
  return {
    fileName: generateOutputName(originalName, ".csv"),
    csvBuffer: Buffer.from(csv, "utf-8"),
    mimeType: "text/csv",
  };
}
