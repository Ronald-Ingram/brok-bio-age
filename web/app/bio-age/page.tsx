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
import {
  applySnapshotToForm,
  importHistoricalSnapshots,
} from "@/lib/historicalImport";
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
  isDisclaimerAccepted,
  markDisclaimerAccepted,
} from "@/lib/disclaimer";
import { canUseFreeReport, markFreeReportUsed } from "@/lib/freeReport";
import {
  type BioAgeHistoryEntry,
  loadHistory,
  allPriorsFromHistory,
  saveHistoryEntry,
  clearHistory,
} from "@/lib/storage";
import type {
  CalculateRequest,
  CalculateResponse,
  ModelConfig,
  ParsePdfResponse,
} from "@/lib/types";
import {
  Activity,
  Calculator,
  Dna,
  Loader2,
  PenLine,
  Trash2,
  Upload,
  Wallet,
  Bot,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type EntryMode = "manual" | "upload";
type AppTab = "calculator" | "wallet";

export default function HomePage() {
  const {
    ready,
    canCalc,
    debitCalc,
    createAccount,
    historyUnlimited,
    user,
  } = usePock();
  const [disclaimerOk, setDisclaimerOk] = useState(isDisclaimerAccepted);
  const [history, setHistory] = useState<BioAgeHistoryEntry[]>([]);
  const [biomarkers, setBiomarkers] =
    useState<FormBiomarkerInput>(EMPTY_BIOMARKERS);
  const [context, setContext] = useState<FormContextFlags>(EMPTY_CONTEXT);
  const [provenance, setProvenance] = useState<FieldProvenance>({});
  const [config, setConfig] = useState<ModelConfig>(EXAMPLE_20260630.config);
  const [entryMode, setEntryMode] = useState<EntryMode>("manual");
  const [appTab, setAppTab] = useState<AppTab>("calculator");
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [lastRequest, setLastRequest] = useState<CalculateRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisclaimerOk(isDisclaimerAccepted());
    setHistory(loadHistory());
    const params = new URLSearchParams(window.location.search);
    if (params.get("wallet") === "1") {
      setAppTab("wallet");
    }
  }, []);

  const acceptDisclaimer = () => {
    markDisclaimerAccepted();
    window.location.reload();
  };

  const loadExample = () => {
    const ex = exampleToForm();
    setBiomarkers(ex.biomarkers);
    setContext(ex.context);
    setProvenance(ex.provenance);
    setConfig(EXAMPLE_20260630.config);
    setResult(null);
    setLastRequest(null);
    setError(null);
  };

  const handleCalculate = useCallback(async () => {
    if (!ready) {
      await createAccount();
      setError("Create your free account to run calculations");
      return;
    }
    const useFreeReport = canUseFreeReport(user);

    if (!useFreeReport && !canCalc) {
      setError("Not enough $POCK — open Genius Wallet to subscribe or add credits");
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
      if (!useFreeReport) {
        await debitCalc();
      }
      const res = await calculateBioAge(request);
      setResult(res);
      setLastRequest(request);
      if (useFreeReport) {
        markFreeReportUsed();
      } else if (historyUnlimited || history.length < 2) {
        const updated = saveHistoryEntry(request, res);
        setHistory(updated);
      }
    } catch (e) {
      setResult(null);
      setLastRequest(null);
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
    user,
    historyUnlimited,
    history.length,
  ]);

  const handleClearHistory = () => {
    if (
      history.length > 0 &&
      !window.confirm(
        `Clear all ${history.length} saved historical test${history.length !== 1 ? "s" : ""}? This cannot be undone.`
      )
    ) {
      return;
    }
    clearHistory();
    setHistory([]);
    setResult(null);
    setLastRequest(null);
  };

  const handleImportHistorical = useCallback(
    async (parseResult: ParsePdfResponse) => {
      const snapshots = parseResult.historical_snapshots ?? [];
      if (snapshots.length < 2) {
        throw new Error("No multi-year historical tests in this PDF");
      }
      if (!ready) {
        await createAccount();
        throw new Error("Create your free account to import historical tests");
      }

      const contextPayload = toContextPayload(context);
      const { history: updated, imported, latest } =
        await importHistoricalSnapshots({
          snapshots,
          config,
          context: contextPayload,
          history,
          debitCalc,
        });

      setHistory(updated);
      const merged = applySnapshotToForm(latest, biomarkers, context);
      setBiomarkers(merged.biomarkers);
      setContext(merged.context);
      setProvenance(merged.provenance);
      setResult(null);
      setLastRequest(null);
      setError(null);
      setEntryMode("manual");
    },
    [
      ready,
      createAccount,
      context,
      config,
      history,
      debitCalc,
      biomarkers,
    ]
  );

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
        id="brok-app-main"
        hidden={!disclaimerOk || undefined}
        className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto"
      >
        <header className="bio-app-header mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0 text-white/40 hover:text-neon-cyan transition-colors">
              <Dna className="w-9 h-9 text-neon-cyan" strokeWidth={1.5} />
            </Link>
            <div>
              <h1 className="bio-app-title text-2xl font-semibold tracking-tight">
                BROK <span className="bio-accent text-neon-cyan">Bio-Age</span>
              </h1>
              <p className="bio-app-subtitle text-sm text-white/45">
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
        <div className="bio-tabs flex gap-2 p-1 rounded-xl bg-bg-card border border-white/10 w-fit mb-6">
          <button
            type="button"
            onClick={() => setAppTab("calculator")}
            className={`bio-tab inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              appTab === "calculator"
                ? "bio-tab--active bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <Calculator className="w-4 h-4" />
            Calculator
          </button>
          <button
            type="button"
            onClick={() => setAppTab("wallet")}
            className={`bio-tab inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              appTab === "wallet"
                ? "bio-tab--active bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Genius Wallet
          </button>
          <Link
            href="/chat"
            className="bio-tab inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors text-white/50 hover:text-neon-cyan border border-transparent hover:border-neon-cyan/20"
          >
            <Bot className="w-4 h-4" />
            BROK Chat
          </Link>
        </div>

        {appTab === "wallet" ? (
          <WalletPanel variant="genius" hideHeader />
        ) : (
          <>
            <div className="bio-tabs flex gap-2 p-1 rounded-xl bg-bg-card border border-white/10 w-fit mb-2">
              <button
                type="button"
                onClick={() => setEntryMode("manual")}
                className={`bio-tab inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  entryMode === "manual"
                    ? "bio-tab--active bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                <PenLine className="w-4 h-4" />
                Manual entry
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("upload")}
                className={`bio-tab inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  entryMode === "upload"
                    ? "bio-tab--active bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload PDF
              </button>
            </div>

            <div className="bio-stack-lg space-y-6">
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
                    setLastRequest(null);
                    setError(null);
                  }}
                  onSwitchToManual={() => setEntryMode("manual")}
                  onImportHistorical={handleImportHistorical}
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
                  className="bio-btn-primary inline-flex flex-col items-center justify-center gap-0.5 px-6 py-3 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan font-medium text-sm hover:bg-neon-cyan/25 disabled:opacity-50 transition-colors"
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
                      {canUseFreeReport(user)
                        ? "1st report free · not saved to history"
                        : user.subscription_tier === "pock_og" ||
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

              {result && chronoAge !== undefined && lastRequest && (
                <ResultsPanel
                  result={result}
                  chronologicalAge={chronoAge}
                  biomarkers={lastRequest.biomarkers}
                  config={lastRequest.config}
                  context={lastRequest.context}
                />
              )}

              <HistoricalEntryPanel
                history={history}
                onHistoryChange={setHistory}
                onClearHistory={handleClearHistory}
              />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-xs text-white/35">
                  {history.length} saved test{history.length !== 1 ? "s" : ""} in
                  history
                  {!historyUnlimited && history.length > 0 && " (free tier preview)"}
                </span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-400/30 text-red-400/90 text-xs font-medium hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear historical tests
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
                    Genius Wallet
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