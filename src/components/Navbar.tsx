"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Tools" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "About" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-gray-900">Convertly</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? "text-indigo-600 underline underline-offset-[20px] decoration-2"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/convert/bank-statement-to-csv"
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-colors"
          >
            Convert Now
          </Link>
        </div>

        <button
          className="md:hidden p-2 -mr-1"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 shadow-lg">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-xl hover:bg-gray-50"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/convert/bank-statement-to-csv"
            className="block w-full text-center px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full mt-2"
            onClick={() => setMobileOpen(false)}
          >
            Convert Now
          </Link>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-8">
        {/* Privacy Banner */}
        <div className="flex items-center justify-center gap-2 mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs sm:text-sm text-emerald-700 font-medium text-center">
            Zero data stored. All uploaded files and conversions are automatically deleted within 1 hour.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Convertly</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">Tools</Link>
            <Link href="/history" className="hover:text-gray-700">Privacy</Link>
            <Link href="/settings" className="hover:text-gray-700">Terms</Link>
          </div>
          <p className="text-xs text-gray-400">&copy; 2025 Convertly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
