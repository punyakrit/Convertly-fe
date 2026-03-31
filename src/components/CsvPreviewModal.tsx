"use client";

import { useEffect, useState } from "react";
import { X, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface CsvPreviewModalProps {
  open: boolean;
  onClose: () => void;
  csvUrl: string;
  fileName: string;
}

const PAGE_SIZE = 25;

export function CsvPreviewModal({ open, onClose, csvUrl, fileName }: CsvPreviewModalProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!open || !csvUrl) return;
    setLoading(true);
    setError("");
    setPage(0);

    fetch(csvUrl)
      .then((res) => res.text())
      .then((text) => {
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
          setHeaders(parsed[0]);
          setRows(parsed.slice(1));
        }
      })
      .catch(() => setError("Failed to load CSV"))
      .finally(() => setLoading(false));
  }, [open, csvUrl]);

  if (!open) return null;

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const paged = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">CSV Preview</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[250px] sm:max-w-none">{fileName}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={csvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && headers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5 w-10">#</th>
                    {headers.map((h, i) => (
                      <th
                        key={i}
                        className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 whitespace-nowrap ${
                          h === "Debit" || h === "Credit" || h === "Balance"
                            ? "text-right text-gray-400"
                            : "text-left text-gray-400"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, ri) => {
                    const rowIdx = page * PAGE_SIZE + ri;
                    return (
                      <tr key={rowIdx} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-gray-300 font-mono">{rowIdx + 1}</td>
                        {headers.map((h, ci) => {
                          const val = row[ci] || "";
                          const isDebit = h === "Debit" && val;
                          const isCredit = h === "Credit" && val;
                          const isAmount = h === "Debit" || h === "Credit" || h === "Balance";
                          return (
                            <td
                              key={ci}
                              className={`px-4 py-2.5 whitespace-nowrap ${
                                isAmount ? "text-right font-mono" : ""
                              } ${
                                isDebit ? "text-red-600 font-medium" :
                                isCredit ? "text-emerald-600 font-medium" :
                                h === "Balance" ? "text-gray-500" :
                                h === "Category" ? "" :
                                "text-gray-700"
                              }`}
                            >
                              {h === "Category" && val ? (
                                <span className="inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-md">
                                  {val}
                                </span>
                              ) : h === "Date" ? (
                                <span className="text-gray-500">{val}</span>
                              ) : isDebit ? (
                                <span>-{val}</span>
                              ) : isCredit ? (
                                <span>+{val}</span>
                              ) : (
                                <span className="max-w-[300px] truncate block">{val}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
          <p className="text-xs text-gray-500">
            {rows.length} rows &middot; Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, rows.length)}
          </p>
          <div className="flex items-center gap-3">
            {/* Mobile download */}
            <a
              href={csvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
            >
              <Download className="w-3 h-3" /> Download
            </a>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <span className="text-xs text-gray-500 min-w-[60px] text-center">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Simple CSV parser that handles quoted fields with commas */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        row.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    row.push(current);
    rows.push(row);
  }

  return rows;
}
