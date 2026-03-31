"use client";

import Link from "next/link";
import { ArrowRight, Wallet, GitMerge, Scissors, Image, Grid3X3, FileText } from "lucide-react";
import type { Tool } from "@/lib/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet, GitMerge, Scissors, Image, Grid3X3, FileText,
};

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = ICON_MAP[tool.icon] || FileText;

  if (tool.highlighted) {
    return (
      <Link href={`/convert/${tool.id}`}>
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5">
          {tool.badge && (
            <span className="inline-block px-2.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold tracking-wide uppercase mb-3">
              {tool.badge}
            </span>
          )}
          <h3 className="text-lg font-bold">{tool.title}</h3>
          <p className="text-blue-100 text-sm mt-1 leading-relaxed">{tool.description}</p>
          <div className="flex items-center gap-2 mt-4 text-sm font-semibold">
            Launch Tool <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/convert/${tool.id}`}>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-sm transition-all hover:-translate-y-0.5 group">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
            <Icon className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{tool.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{tool.description}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors mt-1 shrink-0" />
        </div>
      </div>
    </Link>
  );
}
