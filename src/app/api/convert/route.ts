import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { bankStatementToCsv } from "@/lib/conversions/bankStatementToCsv";
import { pdfToCsv } from "@/lib/conversions/pdfToCsv";
import { mergePdf } from "@/lib/conversions/mergePdf";
import { splitPdf } from "@/lib/conversions/splitPdf";
import { imageToPdf } from "@/lib/conversions/imageToPdf";
import { sanitizeFilename } from "@/lib/helpers";
import type { ConversionType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 60;

async function uploadToStorage(
  bucket: string,
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const type = formData.get("type") as ConversionType;
    const userId = formData.get("user_id") as string;
    const pages = formData.get("pages") as string | null;

    if (!type || !userId) {
      return NextResponse.json({ success: false, error: "type and user_id are required" }, { status: 400 });
    }

    // Collect files
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

    // Convert files to buffers
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

    // Upload to Supabase
    const convId = uuidv4();
    const convertedPath = `${convId}/${resultFileName}`;
    const convertedUrl = await uploadToStorage("converted", convertedPath, resultBuffer, resultMimeType);

    const originalName = sanitizeFilename(files[0].name);
    const originalPath = `${convId}/${originalName}`;
    const originalUrl = await uploadToStorage("uploads", originalPath, buffers[0], files[0].type);

    // Save to database
    const supabase = getSupabaseAdmin();
    await supabase.from("conversions").insert({
      id: convId,
      user_id: userId,
      file_name: resultFileName,
      input_type: type,
      output_type: outputType,
      original_url: originalUrl,
      converted_url: convertedUrl,
    });

    return NextResponse.json({
      success: true,
      data: { id: convId, fileName: resultFileName, convertedUrl, originalUrl },
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
