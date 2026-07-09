"use client";

import type { PaceMetrics } from "@/lib/types";
import { Gauge, TrendingDown, TrendingUp } from "lucide-react";

interface PaceCardProps {
  pace: PaceMetrics;
}

export function PaceCard({ pace }: PaceCardProps) {
  const ratio = pace.pace_ratio_brok;
  const decel = pace.deceleration_years_brok ?? 0;
  const improving = ratio != null && ratio < 1;
  const pacePct = ratio != null ? Math.min(ratio * 100, 200) : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gauge className="w-4 h-4 text-neon-cyan" />
        <h3 className="text-sm font-medium">Pace of aging</h3>
        {pace.prior_test_date && (
          <span className="text-xs text-white/40 ml-auto">
            since {pace.prior_test_date}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-white/40 text-xs">Calendar elapsed</p>
          <p className="text-lg font-semibold tabular-nums">
            {pace.chrono_elapsed_years?.toFixed(1) ?? "—"} yr
          </p>
        </div>
        <div>
          <p className="text-white/40 text-xs">Δ BROK pheno</p>
          <p className="text-lg font-semibold tabular-nums flex items-center gap-1">
            {(pace.pheno_elapsed_brok ?? 0) > 0 ? (
              <TrendingUp className="w-4 h-4 text-amber-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            )}
            {pace.pheno_elapsed_brok != null
              ? `${pace.pheno_elapsed_brok > 0 ? "+" : ""}${pace.pheno_elapsed_brok.toFixed(2)}`
              : "—"}{" "}
            yr
          </p>
        </div>
      </div>

      {ratio != null && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/50">
            <span>Pace ratio (BROK)</span>
            <span className={improving ? "text-emerald-400" : "text-amber-400"}>
              {ratio.toFixed(2)}× calendar
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                improving ? "bg-emerald-500/70" : "bg-amber-500/70"
              }`}
              style={{ width: `${Math.min(pacePct, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-white/35">
            {improving
              ? "Biological aging slower than calendar time."
              : "Biological aging faster than calendar time."}
          </p>
        </div>
      )}

      {decel !== 0 && (
        <p className="text-sm text-white/65 border-t border-white/5 pt-3">
          Deceleration:{" "}
          <span className={decel > 0 ? "text-emerald-400" : "text-amber-400"}>
            {decel > 0 ? "+" : ""}
            {decel.toFixed(1)} calendar yr
          </span>{" "}
          vs biological drift
        </p>
      )}
    </div>
  );
}