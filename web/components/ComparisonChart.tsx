"use client";

import { InfoTip } from "@/components/InfoTip";
import { CHART_COPY } from "@/lib/resultsCopy";
import { GLOSSARY } from "@/lib/glossary";
import type { CalculateResponse } from "@/lib/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ComparisonChartProps {
  result: CalculateResponse;
  chronologicalAge: number;
  baselineStandardAge?: number | null;
}

const BAR_META: Record<
  string,
  { fill: string; glossary?: keyof typeof GLOSSARY }
> = {
  Chrono: { fill: "#6b7280", glossary: "ChronologicalAge" },
  "Ref labs": { fill: "#475569", glossary: "ReferenceLabs" },
  Levine: { fill: "#94a3b8", glossary: "StandardLevine" },
  BROK: { fill: "#00f9ff", glossary: "BROK" },
};

export function ComparisonChart({
  result,
  chronologicalAge,
  baselineStandardAge,
}: ComparisonChartProps) {
  const referenceDelta =
    baselineStandardAge != null
      ? baselineStandardAge - chronologicalAge
      : null;

  const data = [
    {
      name: "Chrono",
      age: chronologicalAge,
      fill: BAR_META.Chrono.fill,
      note: "Calendar age (input)",
    },
    ...(baselineStandardAge != null
      ? [
          {
            name: "Ref labs",
            age: baselineStandardAge,
            fill: BAR_META["Ref labs"].fill,
            note: `Levine @ placeholder labs (${referenceDelta != null ? `${referenceDelta > 0 ? "+" : ""}${referenceDelta.toFixed(1)} yr vs calendar` : ""})`,
          },
        ]
      : []),
    {
      name: "Levine",
      age: result.standard.pheno_age,
      fill: BAR_META.Levine.fill,
      note: `Your labs (${result.standard.delta_vs_chronological > 0 ? "+" : ""}${result.standard.delta_vs_chronological.toFixed(1)} yr vs calendar)`,
    },
    {
      name: "BROK",
      age: result.brok.pheno_age,
      fill: BAR_META.BROK.fill,
      note: `BROK-adjusted (${result.brok.delta_vs_chronological > 0 ? "+" : ""}${result.brok.delta_vs_chronological.toFixed(1)} yr vs calendar)`,
    },
  ];

  return (
    <div className="h-64 w-full">
      <div className="flex items-center gap-1 mb-1">
        <p className="text-xs uppercase tracking-wide text-white/45">
          {CHART_COPY.ageComparison.title}
        </p>
        <InfoTip entry={GLOSSARY.ReferenceLabs} />
      </div>
      {baselineStandardAge != null && referenceDelta != null && (
        <p className="text-[11px] text-white/35 mb-2 leading-snug">
          Reference labs Levine:{" "}
          <span className="text-white/55 tabular-nums">
            {baselineStandardAge.toFixed(1)} yr
          </span>{" "}
          ({referenceDelta > 0 ? "+" : ""}
          {referenceDelta.toFixed(1)} yr vs calendar age).{" "}
          {CHART_COPY.ageComparison.referenceNote}
        </p>
      )}
      {baselineStandardAge == null && <div className="mb-3" />}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#ffffff80", fontSize: 12 }}
            axisLine={{ stroke: "#ffffff20" }}
          />
          <YAxis
            domain={[
              Math.floor(Math.min(...data.map((d) => d.age)) - 5),
              Math.ceil(Math.max(...data.map((d) => d.age)) + 3),
            ]}
            tick={{ fill: "#ffffff60", fontSize: 11 }}
            axisLine={{ stroke: "#ffffff20" }}
          />
          <Tooltip
            contentStyle={{
              background: "#111114",
              border: "1px solid #ffffff20",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, _name, props) => {
              const payload = props.payload as { note?: string };
              return [
                `${value.toFixed(1)} yr`,
                payload.note ?? "PhenoAge",
              ];
            }}
          />
          <Bar dataKey="age" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-white/40">
        {(["Chrono", "Ref labs", "Levine", "BROK"] as const)
          .filter((key) => key !== "Ref labs" || baselineStandardAge != null)
          .map((key) => {
            const meta = BAR_META[key];
            const glossary = meta.glossary ? GLOSSARY[meta.glossary] : null;
            return (
              <span key={key} className="inline-flex items-center">
                <span
                  className="inline-block w-2 h-2 rounded-sm mr-1.5"
                  style={{ background: meta.fill }}
                />
                {key}
                {glossary && <InfoTip entry={glossary} />}
              </span>
            );
          })}
      </div>
    </div>
  );
}