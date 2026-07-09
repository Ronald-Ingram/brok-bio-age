"use client";

import { BiomarkerForm } from "@/components/BiomarkerForm";
import { ContextFlags } from "@/components/ContextFlags";
import { ModelConfigPanel } from "@/components/ModelConfigPanel";
import { usePock } from "@/context/PockContext";
import { calculateBioAge } from "@/lib/api";
import { EXAMPLE_20260630 } from "@/lib/example";
import { toBiomarkerPayload, toContextPayload } from "@/lib/formConvert";
import {
  EMPTY_BIOMARKERS,
  EMPTY_CONTEXT,
  type FormBiomarkerInput,
  type FormContextFlags,
} from "@/lib/formTypes";
import type { FieldProvenance } from "@/lib/fieldDefaults";
import {
  allPriorsFromHistory,
  type BioAgeHistoryEntry,
  saveHistoryEntry,
} from "@/lib/storage";
import type { ModelConfig } from "@/lib/types";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  Trash2,
} from "lucide-react";
import { useState } from "react";

interface HistoricalEntryPanelProps {
  history: BioAgeHistoryEntry[];
  onHistoryChange: (entries: BioAgeHistoryEntry[]) => void;
  onClearHistory?: () => void;
}

export function HistoricalEntryPanel({
  history,
  onHistoryChange,
  onClearHistory,
}: HistoricalEntryPanelProps) {
  const { ready, canCalc, debitCalc, createAccount } = usePock();
  const [open, setOpen] = useState(false);
  const [biomarkers, setBiomarkers] =
    useState<FormBiomarkerInput>(EMPTY_BIOMARKERS);
  const [context, setContext] = useState<FormContextFlags>(EMPTY_CONTEXT);
  const [provenance, setProvenance] = useState<FieldProvenance>({});
  const [config, setConfig] = useState<ModelConfig>(EXAMPLE_20260630.config);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddHistorical = async () => {
    if (!biomarkers.test_date?.trim()) {
      setError("Set a test date for this historical entry");
      return;
    }
    if (!ready) {
      await createAccount();
      setError("Create your free account to save historical tests");
      return;
    }
    if (!canCalc) {
      setError("Not enough $POCK — top up in Genius Wallet");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const biomarkerPayload = toBiomarkerPayload(biomarkers);
      const contextPayload = toContextPayload(context);
      const prior_tests = allPriorsFromHistory(
        history,
        biomarkerPayload.test_date
      );
      const request = {
        biomarkers: biomarkerPayload,
        context: contextPayload,
        config,
        prior_tests,
      };
      await debitCalc();
      const res = await calculateBioAge(request);
      const updated = saveHistoryEntry(request, res);
      onHistoryChange(updated);
      setSuccess(
        `Saved ${biomarkerPayload.test_date} · BROK ${res.brok.pheno_age.toFixed(1)} yrs`
      );
      setBiomarkers({ ...EMPTY_BIOMARKERS, test_date: "" });
      setContext(EMPTY_CONTEXT);
      setProvenance({});
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      setError(msg === "insufficient_pock" ? "Not enough $POCK" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-bg-card overflow-hidden">
      <div className="flex items-stretch gap-2 px-3 py-3 border-b border-white/5 sm:border-0 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors rounded-lg px-2 py-1"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
              <History className="w-4 h-4 text-neon-cyan" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-white/85">
                Add historical test
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                {history.length} saved · build bio-age trend lines (subscribers)
              </p>
            </div>
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-white/40 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
          )}
        </button>
        {history.length > 0 && onClearHistory && (
          <button
            type="button"
            onClick={onClearHistory}
            title="Clear all historical tests"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-400/25 text-red-400/80 text-xs hover:bg-red-400/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-5 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-white/45">
            <Calendar className="w-3.5 h-3.5 text-neon-cyan" />
            Set <strong className="text-white/70">Test date</strong> below — use
            the date on your lab report (not today).
          </div>

          <BiomarkerForm
            values={biomarkers}
            provenance={provenance}
            onChange={(bio, prov) => {
              setBiomarkers(bio);
              setProvenance(prov);
            }}
          />
          <ContextFlags
            values={context}
            provenance={provenance}
            onChange={(ctx, prov) => {
              setContext(ctx);
              setProvenance((p) => ({ ...p, ...prov }));
            }}
          />
          <ModelConfigPanel values={config} onChange={setConfig} />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={handleAddHistorical}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <History className="w-4 h-4" />
              )}
              Calculate &amp; save to history
            </button>
            <span className="text-[11px] text-white/35">1 $POCK per entry</span>
          </div>

          {error && <p className="text-sm text-red-400/90">{error}</p>}
          {success && <p className="text-sm text-emerald-400/90">{success}</p>}
        </div>
      )}
    </section>
  );
}