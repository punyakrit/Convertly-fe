"use client";

import { useState, useCallback } from "react";
import type { ConversionType, ConversionResult, ConvertState, ConvertApiData } from "@/lib/types";
import { addHistoryEntry } from "@/lib/historyStorage";

function toDataUrl(mime: string, base64: string): string {
  return `data:${mime};base64,${base64}`;
}

function apiDataToResult(d: ConvertApiData): ConversionResult {
  return {
    id: d.id,
    fileName: d.fileName,
    convertedUrl: toDataUrl(d.convertedMimeType, d.convertedBase64),
    originalUrl: toDataUrl(d.originalMimeType, d.originalBase64),
  };
}

export function useConvert(toolId: ConversionType) {
  const [state, setState] = useState<ConvertState>("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setState("selected");
    setError(null);
    setPersistError(null);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setState("idle");
      return next;
    });
  }, []);

  const convert = useCallback(
    async (options?: { pages?: string; format?: string }) => {
      if (files.length === 0) return;

      setState("uploading");
      setProgress(0);
      setError(null);
      setPersistError(null);

      try {
        const formData = new FormData();
        formData.append("type", toolId);

        const multiFileTypes: ConversionType[] = ["image-to-pdf", "merge-pdf"];
        if (multiFileTypes.includes(toolId)) {
          files.forEach((f) => formData.append("files", f));
        } else {
          formData.append("file", files[0]);
        }

        if (options?.pages) formData.append("pages", options.pages);

        const res = await new Promise<{ success: boolean; data?: ConvertApiData; error?: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/convert");

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded * 100) / e.total));
            }
          };

          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText) as {
                success: boolean;
                data?: ConvertApiData;
                error?: string;
              };
              if (xhr.status >= 200 && xhr.status < 300 && data.success && data.data) {
                resolve(data);
              } else {
                reject(new Error(data.error || "Conversion failed"));
              }
            } catch {
              reject(new Error("Invalid response"));
            }
          };

          xhr.onerror = () => reject(new Error("Network error"));
          xhr.send(formData);
        });

        const conv = apiDataToResult(res.data!);
        setResult(conv);

        const persisted = addHistoryEntry({
          id: res.data!.id,
          file_name: res.data!.fileName,
          input_type: res.data!.inputType,
          output_type: res.data!.outputType,
          original_url: conv.originalUrl,
          converted_url: conv.convertedUrl,
          file_size: Math.floor(res.data!.convertedBase64.length * 0.75),
          created_at: new Date().toISOString(),
        });
        if (!persisted.ok) {
          setPersistError(persisted.error);
        }

        setState("done");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Conversion failed";
        setError(message);
        setState("error");
      }
    },
    [files, toolId]
  );

  const reset = useCallback(() => {
    setState("idle");
    setFiles([]);
    setProgress(0);
    setResult(null);
    setError(null);
    setPersistError(null);
  }, []);

  return { state, files, progress, result, error, persistError, addFiles, removeFile, convert, reset };
}
