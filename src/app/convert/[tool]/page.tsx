"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, AlertCircle, CheckCircle2, Download, Loader2,
  RefreshCw, Upload, Shield, FileText, Lock, GitMerge
} from "lucide-react";
import { getToolById } from "@/lib/tools";
import { useConvert } from "@/hooks/useConvert";
import { FileDropzone } from "@/components/FileDropzone";
import type { ConversionType } from "@/lib/types";
import { formatFileSize } from "@/lib/helpers";

const HEADLINES: Record<string, { title: string; sub: string }> = {
  "image-to-pdf": { title: "Image to PDF Converter", sub: "Convert images into professional PDF documents" },
  "pdf-to-image": { title: "PDF to Image Converter", sub: "Extract high-quality images from PDF pages" },
  "merge-pdf": { title: "Merge PDF Files", sub: "Combine multiple PDFs into one document" },
  "split-pdf": { title: "Split PDF Pages", sub: "Extract specific pages into separate files" },
  "pdf-to-csv": { title: "PDF to CSV Converter", sub: "Convert PDF tables into CSV instantly" },
  "bank-statement-to-csv": { title: "PDF to CSV Converter", sub: "Convert PDF tables into CSV instantly" },
};

export default function ConvertPage() {
  const params = useParams();
  const toolId = params.tool as string;
  const tool = getToolById(toolId);
  const { state, files, progress, result, error, addFiles, removeFile, convert, reset } =
    useConvert(toolId as ConversionType);
  const [pageRange, setPageRange] = useState("");

  if (!tool) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Tool not found</p>
      </div>
    );
  }

  const acceptMap: Record<string, string[]> = {};
  tool.acceptedTypes.forEach((mime) => { acceptMap[mime] = []; });

  const headline = HEADLINES[toolId] || { title: tool.title, sub: tool.description };

  const handleConvert = () => {
    const options: Record<string, string> = {};
    if (toolId === "split-pdf" && pageRange) options.pages = pageRange;
    convert(options);
  };

  return (
    <div className="bg-white min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto px-5 py-12">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to tools
        </Link>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{headline.title}</h1>
          <p className="text-gray-500 mt-2">{headline.sub}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left - Upload */}
          <div className="lg:col-span-2 space-y-5">
            <FileDropzone
              files={files}
              onFilesSelected={addFiles}
              onRemoveFile={removeFile}
              accept={acceptMap}
              multiple={tool.multiFile}
            />

            {/* Badges */}
            {files.length === 0 && (
              <div className="flex items-center justify-center gap-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                  <Shield className="w-3 h-3" /> MAX 15MB
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                  <Lock className="w-3 h-3" /> SECURE SSL
                </span>
              </div>
            )}

            {/* Split PDF page range */}
            {toolId === "split-pdf" && files.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Page Range</label>
                <input
                  type="text"
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. 1-3, 5, 7-9"
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                />
              </div>
            )}

            {/* Progress Bar */}
            {state === "uploading" && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span className="text-sm font-medium text-gray-700">Processing your file...</span>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3">
              {(state === "selected" || state === "error") && (
                <>
                  <button
                    onClick={handleConvert}
                    disabled={files.length === 0}
                    className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                  >
                    Convert PDF
                  </button>
                  <button
                    onClick={reset}
                    className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-full hover:bg-gray-200 transition-colors"
                  >
                    Clear Files
                  </button>
                </>
              )}
              {state === "uploading" && (
                <button disabled className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-full opacity-70 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Converting...
                </button>
              )}
              {state === "done" && (
                <button
                  onClick={reset}
                  className="px-8 py-3 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Convert Another
                </button>
              )}
            </div>

            {/* Error */}
            {state === "error" && error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-5">
            {/* Result Card */}
            {state === "done" && result && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-semibold text-green-700">Conversion Ready</span>
                </div>
                <div className="bg-white rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{result.fileName}</p>
                      <p className="text-xs text-gray-400">CSV Format</p>
                    </div>
                  </div>
                </div>
                <a
                  href={result.convertedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download CSV
                </a>
              </div>
            )}

            {/* Batch Tools */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-4">Batch Tools</p>
              <div className="space-y-3">
                <Link href="/convert/merge-pdf" className="flex items-center gap-3 group">
                  <GitMerge className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">Merge multiple PDFs</span>
                </Link>
                <Link href="/convert/split-pdf" className="flex items-center gap-3 group">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">Password removal</span>
                </Link>
              </div>
            </div>

            {/* Info when idle */}
            {state === "idle" && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">How it works</h3>
                <ol className="space-y-2.5 text-sm text-gray-500">
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    Upload your PDF file
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    Click Convert to process
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                    Download your result
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
