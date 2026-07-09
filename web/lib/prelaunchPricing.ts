/**
 * Prelaunch MVP pricing — Jul 2026
 * Usage rates calibrated so voice + avatar blocks average ~80% gross margin
 * (Cartesia ~$0.05/min voice + LiveAvatar ~$0.15/min → ~$0.20/min blended cost;
 *  retail blocks priced at ~$1.00/min equivalent in $POCK).
 */

import { METER_RATES, SUBSCRIPTION_TIERS } from "./subscriptionConfig";

export const PRELAUNCH_LABEL = "Prelaunch MVP pricing";

/** Strikethrough anchor prices before launch discount */
export const PRELAUNCH_STRIKETHROUGH = {
  essential: 29,
  premium: 79,
} as const;

export const USAGE_PRICING = {
  voiceBlockUsd: 0.4,
  avatarBlockUsd: 1.0,
  voiceBlockPock: METER_RATES.voiceBlockPock,
  avatarBlockPock: METER_RATES.avatarBlockPock,
  blockDurationSec: 10,
  marginTargetPct: 80,
} as const;

export const PRELAUNCH_TIERS = SUBSCRIPTION_TIERS.map((tier) => ({
  ...tier,
  strikethroughUsd:
    PRELAUNCH_STRIKETHROUGH[tier.id as keyof typeof PRELAUNCH_STRIKETHROUGH],
  savingsPct: Math.round(
    (1 -
      tier.priceUsd /
        PRELAUNCH_STRIKETHROUGH[
          tier.id as keyof typeof PRELAUNCH_STRIKETHROUGH
        ]) *
      100
  ),
}));