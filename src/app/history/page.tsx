"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, RefreshCw, Trash2, ShieldCheck, ArrowRight } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";
import { HistoryItem } from "@/components/HistoryItem";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function HistoryPage() {
  const { entries, loading, refresh, remove, clearAll } = useHistory();
  const [showClear, setShowClear] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8">
      <ConfirmDialog
        open={showClear}
        title="Clear all history?"
        message="This will permanently delete all your conversion records and files. This action cannot be undone."
        confirmLabel="Clear All"
        onConfirm={() => { clearAll(); setShowClear(false); }}
        onCancel={() => setShowClear(false)}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-bold text-blue-600 tracking-widest uppercase mb-1">Archive</p>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">History</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage and redownload your processed files from the last 30 days.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          </button>
          {entries.length > 0 && (
            <button
              onClick={() => setShowClear(true)}
              className="p-2.5 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {entries.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Clock className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">No history yet</h3>
          <p className="text-sm text-slate-400 mt-1">Your converted files will appear here</p>
          <Link
            href="/"
            className="mt-6 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Start Converting
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {entries.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} onDelete={remove} />
          ))}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="bg-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="text-base font-bold">Storage Policy</h3>
          </div>
          <p className="text-sm text-blue-100 leading-relaxed">
            Converted files are automatically deleted from our secure servers 30 days after processing to ensure your data privacy.
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-1">Need a different format?</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            Our conversion engine supports multiple file formats with lossless precision.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Start New Conversion <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
