/** Shared purchase / top-up config — reusable for Neoscore, IEM, etc. */

/** Retail anchor ~$0.20/POCK per investor model v2.0 (Jul 2026) — fallback quote */
export const POCK_RETAIL_USD_PER_UNIT = 0.2;

export interface PockUsdTier {
  id: string;
  /** USD charged at checkout */
  priceUsd: number;
  priceCents: number;
  label: string;
  popular?: boolean;
}

/** @deprecated use PockUsdTier — kept for imports */
export type PockPackage = PockUsdTier;

/** Fixed USD top-up tiers — $POCK quantity estimated at market price at checkout */
export const POCK_USD_TIERS: PockUsdTier[] = [
  {
    id: "pock-starter",
    priceUsd: 9.99,
    priceCents: 999,
    label: "Starter",
  },
  {
    id: "pock-standard",
    priceUsd: 19.99,
    priceCents: 1999,
    label: "Standard",
    popular: true,
  },
  {
    id: "pock-power",
    priceUsd: 99.99,
    priceCents: 9999,
    label: "Power user",
  },
];

export const POCK_PACKAGES = POCK_USD_TIERS;

export const PREPAID_MIN_USD = 5;

/** Show card-limit advisory popup at or above this USD amount */
export const PREPAID_WARN_USD = 500;

/** Sanity ceiling for API validation (Stripe enforces its own limits) */
export const PREPAID_SANITY_MAX_USD = 250_000;

export const PREPAID_CARD_LIMIT_MESSAGE =
  "Some card and third-party payment service providers may impose limits — e.g. $500, $2,000, and $5,000 are typical thresholds. If your transaction does not succeed at first, try a lower dollar amount below the limit your bank or card issuer applies.";

export {
  POCK_ACH_DELAY_NOTE,
  POCK_CHECKOUT_EXPIRY_MINUTES,
  POCK_INSTANT_CREDIT_NOTE,
  POCK_ONCHAIN_DEX_URL,
  POCK_ONCHAIN_PREFERENCE,
  POCK_QUOTE_DISCLAIMER,
  POCK_VOLATILITY_NOTE,
} from "./pockPricingPolicy";

export const PREPAID_CARD_DISCLAIMER =
  "Enter any USD amount — check your card provider limits. Amounts $500+ show a limit advisory before checkout.";

/** Relative path on this app — deploy at kiron.ai/buy-pock via reverse proxy or env */
export const POCK_CHECKOUT_PATH = "/buy-pock";

export function getPockCheckoutUrl(origin?: string): string {
  if (process.env.NEXT_PUBLIC_POCK_STRIPE_URL) {
    return process.env.NEXT_PUBLIC_POCK_STRIPE_URL;
  }
  const base =
    origin ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return base ? `${base.replace(/\/$/, "")}${POCK_CHECKOUT_PATH}` : POCK_CHECKOUT_PATH;
}

export const POCK_STRIPE_CHECKOUT_URL = getPockCheckoutUrl();

export interface PurchasePathConfig {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  audience: string;
  available: boolean;
  badge?: string;
}

export const POCK_PURCHASE_PATHS: PurchasePathConfig[] = [
  {
    id: "card",
    title: "Buy with Card",
    description:
      "Pay with card, Apple Pay, or Google Pay. $POCK quantity locks at checkout; reserved balance credits immediately when Stripe confirms payment.",
    ctaLabel: "Buy with Card",
    audience: "Humans & normies",
    available: true,
  },
  {
    id: "crypto",
    title: "Buy with Crypto (x402)",
    description:
      "Pay directly with $POCK or USDC using the x402 protocol. Ideal for agents and automated workflows.",
    ctaLabel: "Buy with Crypto (x402)",
    audience: "Agents & power users",
    available: false,
    badge: "Coming soon",
  },
];

export const POCK_PURCHASE_VISION =
  "This powers the future of BROK, Neoscore & IEM subscriptions";

export function formatUsd(price: number): string {
  if (price < 0.01 && price > 0) return `$${price.toFixed(4)}`;
  return price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
}

export function pockToUsd(pock: number, usdPerPock = POCK_RETAIL_USD_PER_UNIT): number {
  return Math.round(pock * usdPerPock * 100) / 100;
}

export function usdToPock(usd: number, usdPerPock = POCK_RETAIL_USD_PER_UNIT): number {
  if (!Number.isFinite(usd) || usd <= 0) return 1;
  return Math.max(1, Math.floor(usd / usdPerPock));
}