import {
  POCK_RETAIL_USD_PER_UNIT,
  type PockUsdTier,
} from "./purchaseConfig";

/** Solana mint from Neobanx / pump.fun listing */
export const POCK_SPL_MINT =
  process.env.POCK_SPL_MINT?.trim() ??
  "76r29NpnRW8PAxpnSnVBFcZPUcukgvno1Kkiysg8pump";

export const POCK_WHITEPAPER_URL =
  process.env.NEXT_PUBLIC_POCK_WHITEPAPER_URL ??
  "https://neobanx.com/POCK_Litepaper_v1.1_Branded.pdf";

export const POCK_PRICE_REFRESH_MS = 15 * 60 * 1000;

/** Typical Stripe card fee (US) — estimate for disclosure only */
export const STRIPE_FEE_RATE = 0.029;
export const STRIPE_FEE_FIXED_USD = 0.3;

export interface PockMarketQuote {
  usdPerPock: number;
  source: "dexscreener" | "retail_anchor";
  asOf: string;
  delayed: boolean;
}

export function estimateStripeFeesUsd(priceUsd: number): number {
  return Math.round((priceUsd * STRIPE_FEE_RATE + STRIPE_FEE_FIXED_USD) * 100) / 100;
}

export function estimatePockFromUsd(usd: number, usdPerPock: number): number {
  if (
    !Number.isFinite(usd) ||
    usd <= 0 ||
    !Number.isFinite(usdPerPock) ||
    usdPerPock <= 0
  ) {
    return 0;
  }
  return Math.max(1, Math.floor(usd / usdPerPock));
}

export function formatEstimatedPock(amount: number): string {
  return amount.toLocaleString();
}

export function packagePurchaseEstimate(
  tier: PockUsdTier,
  marketUsdPerPock?: number
) {
  const grossUsd = tier.priceUsd;
  const marketRate = marketUsdPerPock ?? POCK_RETAIL_USD_PER_UNIT;
  const pockAmount = estimatePockFromUsd(grossUsd, marketRate);
  const estFeesUsd = estimateStripeFeesUsd(grossUsd);
  const netUsd = Math.max(0, grossUsd - estFeesUsd);
  const effectiveUsdPerPock =
    pockAmount > 0
      ? Math.round((grossUsd / pockAmount) * 10000) / 10000
      : marketRate;
  const estMarketValueUsd = Math.round(pockAmount * marketRate * 100) / 100;

  return {
    grossUsd,
    estFeesUsd,
    netUsd,
    effectiveUsdPerPock,
    estMarketValueUsd,
    marketUsdPerPock: marketRate,
    pockAmount,
  };
}

export function balanceUsdValue(
  pockBalance: number,
  usdPerPock: number
): number {
  return Math.round(pockBalance * usdPerPock * 100) / 100;
}

export async function fetchPockMarketQuote(): Promise<PockMarketQuote> {
  const now = new Date().toISOString();
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${POCK_SPL_MINT}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("dexscreener_unavailable");
    const data = (await res.json()) as {
      pairs?: { priceUsd?: string }[];
    };
    const price = parseFloat(data.pairs?.[0]?.priceUsd ?? "");
    if (!Number.isFinite(price) || price <= 0) throw new Error("no_price");
    return {
      usdPerPock: price,
      source: "dexscreener",
      asOf: now,
      delayed: true,
    };
  } catch {
    return {
      usdPerPock: POCK_RETAIL_USD_PER_UNIT,
      source: "retail_anchor",
      asOf: now,
      delayed: true,
    };
  }
}