"use client";

import { useState } from "react";
import { User, HardDrive, Trash2, Info, CheckCircle2 } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function SettingsPage() {
  const { entries, clearAll } = useHistory();
  const [showClear, setShowClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const storagePercent = Math.min(entries.length * 10, 100);

  const handleClear = () => {
    clearAll();
    setShowClear(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8">
      <ConfirmDialog
        open={showClear}
        title="Clear all history?"
        message="This will permanently delete all your conversion records and files."
        confirmLabel="Clear All"
        onConfirm={handleClear}
        onCancel={() => setShowClear(false)}
      />

      <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Convertly User</h2>
            <p className="text-sm text-slate-400">Web User</p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5 text-slate-500" />
          <h3 className="text-base font-semibold text-slate-900">Data Management</h3>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-600">Storage Usage</span>
            <span className="text-slate-400">{entries.length} files</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => setShowClear(true)}
          disabled={entries.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" /> Clear History
        </button>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-slate-500" />
          <h3 className="text-base font-semibold text-slate-900">App Info</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Version</span>
            <span className="text-slate-900 font-medium">1.0.0 (Web)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Platform</span>
            <span className="text-slate-900 font-medium">Next.js</span>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {cleared && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium z-50">
          <CheckCircle2 className="w-4 h-4" /> History cleared successfully
        </div>
      )}
    </div>
  );
}
