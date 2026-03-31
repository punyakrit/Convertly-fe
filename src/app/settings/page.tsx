"use client";

import { useState } from "react";
import { User, FileText, HardDrive, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function SettingsPage() {
  const { entries, clearAll } = useHistory();
  const [showClear, setShowClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const storageUsed = entries.length * 1.2;
  const storagePercent = Math.min((storageUsed / 500) * 100, 100);

  const handleClear = () => {
    clearAll();
    setShowClear(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="bg-[#FAFAFA] min-h-[calc(100vh-64px)]">
      <ConfirmDialog
        open={showClear}
        title="Clear all history?"
        message="Deleting your history is permanent and cannot be undone. This will clear all cached conversion data and metadata."
        confirmLabel="Clear history"
        onConfirm={handleClear}
        onCancel={() => setShowClear(false)}
      />

      <div className="max-w-6xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile, data usage, and preferences.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
          {/* Left - Profile Card */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto">
                <User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-4">Convertly User</h2>
              <p className="text-sm text-gray-400">Free Plan</p>

              <div className="mt-6 space-y-1">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium">
                  <User className="w-4 h-4" /> Profile Info
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <p className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase">Current Plan</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">Free Tier</h3>
              <p className="text-sm text-gray-500 mt-2">
                All tools are free to use. No limits on conversions.
              </p>
            </div>
          </div>

          {/* Right - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Usage Insights */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-5">Usage Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Files Converted</p>
                    <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <HardDrive className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Storage Used</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-gray-900">{storageUsed.toFixed(0)} MB</p>
                      <span className="text-xs text-gray-400">{storagePercent.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Storage bar */}
              <div className="mt-4">
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-orange-400 rounded-full transition-all"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-5">Profile Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Display Name</label>
                  <input
                    type="text"
                    defaultValue="Convertly User"
                    className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Address</label>
                  <input
                    type="email"
                    defaultValue=""
                    placeholder="your@email.com"
                    className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-white border border-red-200 rounded-2xl p-6">
              <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-red-600">Data Management</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Deleting your history is permanent and cannot be undone. This will clear all cached conversion data and metadata.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClear(true)}
                  disabled={entries.length === 0}
                  className="px-5 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  Clear history
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {cleared && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium z-50">
          <CheckCircle2 className="w-4 h-4" /> History cleared successfully
        </div>
      )}
    </div>
  );
}
