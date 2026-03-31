import { PDFDocument } from "pdf-lib";
import { generateOutputName } from "../helpers";

export async function mergePdf(
  buffers: Buffer[]
): Promise<{ fileName: string; pdfBuffer: Buffer; mimeType: string }> {
  const mergedDoc = await PDFDocument.create();

  for (const buf of buffers) {
    const srcDoc = await PDFDocument.load(buf);
    const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    pages.forEach((page) => mergedDoc.addPage(page));
  }

  const pdfBytes = await mergedDoc.save();
  return {
    fileName: generateOutputName("merged", ".pdf"),
    pdfBuffer: Buffer.from(pdfBytes),
    mimeType: "application/pdf",
  };
}
