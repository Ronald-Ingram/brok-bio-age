"use client";

import {
  POCK_PRICE_REFRESH_MS,
  type PockMarketQuote,
} from "@/lib/pockPrice";
import { POCK_RETAIL_USD_PER_UNIT } from "@/lib/purchaseConfig";
import { useCallback, useEffect, useState } from "react";

export function usePockMarketQuote() {
  const [quote, setQuote] = useState<PockMarketQuote | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pock/price");
      if (res.ok) {
        setQuote((await res.json()) as PockMarketQuote);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POCK_PRICE_REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const usdPerPock = quote?.usdPerPock ?? POCK_RETAIL_USD_PER_UNIT;

  return {
    quote,
    usdPerPock,
    loading,
    refresh,
    isMarket: quote?.source === "dexscreener",
    quoteLabel: quote?.source === "dexscreener" ? "market" : "reference",
  };
}