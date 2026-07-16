"use client";

import {
  CANVAS_QUESTIONS,
  STARTUPNV_BLURB,
  STARTUPNV_ONELINER,
  buildBusinessCanvasHtml,
  emptyCanvasAnswers,
  type CanvasAnswers,
} from "@/lib/businessCanvas";
import { ChevronLeft, ChevronRight, Download, LayoutGrid, Printer, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface BusinessCanvasPanelProps {
  open: boolean;
  onClose: () => void;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "venture";
}

export function BusinessCanvasPanel({ open, onClose }: BusinessCanvasPanelProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<CanvasAnswers>(emptyCanvasAnswers);
  const [done, setDone] = useState(false);
  const [showNv, setShowNv] = useState(false);

  const q = CANVAS_QUESTIONS[step];
  const total = CANVAS_QUESTIONS.length;
  const progress = Math.round(((step + (done ? 1 : 0)) / total) * 100);

  const html = useMemo(
    () => (done ? buildBusinessCanvasHtml(answers) : ""),
    [done, answers]
  );

  const reset = useCallback(() => {
    setStep(0);
    setAnswers(emptyCanvasAnswers());
    setDone(false);
    setShowNv(false);
  }, []);

  const close = () => {
    onClose();
  };

  if (!open) return null;

  const value = q ? answers[q.field] : "";

  const setValue = (text: string) => {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.field]: text }));
  };

  const canNext = value.trim().length > 0;

  const goNext = () => {
    if (!canNext) return;
    if (step >= total - 1) {
      setDone(true);
      return;
    }
    setStep((s) => s + 1);
  };

  const goBack = () => {
    if (done) {
      setDone(false);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const downloadHtml = () => {
    const name = slugify(answers.ventureName);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-canvas-${name}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.onload = () => win.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bmc-title"
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-bg-card shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neon-cyan mb-1">
              BROK Workshop
            </p>
            <h2 id="bmc-title" className="text-lg font-semibold flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-neon-cyan" />
              Business Canvas
            </h2>
            <p className="text-xs text-white/45 mt-1">
              {done
                ? "Your one-pager is ready"
                : `Question ${step + 1} of ${total}`}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-white/40 hover:bg-white/10 hover:text-white/70"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-1 bg-black/40">
          <div
            className="h-full bg-neon-cyan/70 transition-all duration-300"
            style={{ width: `${done ? 100 : progress}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!done && q && (
            <>
              <p className="text-sm font-medium text-white/90 leading-relaxed">
                {q.prompt}
              </p>
              {q.hint && (
                <p className="text-xs text-white/40">{q.hint}</p>
              )}
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={5}
                autoFocus
                placeholder="Type or use the chat mic first, then paste here…"
                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-sm resize-y min-h-[120px] focus:border-neon-cyan/40 outline-none"
              />
            </>
          )}

          {done && (
            <div className="space-y-3">
              <p className="text-sm text-white/70">
                <strong className="text-white/90">{answers.ventureName || "Venture"}</strong>{" "}
                canvas is complete. Download HTML or Print → Save as PDF
                (landscape, backgrounds on).
              </p>
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-100/90 leading-relaxed">
                {STARTUPNV_ONELINER}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadHtml}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neon-cyan/50 bg-neon-cyan/15 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25"
                >
                  <Download className="w-4 h-4" />
                  Download HTML
                </button>
                <button
                  type="button"
                  onClick={printPdf}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white/80 text-sm font-medium hover:border-neon-cyan/30"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save PDF
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowNv((v) => !v)}
                className="text-xs text-neon-cyan/80 hover:underline"
              >
                {showNv ? "Hide" : "Show"} StartUpNV praise + Maggie & Cara bios
              </button>
              {showNv && (
                <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-xs text-white/55 whitespace-pre-wrap leading-relaxed">
                  {STARTUPNV_BLURB}
                </div>
              )}
              <button
                type="button"
                onClick={reset}
                className="text-xs text-white/40 hover:text-white/60"
              >
                Start another canvas
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={goBack}
            disabled={!done && step === 0}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-white/55 border border-white/10 hover:border-white/20 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          {!done ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-medium border border-neon-cyan/50 bg-neon-cyan/15 text-neon-cyan hover:bg-neon-cyan/25 disabled:opacity-40"
            >
              {step >= total - 1 ? "Build canvas" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={close}
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-medium border border-white/15 text-white/70 hover:border-neon-cyan/30"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
