/** Tiered USD subscriptions — BROK (Jul 2026) */

export type SubscriptionTierId = "essential" | "premium";

export interface SubscriptionTier {
  id: SubscriptionTierId;
  name: string;
  priceUsd: number;
  priceCents: number;
  /** Monthly included $POCK pool (debits first; overage from wallet) */
  includedPockMonthly: number;
  tagline: string;
  highlights: string[];
  popular?: boolean;
}

/** Pro tier bio-age prize pool (marketing / rules copy). */
export const PREMIUM_PRIZE_POOL_POCK = 250_000;

export const FREE_TIER_BENEFITS = {
  freeReportCount: 1,
  freeReportSaved: false,
  historyPreviewEntries: 2,
} as const;

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: "essential",
    name: "Essential",
    priceUsd: 9,
    priceCents: 900,
    includedPockMonthly: 30,
    tagline: "BROK in every pocket — voice, avatar, and saved history",
    highlights: [
      "Includes 30 $POCK/mo (~30 calcs); extra usage debits wallet",
      "Historical results saved to cloud",
      "Full trend charts & biomarker history",
      "Metered voice/avatar only while active — static mode free",
    ],
  },
  {
    id: "premium",
    name: "Pro",
    priceUsd: 49,
    priceCents: 4900,
    includedPockMonthly: 120,
    tagline: "Full BROK + Ingram Genius Protocol + prize eligibility",
    highlights: [
      "Includes 120 $POCK/mo (~120 calcs); extra usage debits wallet",
      "Historical results saved — unlimited cloud sync",
      `Entry: ${PREMIUM_PRIZE_POOL_POCK.toLocaleString()} $POCK prize for largest chrono − BROK bio-age delta (verified labs)`,
      "Unlimited BROK: Ingram Genius Protocol, education, coaching, strategic advice",
      "Metered voice/avatar only while active — static mode free",
    ],
    popular: true,
  },
];

export const SUBSCRIBE_PATH = "/subscribe";

export function getTierById(id: string): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS.find((t) => t.id === id);
}

export function tierDisplayName(tier: string | null | undefined): string {
  if (!tier) return "Free";
  if (tier === "pock_og") return "POCK OG";
  if (tier === "bio_age") return "Bio-Age";
  if (tier === "premium") return "Pro";
  return getTierById(tier as SubscriptionTierId)?.name ?? tier;
}

/** Per-block metering — billed while speaking/animating, not idle */
export const METER_RATES = {
  baseTurnPock: 2,
  voiceBlockPock: 4,
  avatarBlockPock: 10,
  grokSurchargePct: 0.3,
  calcPock: 1,
} as const;

/** Plain-language included pool copy — Stripe + in-app */
export function subscriptionIncludedSummary(tier: SubscriptionTier): string {
  const estCalcs = Math.floor(tier.includedPockMonthly / METER_RATES.calcPock);
  return `Includes ${tier.includedPockMonthly} $POCK of monthly usage (~${estCalcs} calcs). Extra usage debits your wallet. Static mode is free.`;
}

/** Stripe Checkout product description */
export function subscriptionStripeDescription(tier: SubscriptionTier): string {
  return subscriptionIncludedSummary(tier);
}

export function meterBlockCost(options: {
  voiceBlocks?: number;
  avatarBlocks?: number;
  grok?: boolean;
}): number {
  let total: number = METER_RATES.baseTurnPock;
  total += (options.voiceBlocks ?? 0) * METER_RATES.voiceBlockPock;
  total += (options.avatarBlocks ?? 0) * METER_RATES.avatarBlockPock;
  if (options.grok) {
    total = Math.ceil(total * (1 + METER_RATES.grokSurchargePct));
  }
  return total;
}