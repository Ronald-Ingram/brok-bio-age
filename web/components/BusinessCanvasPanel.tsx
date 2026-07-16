"use client";

import {
  CANVAS_QUESTIONS,
  STARTUPNV_BLURB,
  STARTUPNV_ONELINER,
  buildBusinessCanvasHtml,
  emptyCanvasAnswers,
  type CanvasAnswers,
} from "@/lib/businessCanvas";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  LayoutGrid,
  Lightbulb,
  Mic,
  MicOff,
  Printer,
  X,
} from "lucide-react";
import { useBrowserSpeechInput } from "@/hooks/useBrowserSpeechInput";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  /** Detailed tip open by default so workshop founders see guidance without hover. */
  const [tipOpen, setTipOpen] = useState(true);
  const [sttError, setSttError] = useState<string | null>(null);

  const q = CANVAS_QUESTIONS[step];
  const total = CANVAS_QUESTIONS.length;
  const progress = Math.round(((step + (done ? 1 : 0)) / total) * 100);
  const fieldRef = useRef(q?.field);
  fieldRef.current = q?.field;
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const {
    listening,
    supported: sttSupported,
    toggle: toggleListen,
    stop: stopListening,
  } = useBrowserSpeechInput({
    getValue: () => {
      const f = fieldRef.current;
      return f ? answersRef.current[f] ?? "" : "";
    },
    setValue: (text) => {
      const f = fieldRef.current;
      if (!f) return;
      setAnswers((prev) => ({ ...prev, [f]: text }));
    },
    onError: (msg) => setSttError(msg),
  });

  const html = useMemo(
    () => (done ? buildBusinessCanvasHtml(answers) : ""),
    [done, answers]
  );

  // Re-open the tip when the question changes so each step’s guidance is visible.
  useEffect(() => {
    setTipOpen(true);
    stopListening();
    setSttError(null);
  }, [step, stopListening]);

  useEffect(() => {
    if (!open) stopListening();
  }, [open, stopListening]);

  const reset = useCallback(() => {
    stopListening();
    setStep(0);
    setAnswers(emptyCanvasAnswers());
    setDone(false);
    setShowNv(false);
    setTipOpen(true);
    setSttError(null);
  }, [stopListening]);

  const close = () => {
    stopListening();
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
    stopListening();
    if (step >= total - 1) {
      setDone(true);
      return;
    }
    setStep((s) => s + 1);
  };

  const goBack = () => {
    stopListening();
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
      <div className="w-full sm:max-w-xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-bg-card shadow-2xl overflow-hidden">
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
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <p className="text-sm font-medium text-white/90 leading-relaxed flex-1">
                    {q.prompt}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTipOpen((v) => !v)}
                    className={`shrink-0 mt-0.5 p-1.5 rounded-lg border transition-colors ${
                      tipOpen
                        ? "border-neon-cyan/40 bg-neon-cyan/15 text-neon-cyan"
                        : "border-white/15 bg-white/5 text-white/45 hover:text-neon-cyan hover:border-neon-cyan/30"
                    }`}
                    aria-expanded={tipOpen}
                    aria-controls={`bmc-tip-${q.id}`}
                    title={
                      tipOpen
                        ? "Hide explanation"
                        : "Show detailed explanation for this question"
                    }
                  >
                    <CircleHelp className="w-4 h-4" />
                  </button>
                </div>
                {q.hint && (
                  <p className="text-xs text-white/45">{q.hint}</p>
                )}
                {q.canvasCell && (
                  <p className="text-[10px] uppercase tracking-wider text-white/30">
                    Canvas cell · {q.canvasCell}
                  </p>
                )}
              </div>

              <div
                id={`bmc-tip-${q.id}`}
                className="rounded-xl border border-white/10 bg-black/30 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setTipOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/[0.03]"
                  aria-expanded={tipOpen}
                >
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-neon-cyan/90">
                    <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                    Why this matters — how to answer
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-white/40 transition-transform ${
                      tipOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {tipOpen && (
                  <div className="px-3 pb-3 space-y-2.5 border-t border-white/5">
                    <p className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed pt-2.5">
                      {q.tip}
                    </p>
                    {q.example && (
                      <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-emerald-200/70 mb-1">
                          Example (illustration only)
                        </p>
                        <p className="text-xs text-emerald-50/85 leading-relaxed">
                          {q.example}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-white/50">
                    {listening ? (
                      <span className="text-neon-cyan font-medium animate-pulse">
                        ● Listening — tap Stop when finished
                      </span>
                    ) : (
                      <>
                        Tap <strong className="text-white/75">Mic</strong> to
                        dictate this answer
                      </>
                    )}
                  </span>
                </div>
                <div className="flex gap-2 items-stretch">
                  <button
                    type="button"
                    onClick={() => {
                      setSttError(null);
                      void toggleListen();
                    }}
                    title={
                      sttSupported
                        ? listening
                          ? "Stop microphone"
                          : "Turn on microphone — speak your answer"
                        : "Dictation needs Chrome or Edge"
                    }
                    aria-label={
                      listening ? "Stop microphone" : "Turn on microphone"
                    }
                    aria-pressed={listening}
                    className={`shrink-0 inline-flex flex-col items-center justify-center gap-0.5 min-w-[4.25rem] px-2 rounded-xl border transition-colors ${
                      listening
                        ? "border-neon-cyan/70 bg-neon-cyan/25 text-neon-cyan shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                        : sttSupported
                          ? "border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
                          : "border-white/10 bg-black/20 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    {listening ? (
                      <Mic className="w-5 h-5 animate-pulse" />
                    ) : sttSupported ? (
                      <Mic className="w-5 h-5" />
                    ) : (
                      <MicOff className="w-5 h-5" />
                    )}
                    <span className="text-[10px] font-semibold leading-none">
                      {listening ? "Stop" : "Mic"}
                    </span>
                  </button>
                  <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    rows={4}
                    autoFocus
                    placeholder={
                      listening
                        ? "Listening… speak your answer"
                        : "Type here — or tap Mic to speak"
                    }
                    className={`flex-1 min-w-0 px-4 py-3 rounded-xl bg-black/30 border text-sm resize-y min-h-[100px] outline-none ${
                      listening
                        ? "border-neon-cyan/50 focus:border-neon-cyan/60"
                        : "border-white/10 focus:border-neon-cyan/40"
                    }`}
                  />
                </div>
                {sttError && (
                  <p className="text-xs text-amber-200/90 leading-snug">
                    {sttError}
                  </p>
                )}
              </div>
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
