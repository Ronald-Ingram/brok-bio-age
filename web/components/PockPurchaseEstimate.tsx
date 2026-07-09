"use client";

import { PockAssetDisclaimer } from "@/components/PockAssetDisclaimer";
import { PockPricingDisclosure } from "@/components/PockPricingDisclosure";
import { packagePurchaseEstimate } from "@/lib/pockPrice";
import { formatUsd, type PockUsdTier } from "@/lib/purchaseConfig";
import { useEffect, useState } from "react";

interface PockPurchaseEstimateProps {
  tier: PockUsdTier;
  customUsd?: number;
  compact?: boolean;
}

export function PockPurchaseEstimate({
  tier,
  customUsd,
  compact = false,
}: PockPurchaseEstimateProps) {
  const [marketUsd, setMarketUsd] = useState<number | undefined>();

  useEffect(() => {
    fetch("/api/pock/price")
      .then((r) => r.json())
      .then((d: { usdPerPock?: number }) => {
        if (d.usdPerPock) setMarketUsd(d.usdPerPock);
      })
      .catch(() => null);
  }, []);

  const grossUsd = customUsd ?? tier.priceUsd;
  const est = packagePurchaseEstimate(
    { ...tier, priceUsd: grossUsd, priceCents: Math.round(grossUsd * 100) },
    marketUsd
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-white/45 leading-relaxed">
          Est. ~{est.pockAmount.toLocaleString()} $POCK at{" "}
          {formatUsd(est.marketUsdPerPock)}/token · Stripe fees ~{" "}
          {formatUsd(est.estFeesUsd)} (not deducted from $POCK received).
        </p>
        <PockPricingDisclosure compact showOnChainCta />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-3 space-y-2 text-xs text-white/55">
      <p className="font-medium text-white/75">Purchase estimate</p>
      <ul className="space-y-1">
        <li>
          You pay: <span className="text-white/85">{formatUsd(est.grossUsd)}</span>{" "}
          → est. receive{" "}
          <span className="text-neon-cyan">
            ~{est.pockAmount.toLocaleString()} $POCK
          </span>
        </li>
        <li>
          Quote: {formatUsd(est.marketUsdPerPock)}/$POCK (delayed · locked when
          you start checkout)
        </li>
        <li>
          Est. Stripe fees: ~{formatUsd(est.estFeesUsd)} — you still receive the
          full estimated $POCK quantity
        </li>
      </ul>
      <PockPricingDisclosure compact />
      <PockAssetDisclaimer compact />
    </div>
  );
}