"use client";

import type { BioAgeHistoryEntry } from "@/lib/storage";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface HistoryChartProps {
  history: BioAgeHistoryEntry[];
}

export function HistoryChart({ history }: HistoryChartProps) {
  if (history.length < 2) return null;

  const data = [...history]
    .sort((a, b) => a.test_date.localeCompare(b.test_date))
    .map((e) => ({
      date: e.test_date,
      chrono: e.request.biomarkers.chronological_age,
      levine: e.response.standard.pheno_age,
      brok: e.response.brok.pheno_age,
    }));

  return (
    <div className="h-64 w-full">
      <p className="text-xs uppercase tracking-wide text-white/45 mb-3">
        History timeline ({data.length} tests)
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#ffffff60", fontSize: 10 }}
            axisLine={{ stroke: "#ffffff20" }}
          />
          <YAxis
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
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#ffffff90" }} />
          <Line
            type="monotone"
            dataKey="chrono"
            name="Chrono"
            stroke="#6b7280"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="levine"
            name="Levine"
            stroke="#94a3b8"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="brok"
            name="BROK"
            stroke="#00f9ff"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}