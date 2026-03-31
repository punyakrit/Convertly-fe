import type { Tool, ToolCategoryInfo } from "./types";

export const CATEGORIES: ToolCategoryInfo[] = [
  {
    id: "pdf",
    title: "PDF Tools",
    subtitle: "Merge, split, convert",
    icon: "FileText",
    color: "#EF4444",
    bgColor: "#FEF2F2",
    toolCount: 4,
  },
  {
    id: "image",
    title: "Image Tools",
    subtitle: "Convert & optimize",
    icon: "Images",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    toolCount: 1,
  },
  {
    id: "data",
    title: "Data & CSV",
    subtitle: "Extract & transform",
    icon: "Grid3X3",
    color: "#10B981",
    bgColor: "#ECFDF5",
    toolCount: 2,
  },
];

export const TOOLS: Tool[] = [
  {
    id: "bank-statement-to-csv",
    title: "Bank Statement → CSV",
    description:
      "Smart bank statement parser. Auto-detect transactions, amounts, debit/credit, and export clean spreadsheets.",
    icon: "Wallet",
    acceptedTypes: ["application/pdf"],
    multiFile: false,
    highlighted: true,
    badge: "Featured",
    category: "data",
  },
  {
    id: "merge-pdf",
    title: "Merge PDFs",
    description: "Combine multiple PDFs into one organized document.",
    icon: "GitMerge",
    acceptedTypes: ["application/pdf"],
    multiFile: true,
    category: "pdf",
  },
  {
    id: "split-pdf",
    title: "Split PDF",
    description: "Extract specific pages or split into separate files.",
    icon: "Scissors",
    acceptedTypes: ["application/pdf"],
    multiFile: false,
    category: "pdf",
  },
  {
    id: "pdf-to-image",
    title: "PDF → Image",
    description: "Convert PDF pages to high-quality JPG or PNG images.",
    icon: "Image",
    acceptedTypes: ["application/pdf"],
    multiFile: false,
    category: "pdf",
  },
  {
    id: "pdf-to-csv",
    title: "PDF → CSV",
    description: "Extract tables from any PDF into spreadsheet format.",
    icon: "Grid3X3",
    acceptedTypes: ["application/pdf"],
    multiFile: false,
    category: "pdf",
  },
  {
    id: "image-to-pdf",
    title: "Image → PDF",
    description: "Convert images to PDF with full resolution preservation.",
    icon: "FileText",
    acceptedTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    multiFile: true,
    category: "image",
  },
];

export function getToolsByCategory(category: string): Tool[] {
  return TOOLS.filter((t) => t.category === category);
}

export function getFeaturedTools(): Tool[] {
  return TOOLS.filter((t) => t.highlighted);
}

export function getToolById(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id);
}
