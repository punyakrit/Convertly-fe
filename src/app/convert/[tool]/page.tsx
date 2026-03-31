"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, AlertCircle, CheckCircle2, Download, Loader2,
  RefreshCw, Shield, FileText, Lock, GitMerge, Trash2
} from "lucide-react";
import { getToolById } from "@/lib/tools";
import { useConvert } from "@/hooks/useConvert";
import { FileDropzone } from "@/components/FileDropzone";
import type { ConversionType } from "@/lib/types";

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
    <div className="bg-white min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-6 sm:py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-5 sm:mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{headline.title}</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1.5 sm:mt-2">{headline.sub}</p>
          <div className="inline-flex items-center gap-1.5 mt-3 text-xs text-emerald-600">
            <Trash2 className="w-3 h-3" />
            <span className="font-medium">Files auto-deleted within 1 hour</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5">
            <FileDropzone
              files={files}
              onFilesSelected={addFiles}
              onRemoveFile={removeFile}
              accept={acceptMap}
              multiple={tool.multiFile}
            />

            {files.length === 0 && (
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-[11px] sm:text-xs font-medium text-gray-600">
                  <Shield className="w-3 h-3" /> MAX 15MB
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-[11px] sm:text-xs font-medium text-gray-600">
                  <Lock className="w-3 h-3" /> SECURE SSL
                </span>
              </div>
            )}

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

            {state === "uploading" && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span className="text-sm font-medium text-gray-700">Processing...</span>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {(state === "selected" || state === "error") && (
                <>
                  <button
                    onClick={handleConvert}
                    disabled={files.length === 0}
                    className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-600/20 text-center"
                  >
                    Convert PDF
                  </button>
                  <button
                    onClick={reset}
                    className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-full hover:bg-gray-200 transition-colors text-center"
                  >
                    Clear Files
                  </button>
                </>
              )}
              {state === "uploading" && (
                <button disabled className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-full opacity-70 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Converting...
                </button>
              )}
              {state === "done" && (
                <button
                  onClick={reset}
                  className="px-8 py-3 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Convert Another
                </button>
              )}
            </div>

            {state === "error" && error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 sm:space-y-5">
            {state === "done" && result && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-semibold text-green-700">Conversion Ready</span>
                </div>
                <div className="bg-white rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
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

            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-4">Batch Tools</p>
              <div className="space-y-3">
                <Link href="/convert/merge-pdf" className="flex items-center gap-3 group">
                  <GitMerge className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">Merge multiple PDFs</span>
                </Link>
                <Link href="/convert/split-pdf" className="flex items-center gap-3 group">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">Split PDF pages</span>
                </Link>
              </div>
            </div>

            {state === "idle" && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">How it works</h3>
                <ol className="space-y-2.5 text-sm text-gray-500">
                  {["Upload your PDF file", "Click Convert to process", "Download your result"].map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
