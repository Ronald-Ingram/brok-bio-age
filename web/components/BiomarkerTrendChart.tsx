"use client";

import {
  DEFAULT_TREND_SELECTION,
  TREND_BIOMARKERS,
  type BiomarkerTrendKey,
} from "@/lib/biomarkerTrends";
import type { BioAgeHistoryEntry } from "@/lib/storage";
import { useMemo, useState } from "react";
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

interface BiomarkerTrendChartProps {
  history: BioAgeHistoryEntry[];
}

export function BiomarkerTrendChart({ history }: BiomarkerTrendChartProps) {
  const [selected, setSelected] = useState<string[]>(DEFAULT_TREND_SELECTION);

  const sorted = useMemo(
    () => [...history].sort((a, b) => a.test_date.localeCompare(b.test_date)),
    [history]
  );

  const data = useMemo(() => {
    return sorted.map((e) => {
      const row: Record<string, string | number> = { date: e.test_date };
      for (const bm of TREND_BIOMARKERS) {
        const val = e.request.biomarkers[bm.field];
        if (val !== undefined && val !== null && !Number.isNaN(val)) {
          row[bm.id] = val;
        }
      }
      return row;
    });
  }, [sorted]);

  const activeMarkers = TREND_BIOMARKERS.filter((bm) => selected.includes(bm.id));

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (history.length < 2) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TREND_BIOMARKERS.map((bm) => (
          <button
            key={bm.id}
            type="button"
            onClick={() => toggle(bm.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              selected.includes(bm.id)
                ? "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan"
                : "border-white/10 text-white/40 hover:border-white/20"
            }`}
          >
            {bm.label}
          </button>
        ))}
      </div>

      {activeMarkers.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-8">
          Select at least one biomarker to plot
        </p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
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
                formatter={(value: number, name: string) => {
                  const bm = TREND_BIOMARKERS.find((b) => b.id === name);
                  return [`${value} ${bm?.unit ?? ""}`, bm?.label ?? name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#ffffff90" }}
                formatter={(value) =>
                  TREND_BIOMARKERS.find((b) => b.id === value)?.label ?? value
                }
              />
              {activeMarkers.map((bm: BiomarkerTrendKey) => (
                <Line
                  key={bm.id}
                  type="monotone"
                  dataKey={bm.id}
                  name={bm.id}
                  stroke={bm.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}