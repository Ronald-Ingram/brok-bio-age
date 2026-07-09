"use client";

import {
  INGRAM_TYPES,
  QUICK_QUESTIONS,
  formatIngramWithRiso,
  scoreQuickInneagram,
  type InneagramScoreResult,
} from "@/lib/ingramInneagram";
import {
  loadInneagramHistory,
  saveInneagramLocal,
  type StoredInneagramResult,
} from "@/lib/ingramInneagramStorage";
import { getDeviceId } from "@/lib/deviceId";
import { Download, Loader2, Printer, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface InneagramPanelProps {
  open: boolean;
  onClose: () => void;
  userId?: string | null;
}

type Step = "intro" | "quiz" | "result";

export function InneagramPanel({ open, onClose, userId }: InneagramPanelProps) {
  const [step, setStep] = useState<Step>("intro");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<InneagramScoreResult | null>(null);
  const [reportHtml, setReportHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<StoredInneagramResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("intro");
    setQIndex(0);
    setAnswers({});
    setResult(null);
    setReportHtml("");
    setError(null);
  }, []);

  useEffect(() => {
    if (open) setHistory(loadInneagramHistory());
  }, [open]);

  const close = () => {
    reset();
    onClose();
  };

  const selectAnswer = (questionId: number, key: string) => {
    const next = { ...answers, [questionId]: key };
    setAnswers(next);
    if (qIndex < QUICK_QUESTIONS.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      void finishAssessment(next);
    }
  };

  const finishAssessment = async (finalAnswers: Record<number, string>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brok/inneagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: finalAnswers,
          user_id: userId ?? undefined,
          device_id: getDeviceId(),
          save: true,
        }),
      });
      const data = (await res.json()) as {
        result?: InneagramScoreResult;
        html?: string;
        error?: string;
      };
      if (!res.ok || !data.result) {
        throw new Error(data.error ?? "inneagram_failed");
      }
      setResult(data.result);
      setReportHtml(data.html ?? "");
      saveInneagramLocal(data.result);
      setHistory(loadInneagramHistory());
      setStep("result");
    } catch (e) {
      const scored = scoreQuickInneagram(finalAnswers);
      setResult(scored);
      saveInneagramLocal(scored);
      setHistory(loadInneagramHistory());
      setStep("result");
      setError(e instanceof Error ? e.message : "Saved locally only");
    } finally {
      setLoading(false);
    }
  };

  const downloadHtml = () => {
    if (!reportHtml) return;
    const dom = result ? INGRAM_TYPES[result.dominant].name : "Profile";
    const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ingram-Inneagram-${dom}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!reportHtml) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(reportHtml);
    win.document.close();
    win.onload = () => win.print();
  };

  if (!open) return null;

  const currentQ = QUICK_QUESTIONS[qIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-bg-card shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400 mb-1">
              Ingram Inneagram
            </p>
            <h2 className="text-lg font-semibold">Nine Gates Self-Discovery</h2>
            <p className="text-xs text-white/45 mt-1">
              Ingram system · Tree of Life · with Riso-Hudson cross-reference
            </p>
          </div>
          <button type="button" onClick={close} className="p-2 rounded-lg hover:bg-white/10 text-white/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {step === "intro" && (
            <>
              <p className="text-sm text-white/70 leading-relaxed">
                The <strong className="text-violet-300">Ingram Enneagram</strong> maps nine
                archetypes to the Kabbalistic Tree of Life for psychological and spiritual ascent.
                Unlike popular systems (Riso-Hudson), types align with sephiroth and evolve — they are
                not fixed personality boxes.
              </p>
              <p className="text-sm text-white/55 leading-relaxed">
                This quick assessment (8 questions) is scored from the canonical correspondence
                tables in <em>Ingram Enneagram Summary (7.22)</em> and <em>Seven Secrets</em>. It
                identifies your <strong>dominant</strong>, <strong>second/third</strong> wings, and{" "}
                <strong>repressed</strong> growth edge, with Riso-Hudson type shown alongside each
                Ingram type. Results save locally and to your account when signed in.
              </p>
              {history.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-black/25 p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Recent profiles</p>
                  {history.slice(0, 3).map((h) => (
                    <p key={h.id} className="text-xs text-white/60">
                      {formatIngramWithRiso(h.dominant)} ·{" "}
                      {new Date(h.savedAt).toLocaleDateString()}
                    </p>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setStep("quiz")}
                className="w-full py-3 rounded-xl bg-violet-500/20 border border-violet-400/40 text-violet-200 font-medium hover:bg-violet-500/30"
              >
                Begin Quick Assessment
              </button>
            </>
          )}

          {step === "quiz" && currentQ && (
            <>
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>
                  Question {qIndex + 1} of {QUICK_QUESTIONS.length}
                </span>
                <span>{Math.round(((qIndex + 1) / QUICK_QUESTIONS.length) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-400 transition-all"
                  style={{ width: `${((qIndex + 1) / QUICK_QUESTIONS.length) * 100}%` }}
                />
              </div>
              <p className="text-sm font-medium text-white/85 leading-relaxed">{currentQ.prompt}</p>
              <div className="space-y-2">
                {currentQ.options.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={loading}
                    onClick={() => selectAnswer(currentQ.id, opt.key)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-sm text-white/75 hover:border-violet-400/40 hover:bg-violet-500/10 transition-colors"
                  >
                    <span className="text-violet-300 font-mono mr-2">{opt.key}.</span>
                    {opt.label}
                  </button>
                ))}
              </div>
              {loading && (
                <p className="text-xs text-violet-300 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scoring profile…
                </p>
              )}
            </>
          )}

          {step === "result" && result && (
            <>
              {error && <p className="text-xs text-amber-400/90">{error}</p>}
              <div className="text-center py-4 rounded-xl border border-violet-400/25 bg-violet-500/10">
                <p className="text-[10px] uppercase tracking-widest text-violet-300/80 mb-1">
                  Dominant Type
                </p>
                <p className="text-3xl font-semibold text-violet-200">
                  {INGRAM_TYPES[result.dominant].name}
                </p>
                <p className="text-sm text-violet-300/80 mt-1">
                  Riso-Hudson {INGRAM_TYPES[result.dominant].risoHudsonId}{" "}
                  {INGRAM_TYPES[result.dominant].risoHudsonName}
                </p>
                <p className="text-xs text-white/45 mt-1">
                  Ingram Type {result.dominant} · {INGRAM_TYPES[result.dominant].sephirah} ·{" "}
                  {result.typeCounts[result.dominant]} / 8 selections
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 text-xs">
                {result.second && (
                  <div className="rounded-lg border border-white/8 p-3 bg-black/20">
                    <p className="text-white/40 mb-1">Second</p>
                    <p className="text-white/80">{formatIngramWithRiso(result.second)}</p>
                  </div>
                )}
                {result.third && (
                  <div className="rounded-lg border border-white/8 p-3 bg-black/20">
                    <p className="text-white/40 mb-1">Third</p>
                    <p className="text-white/80">{formatIngramWithRiso(result.third)}</p>
                  </div>
                )}
                {result.repressed && (
                  <div className="rounded-lg border border-white/8 p-3 bg-black/20">
                    <p className="text-white/40 mb-1">Repressed edge</p>
                    <p className="text-white/80">{formatIngramWithRiso(result.repressed)}</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-white/65 leading-relaxed">
                <strong>Path:</strong> {INGRAM_TYPES[result.dominant].path}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadHtml}
                  disabled={!reportHtml}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-violet-400/40 bg-violet-500/15 text-violet-200 disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" /> Download Report
                </button>
                <button
                  type="button"
                  onClick={printReport}
                  disabled={!reportHtml}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-white/15 text-white/70 disabled:opacity-40"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / PDF
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-white/15 text-white/70"
                >
                  <Sparkles className="w-3.5 h-3.5" /> New Assessment
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}