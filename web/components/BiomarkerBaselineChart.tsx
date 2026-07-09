"use client";

import { InfoTip } from "@/components/InfoTip";
import type {
  BiomarkerCompareRow,
  DeviationSignal,
} from "@/lib/baselineBiomarkers";
import { CHART_COPY } from "@/lib/resultsCopy";
import { GLOSSARY } from "@/lib/glossary";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface BiomarkerBaselineChartProps {
  rows: BiomarkerCompareRow[];
}

function signalStyles(signal: DeviationSignal): string {
  switch (signal) {
    case "positive":
      return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
    case "negative":
      return "text-amber-400 border-amber-400/30 bg-amber-400/10";
    default:
      return "text-white/50 border-white/10 bg-white/5";
  }
}

function DeviationBadge({ row }: { row: BiomarkerCompareRow }) {
  const Icon =
    row.deviationPct > 4
      ? ArrowUp
      : row.deviationPct < -4
        ? ArrowDown
        : Minus;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${signalStyles(row.signal)}`}
      title={row.deviationLabel}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {row.deviationLabel}
    </span>
  );
}

export function BiomarkerBaselineChart({ rows }: BiomarkerBaselineChartProps) {
  if (!rows.length) return null;

  const data = rows.map((r) => ({
    name: r.label,
    subject: r.subject,
    baseline: r.baseline,
    unit: r.unit,
    pctOfBaseline: r.pctOfBaseline,
    deviationLabel: r.deviationLabel,
    signal: r.signal,
  }));

  return (
    <div className="w-full space-y-4">
      <div>
        <div className="flex items-center gap-1 mb-1">
          <p className="text-xs uppercase tracking-wide text-white/45">
            {CHART_COPY.biomarkers.title}
          </p>
          <InfoTip entry={GLOSSARY.ReferenceLabs} />
        </div>
        <p className="text-[11px] text-white/30 leading-snug">
          {CHART_COPY.biomarkers.subtitle} Deviation badges reflect Levine
          PhenoAge direction — not medical advice.
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
            barCategoryGap="20%"
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#ffffff10"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: "#ffffff60", fontSize: 11 }}
              axisLine={{ stroke: "#ffffff20" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={88}
              tick={{ fill: "#ffffff80", fontSize: 11 }}
              axisLine={{ stroke: "#ffffff20" }}
            />
            <Tooltip
              contentStyle={{
                background: "#111114",
                border: "1px solid #ffffff20",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string, props) => {
                const payload = props.payload as {
                  unit: string;
                  pctOfBaseline: number;
                  deviationLabel: string;
                };
                const unit = payload.unit;
                const label = name === "subject" ? "Your labs" : "Reference value";
                if (name === "subject") {
                  return [
                    `${value} ${unit} · ${payload.deviationLabel}`,
                    label,
                  ];
                }
                return [`${value} ${unit}`, label];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#ffffff80" }}
              formatter={(value) =>
                value === "subject" ? "Your labs" : "Reference value"
              }
            />
            <Bar
              dataKey="baseline"
              name="baseline"
              fill="#64748b"
              radius={[0, 4, 4, 0]}
              maxBarSize={10}
            />
            <Bar
              dataKey="subject"
              name="subject"
              fill="#00f9ff"
              radius={[0, 4, 4, 0]}
              maxBarSize={10}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <li className="text-[10px] uppercase tracking-wide text-white/35 mb-1">
          Deviation vs reference values
        </li>
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-xs"
          >
            <span className="text-white/70">
              <span className="text-white/90 font-medium">{row.label}</span>
              <span className="text-white/40 ml-2 tabular-nums">
                {row.subject} vs {row.baseline} {row.unit}
              </span>
            </span>
            <DeviationBadge row={row} />
          </li>
        ))}
        <li className="flex flex-wrap gap-3 pt-2 text-[10px] text-white/35 border-t border-white/5">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
            Favorable for pheno age
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400/80" />
            Unfavorable for pheno age
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white/30" />
            Near average / context-dependent
          </span>
        </li>
      </ul>
    </div>
  );
}