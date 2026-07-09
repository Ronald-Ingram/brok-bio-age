"use client";

import type { CalculateResponse } from "@/lib/types";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { ComparisonChart } from "./ComparisonChart";
import { PaceCard } from "./PaceCard";
import { SensitivityChart } from "./SensitivityChart";

interface ResultsPanelProps {
  result: CalculateResponse;
  chronologicalAge: number;
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

export function ResultsPanel({ result, chronologicalAge }: ResultsPanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-neon-cyan/20 bg-bg-card p-6 space-y-6"
    >
      <h2 className="text-lg font-semibold">Results</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 p-5 space-y-2">
          <p className="text-xs uppercase tracking-wide text-white/45">
            Standard Levine
          </p>
          <p className="text-4xl font-semibold tabular-nums">
            {result.standard.pheno_age.toFixed(1)}
          </p>
          <p className="text-sm text-white/50">
            Mortality risk {(result.standard.mortality_risk * 100).toFixed(2)}%
          </p>
          <DeltaChip
            label="vs chrono"
            value={result.standard.delta_vs_chronological}
          />
        </div>

        <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 p-5 space-y-2">
          <p className="text-xs uppercase tracking-wide text-neon-cyan/80">
            BROK PhenoAge
          </p>
          <p className="text-4xl font-semibold tabular-nums text-neon-cyan">
            {result.brok.pheno_age.toFixed(1)}
          </p>
          <p className="text-sm text-white/50">
            Mortality risk {(result.brok.mortality_risk * 100).toFixed(2)}%
          </p>
          <div className="flex flex-wrap gap-2">
            <DeltaChip
              label="vs chrono"
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
        <ComparisonChart result={result} chronologicalAge={chronologicalAge} />
        <SensitivityChart sensitivity={result.sensitivity ?? []} />
      </div>

      {result.pace && <PaceCard pace={result.pace} />}

      {result.adjustments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-white/45">
            Adjustments
          </h3>
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