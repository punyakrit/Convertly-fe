export type ConversionType =
  | "image-to-pdf"
  | "pdf-to-image"
  | "merge-pdf"
  | "split-pdf"
  | "pdf-to-csv"
  | "bank-statement-to-csv";

export type ToolCategory = "pdf" | "image" | "data";

export interface Tool {
  id: ConversionType;
  title: string;
  description: string;
  icon: string;
  acceptedTypes: string[];
  multiFile: boolean;
  highlighted?: boolean;
  badge?: string;
  category: ToolCategory;
}

export interface ToolCategoryInfo {
  id: ToolCategory;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
  toolCount: number;
}

export interface ConversionResult {
  id: string;
  fileName: string;
  convertedUrl: string;
  originalUrl: string;
}

export interface HistoryEntry {
  id: string;
  file_name: string;
  input_type: ConversionType;
  output_type: string;
  original_url: string;
  converted_url: string;
  file_size: number;
  created_at: string;
}

export type ConvertState = "idle" | "selected" | "uploading" | "done" | "error";
