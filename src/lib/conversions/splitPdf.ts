import { PDFDocument } from "pdf-lib";
import { generateOutputName } from "../helpers";

function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const pages = new Set<number>();
  const parts = rangeStr.split(",").map((s) => s.trim());
  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = Math.max(1, parseInt(startStr, 10));
      const end = Math.min(totalPages, parseInt(endStr, 10));
      for (let i = start; i <= end; i++) pages.add(i - 1);
    } else {
      const page = parseInt(part, 10);
      if (page >= 1 && page <= totalPages) pages.add(page - 1);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export async function splitPdf(
  buffer: Buffer,
  pageRange: string,
  originalName: string
): Promise<{ fileName: string; pdfBuffer: Buffer; mimeType: string }> {
  const srcDoc = await PDFDocument.load(buffer);
  const totalPages = srcDoc.getPageCount();
  const pageIndices = parsePageRanges(pageRange, totalPages);

  if (pageIndices.length === 0) {
    throw new Error(`Invalid page range "${pageRange}". Document has ${totalPages} pages.`);
  }

  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(srcDoc, pageIndices);
  pages.forEach((page) => newDoc.addPage(page));

  const pdfBytes = await newDoc.save();
  return {
    fileName: generateOutputName(originalName, ".pdf"),
    pdfBuffer: Buffer.from(pdfBytes),
    mimeType: "application/pdf",
  };
}
