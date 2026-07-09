"use client";

import { CHART_COPY } from "@/lib/resultsCopy";
import type { SensitivityImpact } from "@/lib/types";
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

interface SensitivityChartProps {
  sensitivity: SensitivityImpact[];
}

const LABELS: Record<string, string> = {
  creatinine: "Creatinine",
  rdw: "RDW",
  glucose: "Glucose",
  albumin: "Albumin",
  crp: "CRP",
  age: "Age",
};

export function SensitivityChart({ sensitivity }: SensitivityChartProps) {
  if (!sensitivity.length) return null;

  const data = sensitivity.map((s) => ({
    name: LABELS[s.biomarker] ?? s.biomarker,
    delta: s.delta_pheno_years_standard,
    perturbation: s.perturbation,
  }));

  return (
    <div className="h-64 w-full">
      <p className="text-xs uppercase tracking-wide text-white/45 mb-1">
        Sensitivity (standard Levine)
      </p>
      <p className="text-[11px] text-white/30 mb-3 leading-snug">
        {CHART_COPY.sensitivity.subtitle}
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#ffffff60", fontSize: 11 }}
            axisLine={{ stroke: "#ffffff20" }}
            unit=" yr"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
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
            formatter={(value: number, _name, props) => [
              `${value > 0 ? "+" : ""}${value.toFixed(2)} yr`,
              (props.payload as { perturbation: string }).perturbation,
            ]}
          />
          <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.delta > 0 ? "#f59e0b" : "#34d399"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}