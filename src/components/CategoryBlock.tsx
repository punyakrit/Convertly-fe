"use client";

import { useState } from "react";
import { ChevronDown, FileText, Images, Grid3X3, type LucideProps } from "lucide-react";
import type { ToolCategoryInfo } from "@/lib/types";
import { getToolsByCategory } from "@/lib/tools";
import { ToolCard } from "./ToolCard";

const CAT_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  FileText, Images, Grid3X3,
};

export function CategoryBlock({ category }: { category: ToolCategoryInfo }) {
  const [open, setOpen] = useState(false);
  const tools = getToolsByCategory(category.id);
  const Icon = CAT_ICONS[category.icon] || FileText;

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 transition-colors"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: category.bgColor }}
        >
          <Icon className="w-5 h-5" color={category.color} />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-sm font-semibold text-slate-900">{category.title}</h3>
          <p className="text-xs text-slate-400">{category.subtitle} &middot; {category.toolCount} tools</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pl-2">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
