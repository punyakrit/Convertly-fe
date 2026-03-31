"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Download, Trash2, RefreshCw, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";
import { getOutputLabel, getTimeAgo } from "@/lib/helpers";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const PAGE_SIZE = 8;

export default function HistoryPage() {
  const { entries, loading, refresh, remove, clearAll } = useHistory();
  const [showClear, setShowClear] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = entries.filter((e) =>
    e.file_name.toLowerCase().includes(search.toLowerCase()) ||
    e.input_type.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="bg-[#FAFAFA] min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)]">
      <ConfirmDialog
        open={showClear}
        title="Clear all history?"
        message="This will permanently delete all conversion records. This cannot be undone."
        confirmLabel="Clear All"
        onConfirm={() => { clearAll(); setShowClear(false); }}
        onCancel={() => setShowClear(false)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Hello, User</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Manage your recent file conversions and activity.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-5">
            <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">Conversions</p>
            <p className="text-xl sm:text-3xl font-bold text-indigo-600 mt-0.5 sm:mt-1">{entries.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-5">
            <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">Storage</p>
            <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">
              {entries.length > 0 ? `${(entries.length * 1.2).toFixed(0)}MB` : "0 MB"}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-5">
            <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</p>
            <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">Free</p>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 gap-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">File History</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="w-full sm:w-40 pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={refresh}
                disabled={loading}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
              </button>
              {entries.length > 0 && (
                <button
                  onClick={() => setShowClear(true)}
                  className="p-2 bg-gray-50 border border-red-200 rounded-xl hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          </div>

          {paged.length === 0 ? (
            <div className="px-4 sm:px-6 py-12 sm:py-16 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No conversions found</p>
              <p className="text-xs text-gray-400 mt-1">Upload a file to get started</p>
              <Link
                href="/"
                className="inline-block mt-5 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-colors"
              >
                Start Converting
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">File Name</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Type</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Date</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Status</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{entry.file_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{getOutputLabel(entry.input_type)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(entry.created_at)}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">Completed</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <a href={entry.converted_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                              Download <Download className="w-3.5 h-3.5" />
                            </a>
                            <button onClick={() => remove(entry.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {paged.map((entry) => (
                  <div key={entry.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{entry.file_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{getOutputLabel(entry.input_type)}</span>
                            <span className="text-xs text-gray-300">&middot;</span>
                            <span className="text-xs text-gray-400">{getTimeAgo(new Date(entry.created_at))}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={entry.converted_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-indigo-50 rounded-lg">
                          <Download className="w-4 h-4 text-indigo-600" />
                        </a>
                        <button onClick={() => remove(entry.id)} className="p-2 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="p-1.5 sm:px-3 sm:py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-1.5 sm:px-3 sm:py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
