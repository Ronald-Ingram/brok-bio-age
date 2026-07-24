"use client";

import { usePockMarketQuote } from "@/hooks/usePockMarketQuote";
import {
  formatUsd,
  pockToUsd,
  usdToPock,
} from "@/lib/purchaseConfig";
import { ArrowLeftRight, Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

type Mode = "pock_to_usd" | "usd_to_pock";

/**
 * Live $POCK ↔ USD calculator using the same quote as Genius Wallet ticker.
 */
export function PockUsdConverter({
  compact = false,
  defaultPock,
}: {
  compact?: boolean;
  /** Prefill $POCK amount (e.g. wallet balance). */
  defaultPock?: number;
}) {
  const { usdPerPock, loading, refresh, isMarket, quote } = usePockMarketQuote();
  const [mode, setMode] = useState<Mode>("pock_to_usd");
  const [pockIn, setPockIn] = useState(
    defaultPock != null && defaultPock > 0 ? String(defaultPock) : "100"
  );
  const [usdIn, setUsdIn] = useState("20");

  const pockNum = Number(pockIn.replace(/,/g, ""));
  const usdNum = Number(usdIn.replace(/,/g, ""));

  const result = useMemo(() => {
    if (!Number.isFinite(usdPerPock) || usdPerPock <= 0) return null;
    if (mode === "pock_to_usd") {
      if (!Number.isFinite(pockNum) || pockNum < 0) return null;
      const usd = pockToUsd(pockNum, usdPerPock);
      return {
        primary: formatUsd(usd),
        secondary: `${pockNum.toLocaleString(undefined, { maximumFractionDigits: 6 })} $POCK`,
        label: "≈ USD",
      };
    }
    if (!Number.isFinite(usdNum) || usdNum < 0) return null;
    const pock = usdToPock(usdNum, usdPerPock);
    // usdToPock floors for purchase packs; for display use precise ratio
    const precise = usdPerPock > 0 ? usdNum / usdPerPock : 0;
    return {
      primary: `${precise.toLocaleString(undefined, { maximumFractionDigits: 4 })} $POCK`,
      secondary: formatUsd(usdNum),
      label: "≈ $POCK",
      packHint:
        pock !== Math.floor(precise)
          ? ` (pack floor for checkout: ${pock.toLocaleString()} $POCK)`
          : "",
    };
  }, [mode, pockNum, usdNum, usdPerPock]);

  const flip = () => {
    setMode((m) => (m === "pock_to_usd" ? "usd_to_pock" : "pock_to_usd"));
  };

  return (
    <section
      className={`rounded-2xl border border-neon-cyan/25 bg-gradient-to-b from-neon-cyan/8 to-black/30 ${
        compact ? "p-3 space-y-2" : "p-4 sm:p-5 space-y-3"
      }`}
      aria-label="$POCK to USD converter"
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-neon-cyan/80">
            Converter
          </p>
          <h3 className="text-sm sm:text-base font-semibold text-white/90">
            $POCK ↔ USD
          </h3>
          <p className="text-[11px] text-white/40 mt-0.5">
            Live quote{" "}
            <span className="text-neon-cyan/90 tabular-nums">
              {formatUsd(usdPerPock)}
            </span>
            /$POCK · {isMarket ? "market" : "reference"}
            {quote?.asOf
              ? ` · ${new Date(quote.asOf).toLocaleTimeString()}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-1 text-[11px] text-white/45 hover:text-neon-cyan px-2 py-1 rounded-lg border border-white/10"
          aria-label="Refresh live quote"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        {mode === "pock_to_usd" ? (
          <label className="flex-1 block text-[11px] text-white/45">
            $POCK amount
            <input
              type="text"
              inputMode="decimal"
              value={pockIn}
              onChange={(e) => setPockIn(e.target.value)}
              className="mt-1 w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2.5 text-base text-white/90 tabular-nums outline-none focus:border-neon-cyan/40"
              placeholder="e.g. 1000"
            />
          </label>
        ) : (
          <label className="flex-1 block text-[11px] text-white/45">
            USD amount
            <input
              type="text"
              inputMode="decimal"
              value={usdIn}
              onChange={(e) => setUsdIn(e.target.value)}
              className="mt-1 w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2.5 text-base text-white/90 tabular-nums outline-none focus:border-neon-cyan/40"
              placeholder="e.g. 50"
            />
          </label>
        )}

        <button
          type="button"
          onClick={flip}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/15 text-xs text-white/70 hover:border-neon-cyan/40 hover:text-neon-cyan"
          title="Swap direction"
        >
          <ArrowLeftRight className="w-4 h-4" />
          {mode === "pock_to_usd" ? "→ USD" : "→ $POCK"}
        </button>

        <div className="flex-1 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 min-h-[3.25rem]">
          <p className="text-[10px] uppercase tracking-wider text-emerald-200/70">
            {result?.label ?? "Result"}
          </p>
          <p className="text-lg font-semibold tabular-nums text-emerald-100 leading-tight">
            {result?.primary ?? "—"}
          </p>
          {result?.secondary && (
            <p className="text-[11px] text-white/40 mt-0.5">
              from {result.secondary}
              {"packHint" in result ? result.packHint : ""}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(mode === "pock_to_usd"
          ? [100, 1000, 10000, 50000]
          : [10, 50, 100, 500]
        ).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() =>
              mode === "pock_to_usd"
                ? setPockIn(String(n))
                : setUsdIn(String(n))
            }
            className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 text-white/50 hover:border-neon-cyan/35 hover:text-neon-cyan"
          >
            {mode === "pock_to_usd" ? `${n.toLocaleString()} $POCK` : `$${n}`}
          </button>
        ))}
        {defaultPock != null && defaultPock > 0 && mode === "pock_to_usd" && (
          <button
            type="button"
            onClick={() => setPockIn(String(defaultPock))}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-neon-cyan/30 text-neon-cyan/90 hover:bg-neon-cyan/10"
          >
            My balance ({defaultPock.toLocaleString()})
          </button>
        )}
      </div>

      <p className="text-[10px] text-white/30 leading-snug">
        Estimate only — live market rate when available. Not a dollar deposit;
        USD display moves with $POCK. Not financial advice.
      </p>
    </section>
  );
}
