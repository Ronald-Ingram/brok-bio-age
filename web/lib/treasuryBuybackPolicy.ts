/** Neobanx treasury buyback — aligns with financial model Assumptions B71 (20%). */

export const NEOBANX_LEGAL_NAME = "Neobanx Software, Inc.";

/** Gross revenue share reserved for on-chain $POCK treasury buybacks */
export const POCK_BUYBACK_PCT = 0.2;

export type TreasuryProductLine =
  | "brok_pock_topup"
  | "brok_subscription"
  | "iem"
  | "inneagram"
  | "other_neobanx_service";

export const TREASURY_PRODUCT_LINES: Record<
  TreasuryProductLine,
  { label: string; buybackEligible: boolean }
> = {
  brok_pock_topup: {
    label: "Genius Wallet $POCK top-up",
    buybackEligible: true,
  },
  brok_subscription: {
    label: "BROK subscription (Essential / Pro)",
    buybackEligible: true,
  },
  iem: {
    label: "IEM evaluation / scorecard",
    buybackEligible: true,
  },
  inneagram: {
    label: "Ingram Inneagram testing",
    buybackEligible: true,
  },
  other_neobanx_service: {
    label: "Other Neobanx Software service",
    buybackEligible: true,
  },
};

export function buybackUsdCentsFromGross(grossUsdCents: number): number {
  if (!Number.isFinite(grossUsdCents) || grossUsdCents <= 0) return 0;
  return Math.round(grossUsdCents * POCK_BUYBACK_PCT);
}

export const TREASURY_BUYBACK_DISCLOSURE =
  `${Math.round(POCK_BUYBACK_PCT * 100)}% of Neobanx Software gross service revenue is reserved for treasury $POCK buybacks per corporate policy — supporting token liquidity without diluting supply.`;