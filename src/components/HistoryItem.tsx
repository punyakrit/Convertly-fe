"use client";

import { Download, Trash2, FileText } from "lucide-react";
import type { HistoryEntry } from "@/lib/types";
import { getOutputLabel, getTimeAgo } from "@/lib/helpers";

export function HistoryItem({ entry, onDelete }: { entry: HistoryEntry; onDelete: (id: string) => void }) {
  const date = new Date(entry.created_at);
  const label = getOutputLabel(entry.input_type);
  const typeColor = entry.output_type === "csv" ? "#10B981" : "#2563EB";

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 group">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${typeColor}10` }}
      >
        <FileText className="w-4 h-4" style={{ color: typeColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{entry.file_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${typeColor}10`, color: typeColor }}
          >
            {label}
          </span>
          <span className="text-[11px] text-slate-400">{getTimeAgo(date)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <a
          href={entry.converted_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4 text-blue-600" />
        </a>
        <button
          onClick={() => onDelete(entry.id)}
          className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
}
