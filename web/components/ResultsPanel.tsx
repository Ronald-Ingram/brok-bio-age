"use client";

import { calculateBioAge } from "@/lib/api";
import {
  biomarkerCompareRows,
  buildBaselineBiomarkers,
} from "@/lib/baselineBiomarkers";
import type {
  BiomarkerInput,
  CalculateResponse,
  ContextFlags,
  ModelConfig,
} from "@/lib/types";
import { bioAgeReportHtml } from "@/lib/bioAgeReport";
import { CARD_COPY } from "@/lib/resultsCopy";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Download, Minus, Printer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BiomarkerBaselineChart } from "./BiomarkerBaselineChart";
import { ComparisonChart } from "./ComparisonChart";
import { PaceCard } from "./PaceCard";
import { ResultsGuide } from "./ResultsGuide";
import { SensitivityChart } from "./SensitivityChart";
import { InfoTip } from "./InfoTip";
import { GLOSSARY } from "@/lib/glossary";

interface ResultsPanelProps {
  result: CalculateResponse;
  chronologicalAge: number;
  biomarkers: BiomarkerInput;
  config: ModelConfig;
  context: ContextFlags;
}

function DeltaChip({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const positive = value > 0.05;
  const negative = value < -0.05;
  const Icon = positive ? ArrowUp : negative ? ArrowDown : Minus;
  const color = negative
    ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
    : positive
      ? "text-amber-400 border-amber-400/30 bg-amber-400/10"
      : "text-white/50 border-white/10 bg-white/5";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${color}`}
    >
      <Icon className="w-3 h-3" />
      {label}: {value > 0 ? "+" : ""}
      {value.toFixed(1)} yr
    </span>
  );
}

/** Neutral request: reference labs only, no subject DEXA/T context. */
function baselineReferenceRequest(
  biomarkers: BiomarkerInput,
  config: ModelConfig
) {
  return {
    biomarkers: buildBaselineBiomarkers(biomarkers, config),
    context: { creatine_supplementation: false } satisfies ContextFlags,
    config: {
      age_mode: "standard" as const,
      age_alpha: 1,
      age_beta: 0.5,
      use_hba1c_over_glucose: config.use_hba1c_over_glucose,
    },
    prior_tests: [],
  };
}

export function ResultsPanel({
  result,
  chronologicalAge,
  biomarkers,
  config,
  context,
}: ResultsPanelProps) {
  const [baselineStandardAge, setBaselineStandardAge] = useState<number | null>(
    null
  );

  const compareRows = useMemo(
    () => biomarkerCompareRows(biomarkers, config),
    [biomarkers, config]
  );

  useEffect(() => {
    let cancelled = false;
    calculateBioAge(baselineReferenceRequest(biomarkers, config))
      .then((res) => {
        if (!cancelled) {
          setBaselineStandardAge(res.standard.pheno_age);
        }
      })
      .catch(() => {
        if (!cancelled) setBaselineStandardAge(null);
      });
    return () => {
      cancelled = true;
    };
  }, [biomarkers, config]);

  const reportHtml = useMemo(
    () =>
      bioAgeReportHtml(result, {
        chronologicalAge,
        biomarkers,
        context,
        generated_at: new Date().toLocaleString(),
        test_date: biomarkers.test_date,
      }),
    [result, chronologicalAge, biomarkers, context]
  );

  const downloadReport = useCallback(() => {
    const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BROK-BioAge-${biomarkers.test_date ?? "report"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [reportHtml, biomarkers.test_date]);

  const printReport = useCallback(() => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(reportHtml);
    win.document.close();
    win.focus();
    win.onload = () => win.print();
  }, [reportHtml]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-neon-cyan/20 bg-bg-card p-6 space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">Results</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadReport}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
          >
            <Download className="w-3.5 h-3.5" />
            Download Report
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
      </div>

      <ResultsGuide />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 p-5 space-y-2">
          <div className="flex items-center gap-1">
            <p className="text-xs uppercase tracking-wide text-white/45">
              Standard Levine
            </p>
            <InfoTip entry={GLOSSARY.StandardLevine} />
          </div>
          <p className="text-[11px] text-white/35">{CARD_COPY.standard.subtitle}</p>
          <p className="text-4xl font-semibold tabular-nums">
            {result.standard.pheno_age.toFixed(1)}
          </p>
          <p className="text-sm text-white/50">
            Mortality risk {(result.standard.mortality_risk * 100).toFixed(2)}%
          </p>
          <DeltaChip
            label="vs calendar"
            value={result.standard.delta_vs_chronological}
          />
        </div>

        <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 p-5 space-y-2">
          <div className="flex items-center gap-1">
            <p className="text-xs uppercase tracking-wide text-neon-cyan/80">
              BROK PhenoAge
            </p>
            <InfoTip entry={GLOSSARY.BROK} />
          </div>
          <p className="text-[11px] text-white/35">{CARD_COPY.brok.subtitle}</p>
          <p className="text-4xl font-semibold tabular-nums text-neon-cyan">
            {result.brok.pheno_age.toFixed(1)}
          </p>
          <p className="text-sm text-white/50">
            Mortality risk {(result.brok.mortality_risk * 100).toFixed(2)}%
          </p>
          <div className="flex flex-wrap gap-2">
            <DeltaChip
              label="vs calendar"
              value={result.brok.delta_vs_chronological}
            />
            <DeltaChip
              label="vs standard"
              value={result.delta_brok_vs_standard}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <ComparisonChart
          result={result}
          chronologicalAge={chronologicalAge}
          baselineStandardAge={baselineStandardAge}
        />
        <SensitivityChart sensitivity={result.sensitivity ?? []} />
      </div>

      <BiomarkerBaselineChart rows={compareRows} />

      {result.pace && <PaceCard pace={result.pace} />}

      {result.adjustments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-white/45">
            BROK adjustments
          </h3>
          <p className="text-[11px] text-white/30">
            Each line is a transparent change from standard Levine to BROK
            PhenoAge for this run.
          </p>
          <ul className="space-y-2 text-sm text-white/65">
            {result.adjustments.map((a) => (
              <li
                key={a.field}
                className="rounded-lg border border-white/5 px-3 py-2 bg-black/20"
              >
                <span className="text-neon-cyan font-medium">{a.field}</span>
                {": "}
                {a.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.interpretation && (
        <p className="text-sm leading-relaxed text-white/70 border-l-2 border-neon-cyan/40 pl-4">
          {result.interpretation}
        </p>
      )}

      {result.disclaimers.map((d) => (
        <p key={d} className="text-[11px] text-white/35 leading-relaxed">
          {d}
        </p>
      ))}
    </motion.section>
  );
}