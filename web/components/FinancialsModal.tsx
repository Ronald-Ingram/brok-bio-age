"use client";

import type { FinancialsPayload } from "@/lib/financialsTypes";
import { Download, FileSpreadsheet, FileText, Printer, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface FinancialsModalProps {
  payload: FinancialsPayload | null;
  onClose: () => void;
}

function downloadBase64Xlsx(base64: string, filename: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function FinancialsModal({ payload, onClose }: FinancialsModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!payload || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(payload.html);
    doc.close();
  }, [payload]);

  if (!payload) return null;

  const baseName = payload.xlsx_filename.replace(/\.xlsx$/i, "");

  const downloadHtml = () => {
    const blob = new Blob([payload.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([payload.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(payload.html);
    win.document.close();
    win.focus();
    win.onload = () => win.print();
  };

  const pkg = payload.package;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="financials-title"
    >
      <div className="w-full sm:max-w-4xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-bg-card shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/90 mb-1">
              Internally prepared financials
            </p>
            <h2
              id="financials-title"
              className="text-lg font-semibold leading-snug"
            >
              {pkg.entity_name}
            </h2>
            <p className="text-xs text-white/45 mt-1">
              {pkg.period_label} · {pkg.currency} · {pkg.basis} basis ·{" "}
              {payload.generated_at}
              {pkg.incomplete ? " · Incomplete draft" : " · Draft ready"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/50"
            aria-label="Close financials"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-white/8 bg-black/20">
          <button
            type="button"
            onClick={() =>
              downloadBase64Xlsx(payload.xlsx_base64, payload.xlsx_filename)
            }
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Download Excel
          </button>
          <button
            type="button"
            onClick={downloadHtml}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
          >
            <Download className="w-3.5 h-3.5" />
            Download HTML
          </button>
          <button
            type="button"
            onClick={downloadMarkdown}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-white/15 text-white/70 hover:bg-white/5"
          >
            <FileText className="w-3.5 h-3.5" />
            Download Markdown
          </button>
          <button
            type="button"
            onClick={printReport}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-white/15 text-white/70 hover:bg-white/5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
        </div>

        <p className="px-5 py-2 text-[11px] text-amber-200/80 bg-amber-500/10 border-b border-amber-500/20">
          {payload.disclaimer}
        </p>

        <iframe
          ref={iframeRef}
          title="Financial statements preview"
          className="flex-1 w-full min-h-[50vh] bg-white"
        />
      </div>
    </div>
  );
}
