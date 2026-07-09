"use client";

import { BiomarkerTrendChart } from "@/components/BiomarkerTrendChart";
import { HistoryChart } from "@/components/HistoryChart";
import type { BioAgeHistoryEntry } from "@/lib/storage";
import { Activity, LineChart } from "lucide-react";

interface TrendDashboardProps {
  history: BioAgeHistoryEntry[];
  historyLimited?: boolean;
  maxFree?: number;
}

export function TrendDashboard({
  history,
  historyLimited = false,
  maxFree = 2,
}: TrendDashboardProps) {
  if (history.length < 2) {
    return (
      <section className="rounded-2xl border border-dashed border-white/10 bg-bg-card/50 p-8 text-center">
        <LineChart className="w-8 h-8 text-white/25 mx-auto mb-3" />
        <p className="text-sm text-white/50">
          Add at least <strong className="text-white/70">2 historical tests</strong>{" "}
          to unlock bio-age and biomarker trend lines.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-bg-card p-6 space-y-8">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-neon-cyan" />
        <h2 className="text-sm font-medium text-white/70">
          Trends &amp; history
          {historyLimited && (
            <span className="text-white/35 font-normal ml-2">
              (latest {maxFree} tests)
            </span>
          )}
        </h2>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wide text-white/45">
          Biological age over time
        </h3>
        <HistoryChart history={history} />
      </div>

      <div className="space-y-3 border-t border-white/5 pt-6">
        <h3 className="text-xs uppercase tracking-wide text-white/45">
          Key biomarkers over time
        </h3>
        <BiomarkerTrendChart history={history} />
      </div>
    </section>
  );
}