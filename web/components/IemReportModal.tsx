"use client";

import type { IemReportPayload } from "@/lib/iemReportTypes";
import { Download, FileText, Printer, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface IemReportModalProps {
  payload: IemReportPayload | null;
  onClose: () => void;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function IemReportModal({ payload, onClose }: IemReportModalProps) {
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

  const filename = `IEM-Report-${slugify(payload.report.subject)}-${payload.generated_at.replace(/\s+/g, "-")}.html`;

  const downloadHtml = () => {
    const blob = new Blob([payload.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([payload.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/\.html$/, ".md");
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="iem-report-title"
    >
      <div className="w-full sm:max-w-4xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-bg-card shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neon-cyan mb-1">
              IEM Report
            </p>
            <h2 id="iem-report-title" className="text-lg font-semibold leading-snug">
              {payload.report.subject}
            </h2>
            <p className="text-xs text-white/45 mt-1">
              {payload.generated_at} · Overall {payload.report.overall_score.toFixed(1)}/20 ·{" "}
              {payload.report.recommendation}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/50"
            aria-label="Close report"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-white/8 bg-black/20">
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

        <div className="flex-1 min-h-0 bg-white">
          <iframe
            ref={iframeRef}
            title="IEM Report preview"
            className="w-full h-[min(60vh,640px)] border-0"
          />
        </div>
      </div>
    </div>
  );
}