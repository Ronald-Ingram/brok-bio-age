/** Stripe Checkout session TTL — limits gap between quote lock and payment */
export const POCK_CHECKOUT_EXPIRY_MINUTES = 30;

/** Pricing model identifier stored on Stripe sessions */
export const POCK_PRICING_MODEL = "locked_at_checkout" as const;

export const POCK_QUOTE_DISCLAIMER =
  "Market quote feed may be delayed (~15 min). Your $POCK quantity is locked when you start checkout — it does not float up or down while Stripe processes payment.";

export const POCK_INSTANT_CREDIT_NOTE =
  "Card, Apple Pay, and Google Pay: reserved $POCK credits to your Genius Wallet immediately when Stripe confirms payment — usually within seconds.";

export const POCK_ACH_DELAY_NOTE =
  "US bank (ACH): $POCK quantity is still locked at checkout, but payment can take days. Credits post when Stripe marks the payment paid — not at checkout click.";

export const POCK_VOLATILITY_NOTE =
  "In volatile markets the delayed quote may differ from live on-chain price at lock time. For immediate market settlement, buy $POCK on Solana (on-chain).";

export const POCK_ONCHAIN_PREFERENCE =
  "Prefer on-chain for live market price and instant settlement";

const POCK_SPL_MINT =
  process.env.POCK_SPL_MINT?.trim() ??
  "76r29NpnRW8PAxpnSnVBFcZPUcukgvno1Kkiysg8pump";

export const POCK_ONCHAIN_DEX_URL =
  process.env.NEXT_PUBLIC_POCK_DEX_URL?.trim() ??
  `https://dexscreener.com/solana/${POCK_SPL_MINT}`;

export function formatLockedPockEstimate(amount: number): string {
  return `~${amount.toLocaleString()}`;
}