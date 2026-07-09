"use client";

import { BiomarkerForm } from "@/components/BiomarkerForm";
import { ContextFlags } from "@/components/ContextFlags";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { HistoricalEntryPanel } from "@/components/HistoricalEntryPanel";
import { TrendDashboard } from "@/components/TrendDashboard";
import { ModelConfigPanel } from "@/components/ModelConfigPanel";
import { PdfUpload } from "@/components/PdfUpload";
import { PockHeader } from "@/components/PockHeader";
import { ResultsPanel } from "@/components/ResultsPanel";
import { UpgradeCard } from "@/components/UpgradeCard";
import { WalletPanel } from "@/components/WalletPanel";
import { usePock } from "@/context/PockContext";
import { calculateBioAge } from "@/lib/api";
import { exampleToForm, EXAMPLE_20260630 } from "@/lib/example";
import { toBiomarkerPayload, toContextPayload } from "@/lib/formConvert";
import {
  EMPTY_BIOMARKERS,
  EMPTY_CONTEXT,
  type FormBiomarkerInput,
  type FormContextFlags,
} from "@/lib/formTypes";
import type { FieldProvenance } from "@/lib/fieldDefaults";
import { getHistoryLimit, MAX_FREE_HISTORY } from "@/lib/pockService";
import {
  type BioAgeHistoryEntry,
  loadHistory,
  allPriorsFromHistory,
  saveHistoryEntry,
} from "@/lib/storage";
import type { CalculateResponse, ModelConfig } from "@/lib/types";
import {
  Activity,
  Calculator,
  Dna,
  Loader2,
  PenLine,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DISCLAIMER_KEY = "brok_bioage_disclaimer_v1";
type EntryMode = "manual" | "upload";
type AppTab = "calculator" | "wallet";

export default function HomePage() {
  const { ready, canCalc, debitCalc, createAccount, historyUnlimited, user } =
    usePock();
  const [disclaimerOk, setDisclaimerOk] = useState(false);
  const [history, setHistory] = useState<BioAgeHistoryEntry[]>([]);
  const [biomarkers, setBiomarkers] =
    useState<FormBiomarkerInput>(EMPTY_BIOMARKERS);
  const [context, setContext] = useState<FormContextFlags>(EMPTY_CONTEXT);
  const [provenance, setProvenance] = useState<FieldProvenance>({});
  const [config, setConfig] = useState<ModelConfig>(EXAMPLE_20260630.config);
  const [entryMode, setEntryMode] = useState<EntryMode>("manual");
  const [appTab, setAppTab] = useState<AppTab>("calculator");
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDisclaimerOk(localStorage.getItem(DISCLAIMER_KEY) === "1");
    } catch {
      setDisclaimerOk(false);
    }
    setHistory(loadHistory());
  }, []);

  const acceptDisclaimer = () => {
    try {
      localStorage.setItem(DISCLAIMER_KEY, "1");
    } catch {
      // Private mode / storage blocked — still dismiss for this session
    }
    setDisclaimerOk(true);
  };

  const loadExample = () => {
    const ex = exampleToForm();
    setBiomarkers(ex.biomarkers);
    setContext(ex.context);
    setProvenance(ex.provenance);
    setConfig(EXAMPLE_20260630.config);
    setResult(null);
    setError(null);
  };

  const handleCalculate = useCallback(async () => {
    if (!ready) {
      await createAccount();
      setError("Create your free account to run calculations");
      return;
    }
    if (!canCalc) {
      setError("Not enough $POCK — open My $POCK to subscribe or add credits");
      setAppTab("wallet");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const biomarkerPayload = toBiomarkerPayload(biomarkers);
      const contextPayload = toContextPayload(context);
      const prior_tests = allPriorsFromHistory(history, biomarkerPayload.test_date);
      const request = {
        biomarkers: biomarkerPayload,
        context: contextPayload,
        config,
        prior_tests,
      };
      await debitCalc();
      const res = await calculateBioAge(request);
      setResult(res);
      const updated = saveHistoryEntry(request, res);
      setHistory(updated);
    } catch (e) {
      setResult(null);
      const msg = e instanceof Error ? e.message : "Calculation failed";
      if (msg === "insufficient_pock") {
        setError("Not enough $POCK for this calculation");
        setAppTab("wallet");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [
    biomarkers,
    context,
    config,
    history,
    ready,
    canCalc,
    createAccount,
    debitCalc,
  ]);

  const clearHistory = () => {
    localStorage.removeItem("brok_bioage_history_v1");
    setHistory([]);
  };

  const chronoAge =
    biomarkers.chronological_age === ""
      ? undefined
      : biomarkers.chronological_age;

  const historyLimit = getHistoryLimit(user);
  const historyCapped = Number.isFinite(historyLimit);
  const displayHistory = historyCapped
    ? history.slice(0, historyLimit)
    : history;
  const showHistoryChart =
    displayHistory.length >= 2 ||
    (history.length >= 2 && historyCapped);

  return (
    <>
      {!disclaimerOk && <DisclaimerBanner onAccept={acceptDisclaimer} />}

      <main
        className={`min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto ${
          !disclaimerOk ? "pointer-events-none select-none opacity-40" : ""
        }`}
        aria-hidden={!disclaimerOk}
      >
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Dna className="w-9 h-9 text-neon-cyan" strokeWidth={1.5} />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                BROK <span className="text-neon-cyan">Bio-Age</span>
              </h1>
              <p className="text-sm text-white/45">
                Levine PhenoAge + BROK-adjusted model
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PockHeader onOpenWallet={() => setAppTab("wallet")} />
            <button
              type="button"
              onClick={loadExample}
              className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/55 hover:border-neon-cyan/40 hover:text-neon-cyan transition-colors"
            >
              Load example (20260630)
            </button>
          </div>
        </header>

        {/* App tabs */}
        <div className="flex gap-2 p-1 rounded-xl bg-bg-card border border-white/10 w-fit mb-6">
          <button
            type="button"
            onClick={() => setAppTab("calculator")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              appTab === "calculator"
                ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <Calculator className="w-4 h-4" />
            Calculator
          </button>
          <button
            type="button"
            onClick={() => setAppTab("wallet")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              appTab === "wallet"
                ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <Wallet className="w-4 h-4" />
            My $POCK
          </button>
        </div>

        {appTab === "wallet" ? (
          <WalletPanel />
        ) : (
          <>
            <div className="flex gap-2 p-1 rounded-xl bg-bg-card border border-white/10 w-fit mb-2">
              <button
                type="button"
                onClick={() => setEntryMode("manual")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  entryMode === "manual"
                    ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                <PenLine className="w-4 h-4" />
                Manual entry
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("upload")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  entryMode === "upload"
                    ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload PDF
              </button>
            </div>

            <div className="space-y-6">
              {entryMode === "upload" ? (
                <PdfUpload
                  biomarkers={biomarkers}
                  context={context}
                  provenance={provenance}
                  onApply={(bio, ctx, prov) => {
                    setBiomarkers(bio);
                    setContext(ctx);
                    setProvenance((p) => ({ ...p, ...prov }));
                    setResult(null);
                    setError(null);
                  }}
                  onSwitchToManual={() => setEntryMode("manual")}
                />
              ) : (
                <BiomarkerForm
                  values={biomarkers}
                  provenance={provenance}
                  onChange={(bio, prov) => {
                    setBiomarkers(bio);
                    setProvenance(prov);
                  }}
                />
              )}
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
                  onClick={handleCalculate}
                  disabled={loading}
                  className="inline-flex flex-col items-center justify-center gap-0.5 px-6 py-3 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan font-medium text-sm hover:bg-neon-cyan/25 disabled:opacity-50 transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Calculator className="w-4 h-4" />
                    )}
                    Calculate biological age
                  </span>
                  {ready && user && (
                    <span className="text-[10px] text-white/40 font-normal">
                      {user.subscription_tier === "pock_og" ||
                      user.subscription_active
                        ? `1 $POCK · ${user.included_pock_remaining} included left`
                        : "1 $POCK per calculation"}
                    </span>
                  )}
                </button>
                {error && (
                  <p className="text-sm text-red-400/90 flex items-center gap-2">
                    <Activity className="w-4 h-4 shrink-0" />
                    {error}
                  </p>
                )}
              </div>

              {ready && !historyUnlimited && <UpgradeCard />}

              {result && chronoAge !== undefined && (
                <ResultsPanel
                  result={result}
                  chronologicalAge={chronoAge}
                />
              )}

              <HistoricalEntryPanel
                history={history}
                onHistoryChange={setHistory}
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-white/35">
                  {history.length} test{history.length !== 1 ? "s" : ""} in history
                </span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-xs text-white/35 hover:text-red-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear history
                  </button>
                )}
              </div>

              {(showHistoryChart || history.length >= 1) && (
                <TrendDashboard
                  history={displayHistory}
                  historyLimited={
                    historyCapped && history.length > historyLimit
                  }
                  maxFree={historyLimit}
                />
              )}

              {historyCapped && history.length > historyLimit && (
                <p className="text-xs text-white/40 text-center">
                  Subscribe for full history &amp; monthly included $POCK in{" "}
                  <button
                    type="button"
                    onClick={() => setAppTab("wallet")}
                    className="text-neon-cyan hover:underline"
                  >
                    My $POCK
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}