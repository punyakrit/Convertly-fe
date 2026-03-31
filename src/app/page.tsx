"use client";

import Link from "next/link";
import { Zap, ArrowRight, Download, FileText } from "lucide-react";
import { ToolCard } from "@/components/ToolCard";
import { CategoryBlock } from "@/components/CategoryBlock";
import { getFeaturedTools, CATEGORIES } from "@/lib/tools";
import { useHistory } from "@/hooks/useHistory";
import { getOutputLabel, getTimeAgo } from "@/lib/helpers";

export default function HomePage() {
  const { entries } = useHistory();
  const featured = getFeaturedTools();
  const recentEntries = entries.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center lg:hidden">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-blue-600 lg:hidden">Convertly</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
          Convert<br />anything.
        </h1>
        <p className="text-slate-400 mt-3 text-base max-w-md">
          Professional file conversion tools right in your browser. No uploads to third parties.
        </p>
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mb-8">
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3">
            Featured
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {featured.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mb-8">
        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3">
          Categories
        </p>
        {CATEGORIES.map((cat) => (
          <CategoryBlock key={cat.id} category={cat} />
        ))}
      </section>

      {/* Recent Conversions */}
      {recentEntries.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              Recent Conversions
            </p>
            <Link href="/history" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentEntries.map((entry) => {
              const date = new Date(entry.created_at);
              const timeAgo = getTimeAgo(date);
              const typeColor = entry.output_type === "csv" ? "#10B981" : "#2563EB";

              return (
                <Link key={entry.id} href="/history">
                  <div className="bg-white rounded-xl p-3.5 flex items-center gap-3 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${typeColor}10` }}
                    >
                      <FileText className="w-4 h-4" style={{ color: typeColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{entry.file_name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {getOutputLabel(entry.input_type)} &middot; {timeAgo}
                      </p>
                    </div>
                    <Download className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
