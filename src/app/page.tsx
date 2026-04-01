"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Upload, ArrowRight, FileText, GitMerge, Image, Scissors, Grid3X3,
  Wallet, ChevronDown, BarChart3, Database, FlaskConical,
  CheckCircle2, Zap, Shield, TrendingUp, Table, Tag, Users,
  Sparkles, Clock, Trash2, ShieldCheck, Lock
} from "lucide-react";

const TOOLS = [
  { id: "image-to-pdf", title: "Image to PDF", desc: "Convert JPG, PNG, and HEIC images into professional PDF documents.", icon: Image, color: "#8B5CF6" },
  { id: "merge-pdf", title: "Merge PDF", desc: "Combine multiple PDF files into one organized document instantly.", icon: GitMerge, color: "#6366F1" },
  { id: "split-pdf", title: "Split PDF", desc: "Divide page ranges or extract pages into separate files.", icon: Scissors, color: "#F59E0B" },
  { id: "pdf-to-csv", title: "PDF to CSV", desc: "Smart extraction. Convert PDF tables into clean CSV spreadsheets.", icon: Grid3X3, color: "#10B981" },
];

const BANK_FEATURES = [
  { icon: Table, title: "Auto Column Detection", desc: "Identifies Date, Description, Debit, Credit, and Balance columns automatically." },
  { icon: Tag, title: "Smart Categorization", desc: "Classifies transactions as UPI, NEFT, IMPS, ATM, Salary, EMI, and 10+ categories." },
  { icon: Users, title: "Transaction Details", desc: "Extracts full transaction descriptions with merchant and reference details." },
  { icon: TrendingUp, title: "Running Balance", desc: "Tracks running balance for accurate debit/credit assignment." },
  { icon: Shield, title: "Multi-Bank Support", desc: "Works with SBI, HDFC, ICICI, Axis, PNB, Kotak, and more." },
  { icon: Clock, title: "Instant Processing", desc: "Handles 600+ row statements in seconds, no limits." },
];

const USE_CASES = [
  { icon: BarChart3, title: "Financial Audits", desc: "Extract bank statements into spreadsheet software for deep analysis.", color: "#4F46E5" },
  { icon: Database, title: "Data Cleaning", desc: "Turn static PDF tables into CSV data for database or CRM migrations.", color: "#6366F1" },
  { icon: FlaskConical, title: "Rapid Research", desc: "Pull data from whitepapers into CSV for statistical analysis.", color: "#4F46E5" },
];

