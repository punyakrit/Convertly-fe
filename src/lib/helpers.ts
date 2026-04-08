export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export function getOutputLabel(inputType: string): string {
  const labels: Record<string, string> = {
    "image-to-pdf": "IMG \u2192 PDF",
    "pdf-to-image": "PDF \u2192 IMG",
    "merge-pdf": "MERGE",
    "split-pdf": "SPLIT",
    "pdf-to-csv": "PDF \u2192 CSV",
    "bank-statement-to-csv": "BANK \u2192 CSV",
  };
  return labels[inputType] || inputType;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function generateOutputName(original: string, outputExt: string): string {
  const dotIdx = original.lastIndexOf(".");
  const baseName = dotIdx > 0 ? original.substring(0, dotIdx) : original;
  const timestamp = Date.now();
  return `${sanitizeFilename(baseName)}_${timestamp}${outputExt}`;
}

