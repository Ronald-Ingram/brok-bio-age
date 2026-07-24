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

/**
 * Client poll interval for Genius Wallet / buy UI.
 * Server /api/pock/price caches slightly under this (see route) so polls usually hit cache.
 * Keep ≥5s to avoid hammering DexScreener from every open tab.
 */
export const POCK_PRICE_REFRESH_MS = 10_000;

/** Shared server-side quote TTL (ms) — near real-time, not 15-minute delayed. */
export const POCK_PRICE_SERVER_CACHE_MS = 8_000;

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

/** True when the user asks $POCK price, USD value, or convert $POCK ↔ USD. */
export function wantsPockUsdConversion(message: string): boolean {
  const m = message.trim();
  if (!m) return false;
  const hasPock = /\$?\bpock\b/i.test(m);
  if (!hasPock && !/\b(spock)\b/i.test(m)) return false;
  return /\b(price|worth|value|convert|conversion|how\s+much|in\s*usd|to\s*usd|usd|dollars?|exchange|rate|quote|equals?|equivalent|\d[\d,.]*)\b/i.test(
    m
  );
}

/**
 * Knowledge block for BROK chat — live Dex quote + conversion math.
 * Prefer this over generic CoinGecko for $POCK.
 */
export async function buildPockPriceKnowledgeBlock(
  message: string
): Promise<string | null> {
  if (!wantsPockUsdConversion(message)) return null;
  try {
    const quote = await fetchPockMarketQuote();
    const rate = quote.usdPerPock;
    // Extract a numeric amount if present (e.g. "5000 $POCK" or "$50 of POCK")
    const pockAmt =
      message.match(
        /([\d,]+(?:\.\d+)?)\s*(?:\$?\s*)?pock\b/i
      )?.[1] ??
      message.match(
        /\$?\s*pock\s*(?:of|×|x|times)?\s*([\d,]+(?:\.\d+)?)/i
      )?.[1];
    const usdAmt =
      message.match(
        /\$\s*([\d,]+(?:\.\d+)?)\b/
      )?.[1] ??
      message.match(
        /([\d,]+(?:\.\d+)?)\s*(?:usd|dollars?)\b/i
      )?.[1];

    const examples: string[] = [];
    if (pockAmt) {
      const n = Number(pockAmt.replace(/,/g, ""));
      if (Number.isFinite(n) && n >= 0) {
        const usd = Math.round(n * rate * 100) / 100;
        examples.push(
          `Example from user: ${n.toLocaleString()} $POCK ≈ $${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD`
        );
      }
    }
    if (usdAmt) {
      const n = Number(usdAmt.replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0 && rate > 0) {
        const pock = n / rate;
        examples.push(
          `Example from user: $${n.toLocaleString()} USD ≈ ${pock.toLocaleString(undefined, { maximumFractionDigits: 4 })} $POCK`
        );
      }
    }
    // Always give standard anchors
    for (const n of [100, 1000, 10000]) {
      const usd = Math.round(n * rate * 100) / 100;
      examples.push(
        `${n.toLocaleString()} $POCK ≈ $${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD`
      );
    }

    return `LIVE $POCK / USD QUOTE (Genius Wallet source — use these numbers):
• Spot: $${rate} USD per 1 $POCK
• Source class: ${quote.source === "dexscreener" ? "live market (DEX)" : "reference anchor"}
• As of: ${quote.asOf}
• Conversion: USD = $POCK × rate; $POCK = USD / rate
${examples.map((e) => `• ${e}`).join("\n")}

RESPONSE RULES:
- Answer conversion questions with the live rate and the math (show both $POCK and USD).
- Say estimates can move with the market; not a dollar deposit; not financial advice / DYOR.
- Do NOT name DexScreener, CoinGecko, or other vendors. Point users to Genius Wallet converter if useful (brok.neobanx.com/genius-wallet).
- Pronounce $POCK as "Spock" when speaking.`;
  } catch {
    return null;
  }
}

export async function fetchPockMarketQuote(): Promise<PockMarketQuote> {
  const now = new Date().toISOString();
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${POCK_SPL_MINT}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "Neobanx-BROK-GeniusWallet/1.0",
        },
      }
    );
    if (!res.ok) throw new Error("dexscreener_unavailable");
    const data = (await res.json()) as {
      pairs?: {
        priceUsd?: string;
        liquidity?: { usd?: number };
        dexId?: string;
      }[];
    };
    const pairs = [...(data.pairs ?? [])].sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
    );
    const price = parseFloat(pairs[0]?.priceUsd ?? "");
    if (!Number.isFinite(price) || price <= 0) throw new Error("no_price");
    return {
      usdPerPock: price,
      source: "dexscreener",
      asOf: now,
      // Fresh Dex pull — still not a CEX NBBO; copy says near real-time
      delayed: false,
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