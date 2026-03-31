"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, AlertCircle, CheckCircle2, Download, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { getToolById } from "@/lib/tools";
import { useConvert } from "@/hooks/useConvert";
import { FileDropzone } from "@/components/FileDropzone";
import type { ConversionType } from "@/lib/types";

const TOOL_HEADLINES: Record<string, string> = {
  "image-to-pdf": "Create professional PDF documents.",
  "pdf-to-image": "Extract stunning images from PDFs.",
  "merge-pdf": "Combine your PDFs into one document.",
  "split-pdf": "Split pages with surgical precision.",
  "pdf-to-csv": "Extract structured data from PDFs.",
  "bank-statement-to-csv": "Parse bank statements into clean spreadsheets.",
};

const TOOL_SUBTITLES: Record<string, string> = {
  "image-to-pdf": "Supports high-resolution PNG, JPG, and WebP images",
  "pdf-to-image": "Export each page as a high-quality image",
  "merge-pdf": "Drop multiple PDFs to combine them",
  "split-pdf": "Specify page ranges to extract",
  "pdf-to-csv": "Works with tabular data in any PDF",
  "bank-statement-to-csv": "Auto-detects dates, amounts, debit/credit & balance columns",
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
        <p className="text-slate-400">Tool not found</p>
      </div>
    );
  }

  const acceptMap: Record<string, string[]> = {};
  tool.acceptedTypes.forEach((mime) => {
    acceptMap[mime] = [];
  });

  const handleConvert = () => {
    const options: Record<string, string> = {};
    if (toolId === "split-pdf" && pageRange) options.pages = pageRange;
    convert(options);
  };

  return (
    <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8">
      {/* Header */}
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to tools
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left - Upload & Controls */}
        <div className="lg:col-span-3">
          <div className="mb-6">
            <p className="text-xs font-bold text-blue-600 tracking-widest uppercase mb-2">Workspace</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              {TOOL_HEADLINES[toolId] || tool.title}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {TOOL_SUBTITLES[toolId] || "Upload your file to get started"}
            </p>
          </div>

          {/* File Picker */}
          <FileDropzone
            files={files}
            onFilesSelected={addFiles}
            onRemoveFile={removeFile}
            accept={acceptMap}
            multiple={tool.multiFile}
          />

          {/* Split PDF page range */}
          {toolId === "split-pdf" && files.length > 0 && (
            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Page Range</label>
              <input
                type="text"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. 1-3, 5, 7-9"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
              />
            </div>
          )}

          {/* Action Button */}
          <div className="mt-5">
            {(state === "selected" || state === "error") && (
              <button
                onClick={handleConvert}
                disabled={files.length === 0}
                className="w-full py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
              >
                Convert Now
              </button>
            )}
            {state === "uploading" && (
              <button disabled className="w-full py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-2xl opacity-80 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Converting...
              </button>
            )}
            {state === "done" && (
              <button
                onClick={reset}
                className="w-full py-3.5 bg-slate-900 text-white text-sm font-semibold rounded-2xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Convert Another
              </button>
            )}
          </div>
        </div>

        {/* Right - Progress & Result */}
        <div className="lg:col-span-2">
          {state === "idle" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">How it works</h3>
              <ol className="space-y-3 text-sm text-slate-500">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  Upload your file using drag & drop
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  Click &quot;Convert Now&quot; to process
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  Download your converted file
                </li>
              </ol>
            </div>
          )}

          {/* Progress */}
          {state === "uploading" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <p className="text-sm font-medium text-slate-700">Processing your file...</p>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">{progress}%</p>
            </div>
          )}

          {/* Result */}
          {state === "done" && result && (
            <div className="bg-white border border-green-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="text-sm font-medium text-green-700">Conversion complete!</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-800 truncate">{result.fileName}</p>
                <p className="text-xs text-slate-400 mt-1">Generated just now</p>
              </div>
              <a
                href={result.convertedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full py-3 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
              >
                <Download className="w-4 h-4" /> Download File
              </a>
            </div>
          )}

          {/* Error */}
          {state === "error" && error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
