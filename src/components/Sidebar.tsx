"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Settings, Zap, FileText, GitMerge, Scissors, Image, Grid3X3, Wallet } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/history", label: "History", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

const QUICK_TOOLS = [
  { href: "/convert/bank-statement-to-csv", label: "Bank Statement → CSV", icon: Wallet },
  { href: "/convert/merge-pdf", label: "Merge PDFs", icon: GitMerge },
  { href: "/convert/split-pdf", label: "Split PDF", icon: Scissors },
  { href: "/convert/pdf-to-csv", label: "PDF → CSV", icon: Grid3X3 },
  { href: "/convert/image-to-pdf", label: "Image → PDF", icon: FileText },
  { href: "/convert/pdf-to-image", label: "PDF → Image", icon: Image },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 bg-white h-screen sticky top-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">Convertly</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-8">
          <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            Quick Tools
          </p>
          <div className="space-y-0.5">
            {QUICK_TOOLS.map((tool) => {
              const isActive = pathname === tool.href;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <tool.icon className="w-4 h-4" />
                  {tool.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">Convertly Web v1.0</p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-1 ${
                isActive ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