const FAQS = [
  { q: "Is my data safe? Do you store my files?", a: "We store absolutely nothing. All files are processed in memory and automatically purged within 1 hour. No data is ever retained, shared, or used for any purpose beyond your conversion." },
  { q: "Will my table formatting be preserved?", a: "Yes. Our extraction engine identifies table structures, borders, and headers to ensure the resulting CSV mirrors your PDF's layout." },
  { q: "Which banks are supported?", a: "All major Indian banks (SBI, HDFC, ICICI, Axis, PNB, Kotak, BOB, etc.) and most international bank statement formats. The parser auto-detects the layout." },
  { q: "Can I convert multiple files at once?", a: "Yes. Our merge tool combines multiple PDFs, and the image-to-PDF tool accepts multiple images in a single batch." },
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-5 pt-12 sm:pt-20 pb-16 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full mb-5 sm:mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] sm:text-xs font-semibold text-indigo-700">Free &middot; No sign-up &middot; No data stored</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-gray-900 leading-[1.15] tracking-tight px-2">
            Convert Files Instantly -<br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"> PDF, Image, CSV & More</span>
          </h1>

          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed px-2">
            Fast, secure, and free file conversion in seconds. Your premium workspace for high-speed data transformation.
          </p>

          {/* Privacy callout */}
          <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
            <Trash2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">All files auto-deleted within 1 hour. Zero data retention.</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-7 sm:mt-8 px-4">
            <Link
              href="/convert/bank-statement-to-csv"
              className="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:-translate-y-0.5 text-center"
            >
              Upload File
            </Link>
            <a
              href="#tools"
              className="w-full sm:w-auto px-7 py-3.5 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors text-center"
            >
              Explore Tools
            </a>
          </div>

          {/* Dropzone */}
          <div className="mt-10 sm:mt-14 max-w-2xl mx-auto">
            <Link href="/convert/bank-statement-to-csv">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 sm:p-10 bg-white/80 backdrop-blur hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto group-hover:bg-indigo-200 transition-all group-hover:scale-110 duration-200">
                  <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                </div>
                <p className="mt-4 text-sm font-semibold text-gray-700">Drop files here or click to upload</p>
                <p className="mt-1 text-xs text-gray-400">PDF, PNG, JPG, WebP &middot; Max 15MB</p>
              </div>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-8 text-[11px] sm:text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> 256-bit SSL</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Instant processing</span>
            <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Auto-delete in 1hr</span>
          </div>
        </div>
      </section>

      {/* ===== FEATURED: Bank Statement to CSV ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-950" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-5 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full mb-5">
                <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-300">Featured Tool</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
                Bank Statement<br />
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">to CSV Converter</span>
              </h2>
              <p className="mt-4 text-sm sm:text-base text-gray-400 leading-relaxed">
                Upload any bank statement PDF and get a clean, categorized spreadsheet in seconds.
                Auto-detects transactions, amounts, and running balances across all major banks.
              </p>

              <div className="mt-6 sm:mt-8 space-y-3">
                {["Auto-detect debit, credit & balance columns", "Smart transaction categorization (UPI, NEFT, IMPS...)", "Full transaction descriptions with merchant details", "Works with SBI, HDFC, ICICI, Axis & more"].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-300">{item}</span>
                  </div>
                ))}
              </div>

              {/* Privacy note in featured */}
              <div className="mt-6 flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-fit">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-300 font-medium">Your statement is never stored. Deleted within 1 hour.</span>
              </div>

              <Link
                href="/convert/bank-statement-to-csv"
                className="inline-flex items-center gap-2 mt-6 sm:mt-8 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 hover:-translate-y-0.5"
              >
                Try Bank Statement Parser <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mock CSV Preview */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 sm:p-6 backdrop-blur">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-[10px] sm:text-xs text-gray-500 font-mono">statement_output.csv</span>
              </div>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-[10px] sm:text-xs font-mono min-w-[400px]">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700/50">
                      <th className="text-left py-2 pr-3 font-medium">Date</th>
                      <th className="text-left py-2 pr-3 font-medium">Description</th>
                      <th className="text-left py-2 pr-3 font-medium">Category</th>
                      <th className="text-right py-2 pr-3 font-medium">Debit</th>
                      <th className="text-right py-2 font-medium">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    {[
                      { d: "15/03", p: "UPI/CR/412587/Swiggy", c: "UPI", cc: "violet", dr: "542.00", cr: "" },
                      { d: "15/03", p: "Salary Acme Corp Pvt Ltd", c: "Salary", cc: "emerald", dr: "", cr: "85,000.00" },
                      { d: "16/03", p: "HDFC EMI Debit Loan", c: "EMI", cc: "orange", dr: "12,450.00", cr: "" },
                      { d: "17/03", p: "IMPS/P2A/Amazon Pay", c: "IMPS", cc: "blue", dr: "2,999.00", cr: "" },
                      { d: "18/03", p: "NEFT CR-Tax Refund AY25", c: "NEFT", cc: "cyan", dr: "", cr: "15,200.00" },
                    ].map((r, i) => (
                      <tr key={i} className={i < 4 ? "border-b border-gray-700/30" : ""}>
                        <td className="py-2 pr-3 text-gray-500">{r.d}</td>
                        <td className="py-2 pr-3">{r.p}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-1.5 py-0.5 bg-${r.cc}-500/20 text-${r.cc}-300 rounded text-[9px] sm:text-[10px]`}>{r.c}</span>
                        </td>
                        <td className={`py-2 pr-3 text-right ${r.dr ? "text-red-400" : "text-gray-600"}`}>{r.dr || "-"}</td>
                        <td className={`py-2 text-right ${r.cr ? "text-emerald-400" : "text-gray-600"}`}>{r.cr || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">683 transactions parsed</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Validated</span>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 mt-12 sm:mt-16">
            {BANK_FEATURES.map((f) => (
              <div key={f.title} className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4 sm:p-5 hover:bg-gray-800/60 transition-colors">
                <f.icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 mb-2 sm:mb-3" />
                <h3 className="text-xs sm:text-sm font-bold text-white">{f.title}</h3>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-1 leading-relaxed hidden sm:block">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Banner */}
      <section className="bg-emerald-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-white" />
              <span className="text-sm sm:text-base font-bold text-white">Your privacy is our priority.</span>
            </div>
            <span className="text-emerald-100 text-xs sm:text-sm">
              We store zero data. All files are automatically deleted within 1 hour of conversion. No exceptions.
            </span>
          </div>
        </div>
      </section>

      {/* Popular Tools */}
      <section id="tools" className="max-w-6xl mx-auto px-4 sm:px-5 py-14 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Popular Tools</h2>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Optimized for speed and fidelity.</p>
          </div>
          <Link href="/convert/bank-statement-to-csv" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 shrink-0">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {TOOLS.map((tool) => (
            <Link key={tool.id} href={`/convert/${tool.id}`}>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-600/5 transition-all group h-full active:scale-[0.98] sm:hover:-translate-y-1 duration-200">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4"
                  style={{ backgroundColor: `${tool.color}12` }}
                >
                  <tool.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: tool.color }} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">{tool.title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-1.5 leading-relaxed">{tool.desc}</p>
                <div className="flex items-center gap-1 mt-3 sm:mt-4 text-xs sm:text-sm font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                  Start Converting <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-14 sm:py-20">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center">How It Works</h2>
          <p className="text-sm sm:text-base text-gray-500 text-center mt-2">Three simple steps to convert any file</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 mt-10 sm:mt-14">
            {[
              { num: "01", title: "Upload", desc: "Select files from your computer or drag and drop to get started." },
              { num: "02", title: "Convert", desc: "Our high-speed servers process your files using industry-leading algorithms." },
              { num: "03", title: "Download", desc: "Download your converted files. They are auto-deleted within 1 hour." },
            ].map((step, i) => (
              <div key={step.num} className="text-center relative">
                {i < 2 && (
                  <div className="hidden sm:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200" />
                )}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center mx-auto">
                  <span className="text-base sm:text-lg font-bold text-indigo-600">{step.num}</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-4 sm:mt-5">{step.title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-6xl mx-auto px-4 sm:px-5 py-14 sm:py-20">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-2 sm:mb-3">Built for Real Workflows</h2>
        <p className="text-sm sm:text-base text-gray-500 text-center mb-8 sm:mb-10">See how teams use Convertly to save hours every week</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {USE_CASES.map((uc) => (
            <div key={uc.title} className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 hover:shadow-md transition-shadow">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-3 sm:mb-4"
                style={{ backgroundColor: `${uc.color}12` }}
              >
                <uc.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: uc.color }} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">{uc.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5 sm:mt-2 leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-14 sm:py-20">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-10">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 sm:px-6 pb-4">
                    <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-5 py-10 sm:py-16">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl sm:rounded-3xl p-8 sm:p-10 md:p-14 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">Ready to convert your first file?</h2>
          <p className="text-indigo-100 mt-2 sm:mt-3 max-w-lg mx-auto text-sm sm:text-base">
            No sign-up, no watermarks, no data stored. Just fast, secure file conversion.
          </p>
          <Link
            href="/convert/bank-statement-to-csv"
            className="inline-flex items-center gap-2 mt-6 sm:mt-8 px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-700 font-bold rounded-full hover:bg-indigo-50 transition-colors shadow-lg text-sm sm:text-base"
          >
            Start Converting - It&apos;s Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
