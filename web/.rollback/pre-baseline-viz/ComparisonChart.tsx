"use client";

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
}

export function ComparisonChart({
  result,
  chronologicalAge,
}: ComparisonChartProps) {
  const data = [
    {
      name: "Chrono",
      age: chronologicalAge,
      fill: "#6b7280",
    },
    {
      name: "Levine",
      age: result.standard.pheno_age,
      fill: "#94a3b8",
    },
    {
      name: "BROK",
      age: result.brok.pheno_age,
      fill: "#00f9ff",
    },
  ];

  return (
    <div className="h-56 w-full">
      <p className="text-xs uppercase tracking-wide text-white/45 mb-3">
        Age comparison
      </p>
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
            formatter={(value: number) => [`${value.toFixed(1)} yr`, "PhenoAge"]}
          />
          <Bar dataKey="age" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}