"use client";

import Link from "next/link";
import { useState } from "react";
import { Upload, ArrowRight, FileText, GitMerge, Image, Scissors, Grid3X3, Wallet, ChevronDown, BarChart3, Database, FlaskConical } from "lucide-react";

const TOOLS = [
  { id: "image-to-pdf", title: "Image to PDF", desc: "Convert JPG, PNG, and HEIC images into professional PDF documents.", icon: Image, color: "#8B5CF6" },
  { id: "pdf-to-image", title: "PDF to Image", desc: "Extract high-quality JPEG or PNG images from your PDF pages.", icon: FileText, color: "#EC4899" },
  { id: "merge-pdf", title: "Merge PDF", desc: "Combine multiple PDF files into one organized document instantly.", icon: GitMerge, color: "#6366F1" },
  { id: "split-pdf", title: "Split PDF", desc: "Divide page ranges or extract pages into separate files.", icon: Scissors, color: "#F59E0B" },
  { id: "pdf-to-csv", title: "PDF to CSV", desc: "Smart extraction. Convert complex PDF financial reports into clean CSV spreadsheets with high accuracy.", icon: Grid3X3, color: "#10B981", featured: true },
];

const USE_CASES = [
  { icon: BarChart3, title: "Financial Audits", desc: "Extract complex bank statements and balance sheets directly into spreadsheet software for deep analysis.", color: "#4F46E5" },
  { icon: Database, title: "Data Cleaning", desc: "Turn static PDF tables into dynamic CSV data points for your database or CRM migrations without re-typing.", color: "#6366F1" },
  { icon: FlaskConical, title: "Rapid Research", desc: "Pull scientific data or survey results from whitepapers into CSV to run your own statistical models instantly.", color: "#4F46E5" },
];

const FAQS = [
  { q: "Will my table formatting be preserved?", a: "Yes. Our extraction engine identifies table structures, borders, and headers to ensure the resulting CSV perfectly mirrors your PDF's visual layout." },
  { q: "Is my data secure on Convertly?", a: "Absolutely. Files are encrypted during transfer with 256-bit SSL, processed on isolated servers, and automatically deleted 30 minutes after conversion." },
  { q: "Can I convert multiple files at once?", a: "Yes. Our merge tool lets you combine multiple PDFs, and our image-to-PDF tool accepts multiple images in a single batch." },
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div>
      {/* Hero */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-20 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
            Convert Files Instantly -<br />
            <span className="text-indigo-600">PDF, Image, CSV & More</span>
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">
            Fast, secure, and free file conversion in seconds. Your premium workspace for high-speed data transformation.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link
              href="/convert/bank-statement-to-csv"
              className="px-7 py-3.5 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/25"
            >
              Upload File
            </Link>
            <a
              href="#tools"
              className="px-7 py-3.5 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors"
            >
              Explore Tools
            </a>
          </div>

          {/* Dropzone Preview */}
          <div className="mt-14 max-w-2xl mx-auto">
            <Link href="/convert/bank-statement-to-csv">
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto group-hover:bg-indigo-200 transition-colors">
                  <Upload className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-700">Drop files here or click to upload</p>
                <p className="mt-1 text-xs text-gray-400">Supported formats: PDF, PNG, JPG, CSV, DOCX. Max 15MB</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Tools */}
      <section id="tools" className="max-w-6xl mx-auto px-5 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Popular Tools</h2>
            <p className="text-gray-500 mt-1">Our most used conversion modules, optimized for speed and fidelity.</p>
          </div>
          <Link href="/convert/bank-statement-to-csv" className="hidden md:flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            View All Tools <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TOOLS.map((tool) => (
            <Link key={tool.id} href={`/convert/${tool.id}`}>
              <div className={`bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-600/5 transition-all group h-full ${tool.featured ? "md:col-span-2 lg:col-span-1 relative overflow-hidden" : ""}`}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${tool.color}15` }}
                >
                  <tool.icon className="w-5 h-5" style={{ color: tool.color }} />
                </div>
                <h3 className="text-base font-bold text-gray-900">{tool.title}</h3>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{tool.desc}</p>
                <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                  {tool.featured ? "Try Advanced Export" : "Start Converting"} <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-14">
            {[
              { num: "01", title: "Upload", desc: "Select files from your computer, Google Drive, or Dropbox to get started." },
              { num: "02", title: "Convert", desc: "Our high-speed servers process your files using industry-leading algorithms." },
              { num: "03", title: "Download", desc: "Securely download your converted files or save them directly to the cloud." },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center mx-auto">
                  <span className="text-lg font-bold text-indigo-600">{step.num}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mt-5">{step.title}</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {USE_CASES.map((uc) => (
            <div key={uc.title} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${uc.color}12` }}
              >
                <uc.icon className="w-5 h-5" style={{ color: uc.color }} />
              </div>
              <h3 className="text-base font-bold text-gray-900">{uc.title}</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-5 py-20">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold text-gray-900">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ml-4 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="max-w-4xl mx-auto px-5 py-16">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">The Best Way to Convert PDF to CSV Online</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Struggling with data locked in PDF files? Our PDF to CSV online tool uses advanced Optical Character Recognition to identify table structures within your documents. Whether it&apos;s bank statements, invoices, or research data, Convertly ensures that every row and column is preserved, giving you a clean spreadsheet ready for analysis.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Convert Image to PDF Free</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Need to turn your photos into a single document? Our Image to PDF Free tool supports all major formats including JPG, PNG, BMP, and TIFF. You can upload multiple images at once, reorder them with our intuitive drag-and-drop interface, and create a perfectly formatted PDF in seconds.
          </p>
        </div>
      </section>
    </div>
  );
}
