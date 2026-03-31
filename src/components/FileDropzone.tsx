"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, ImageIcon, CheckCircle2 } from "lucide-react";
import { formatFileSize } from "@/lib/helpers";

interface FileDropzoneProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  accept: Record<string, string[]>;
  multiple?: boolean;
}

export function FileDropzone({ files, onFilesSelected, onRemoveFile, accept, multiple = false }: FileDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFilesSelected(accepted);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
  });

  if (files.length > 0) {
    return (
      <div className="space-y-3">
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-3 px-5 py-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                {file.type.startsWith("image/") ? (
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                ) : (
                  <FileText className="w-4 h-4 text-indigo-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <button
                onClick={() => onRemoveFile(i)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
        {multiple && (
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <button className="w-full py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
              + Add more files
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
        isDragActive
          ? "border-indigo-500 bg-indigo-50"
          : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/30"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
            isDragActive ? "bg-indigo-100" : "bg-white border border-gray-200"
          }`}
        >
          <Upload className={`w-6 h-6 ${isDragActive ? "text-indigo-600" : "text-gray-400"}`} />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-700">
            {isDragActive ? "Drop your files here" : "Drop your PDF here"}
          </p>
          <p className="text-sm text-gray-400 mt-1">or click to browse from your computer</p>
        </div>
      </div>
    </div>
  );
}
