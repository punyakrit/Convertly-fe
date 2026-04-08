import { NextRequest, NextResponse } from "next/server";
import { bankStatementToCsv } from "@/lib/conversions/bankStatementToCsv";
import { pdfToCsv } from "@/lib/conversions/pdfToCsv";
import { mergePdf } from "@/lib/conversions/mergePdf";
import { splitPdf } from "@/lib/conversions/splitPdf";
import { imageToPdf } from "@/lib/conversions/imageToPdf";
import { sanitizeFilename } from "@/lib/helpers";
import type { ConversionType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const type = formData.get("type") as ConversionType;
    const pages = formData.get("pages") as string | null;

    if (!type) {
      return NextResponse.json({ success: false, error: "type is required" }, { status: 400 });
    }

    const files: File[] = [];
    const fileEntries = formData.getAll("files");
    for (const entry of fileEntries) {
      if (entry instanceof File) files.push(entry);
    }
    const singleFile = formData.get("file");
    if (singleFile instanceof File) files.push(singleFile);

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "No files provided" }, { status: 400 });
    }

    const buffers: Buffer[] = [];
    for (const file of files) {
      const arrayBuf = await file.arrayBuffer();
      buffers.push(Buffer.from(arrayBuf));
    }

    let resultFileName: string;
    let resultBuffer: Buffer;
    let resultMimeType: string;
    let outputType: string;

    switch (type) {
      case "bank-statement-to-csv": {
        const r = await bankStatementToCsv(buffers[0], files[0].name);
        resultFileName = r.fileName;
        resultBuffer = r.csvBuffer;
        resultMimeType = r.mimeType;
        outputType = "csv";
        break;
      }
      case "pdf-to-csv": {
        const r = await pdfToCsv(buffers[0], files[0].name);
        resultFileName = r.fileName;
        resultBuffer = r.csvBuffer;
        resultMimeType = r.mimeType;
        outputType = "csv";
        break;
      }
      case "merge-pdf": {
        const r = await mergePdf(buffers);
        resultFileName = r.fileName;
        resultBuffer = r.pdfBuffer;
        resultMimeType = r.mimeType;
        outputType = "pdf";
        break;
      }
      case "split-pdf": {
        if (!pages) {
          return NextResponse.json({ success: false, error: "pages parameter required for split-pdf" }, { status: 400 });
        }
        const r = await splitPdf(buffers[0], pages, files[0].name);
        resultFileName = r.fileName;
        resultBuffer = r.pdfBuffer;
        resultMimeType = r.mimeType;
        outputType = "pdf";
        break;
      }
      case "image-to-pdf": {
        const r = await imageToPdf(buffers, files[0].name);
        resultFileName = r.fileName;
        resultBuffer = r.pdfBuffer;
        resultMimeType = r.mimeType;
        outputType = "pdf";
        break;
      }
      case "pdf-to-image": {
        return NextResponse.json(
          { success: false, error: "PDF to Image conversion requires poppler and is not available in this environment. Use the other tools." },
          { status: 400 }
        );
      }
      default:
        return NextResponse.json({ success: false, error: `Unknown type: ${type}` }, { status: 400 });
    }

    const convId = uuidv4();
    const originalName = sanitizeFilename(files[0].name);
    const originalMimeType = files[0].type || "application/octet-stream";

    return NextResponse.json({
      success: true,
      data: {
        id: convId,
        fileName: resultFileName,
        inputType: type,
        outputType,
        convertedBase64: resultBuffer.toString("base64"),
        originalBase64: buffers[0].toString("base64"),
        convertedMimeType: resultMimeType,
        originalMimeType: originalMimeType,
        originalFileName: originalName,
      },
    });
  } catch (error) {
    console.error("=== CONVERSION ERROR ===");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    console.error("========================");
    const message = error instanceof Error ? error.message : "Conversion failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
