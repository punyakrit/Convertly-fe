import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { generateOutputName } from "../helpers";

export async function imageToPdf(
  buffers: Buffer[],
  originalName: string
): Promise<{ fileName: string; pdfBuffer: Buffer; mimeType: string }> {
  const pdfDoc = await PDFDocument.create();

  for (const buf of buffers) {
    const imageBuffer = await sharp(buf).png().toBuffer();
    const metadata = await sharp(buf).metadata();
    const width = metadata.width || 595;
    const height = metadata.height || 842;
    const pngImage = await pdfDoc.embedPng(imageBuffer);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(pngImage, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await pdfDoc.save();
  return {
    fileName: generateOutputName(originalName, ".pdf"),
    pdfBuffer: Buffer.from(pdfBytes),
    mimeType: "application/pdf",
  };
}
