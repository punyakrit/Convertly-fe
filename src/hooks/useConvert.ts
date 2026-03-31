"use client";

import { useState, useCallback } from "react";
import type { ConversionType, ConversionResult, ConvertState } from "@/lib/types";
import { getUserId } from "@/lib/helpers";

export function useConvert(toolId: ConversionType) {
  const [state, setState] = useState<ConvertState>("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setState("selected");
    setError(null);
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

      try {
        const formData = new FormData();
        formData.append("type", toolId);
        formData.append("user_id", getUserId());

        const multiFileTypes: ConversionType[] = ["image-to-pdf", "merge-pdf"];
        if (multiFileTypes.includes(toolId)) {
          files.forEach((f) => formData.append("files", f));
        } else {
          formData.append("file", files[0]);
        }

        if (options?.pages) formData.append("pages", options.pages);

        // Use XMLHttpRequest for progress tracking
        const res = await new Promise<ConversionResult>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/convert");

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded * 100) / e.total));
            }
          };

          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300 && data.success) {
                resolve(data.data);
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

        setResult(res);
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
  }, []);

  return { state, files, progress, result, error, addFiles, removeFile, convert, reset };
}
