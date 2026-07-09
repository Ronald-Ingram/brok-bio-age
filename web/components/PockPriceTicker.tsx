"use client";

import { PockAssetDisclaimer } from "@/components/PockAssetDisclaimer";
import { formatUsd } from "@/lib/purchaseConfig";
import {
  balanceUsdValue,
  POCK_PRICE_REFRESH_MS,
  type PockMarketQuote,
} from "@/lib/pockPrice";
import { totalSpendablePock } from "@/lib/pockService";
import type { BrokUser } from "@/lib/pockTypes";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PockPriceTickerProps {
  user: BrokUser | null;
}

export function PockPriceTicker({ user }: PockPriceTickerProps) {
  const [quote, setQuote] = useState<PockMarketQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pock/price");
      if (res.ok) {
        const data = (await res.json()) as PockMarketQuote & {
          nextRefreshInSec?: number;
        };
        setQuote(data);
        setLastFetch(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuote();
    const id = setInterval(fetchQuote, POCK_PRICE_REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchQuote]);

  const spendable = user ? totalSpendablePock(user) : 0;
  const usdValue =
    quote && user ? balanceUsdValue(spendable, quote.usdPerPock) : null;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <Activity className="w-3.5 h-3.5 text-neon-cyan shrink-0" />
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap text-[11px] text-white/55 gap-8">
            {[0, 1].map((dup) => (
              <span key={dup} className="inline-flex gap-8 shrink-0">
                <span>
                  $POCK/USD {quote ? formatUsd(quote.usdPerPock) : "—"}{" "}
                  {quote?.source === "dexscreener" ? "· market" : "· reference"}
                </span>
                {user && usdValue != null && (
                  <span>
                    Balance ≈ {formatUsd(usdValue)} USD · {spendable} $POCK
                    spendable
                  </span>
                )}
                <span>Updates every 15 min · delayed quote</span>
                {lastFetch && (
                  <span>Last quote {lastFetch.toLocaleTimeString()}</span>
                )}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={fetchQuote}
          disabled={loading}
          className="shrink-0 p-1 rounded text-white/35 hover:text-neon-cyan transition-colors"
          aria-label="Refresh price"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/35">
            $POCK price
          </p>
          <p className="text-lg font-semibold tabular-nums text-neon-cyan mt-0.5">
            {quote ? formatUsd(quote.usdPerPock) : "—"}
          </p>
          <p className="text-[10px] text-white/30">per token (USD)</p>
        </div>
        {user && (
          <>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/35">
                Wallet balance
              </p>
              <p className="text-lg font-semibold tabular-nums text-white/90 mt-0.5">
                {user.pock_balance}
              </p>
              <p className="text-[10px] text-white/30">$POCK</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/35">
                Est. USD value
              </p>
              <p className="text-lg font-semibold tabular-nums text-emerald-400/90 mt-0.5">
                {usdValue != null ? formatUsd(usdValue) : "—"}
              </p>
              <p className="text-[10px] text-white/30">spendable total</p>
            </div>
          </>
        )}
        <div className="col-span-2 sm:col-span-1 flex items-center">
          <PockAssetDisclaimer compact />
        </div>
      </div>
    </section>
  );
}