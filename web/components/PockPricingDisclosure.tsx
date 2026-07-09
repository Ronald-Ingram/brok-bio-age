import {
  POCK_ACH_DELAY_NOTE,
  POCK_CHECKOUT_EXPIRY_MINUTES,
  POCK_INSTANT_CREDIT_NOTE,
  POCK_ONCHAIN_DEX_URL,
  POCK_ONCHAIN_PREFERENCE,
  POCK_QUOTE_DISCLAIMER,
  POCK_VOLATILITY_NOTE,
} from "@/lib/purchaseConfig";
import { ExternalLink, Zap } from "lucide-react";

interface PockPricingDisclosureProps {
  /** Tighter spacing for inline estimate blocks */
  compact?: boolean;
  /** Show on-chain DEX link prominently */
  showOnChainCta?: boolean;
}

export function PockPricingDisclosure({
  compact = false,
  showOnChainCta = true,
}: PockPricingDisclosureProps) {
  const textSize = compact ? "text-[10px]" : "text-[11px]";
  const gap = compact ? "space-y-1.5" : "space-y-2";

  return (
    <div className={gap}>
      <p
        className={`${textSize} text-amber-400/90 border border-amber-400/15 rounded-lg px-3 py-2.5 bg-amber-400/5 leading-relaxed`}
      >
        {POCK_QUOTE_DISCLAIMER} Checkout sessions expire in{" "}
        {POCK_CHECKOUT_EXPIRY_MINUTES} minutes.
      </p>

      <p
        className={`${textSize} text-emerald-300/85 border border-emerald-400/15 rounded-lg px-3 py-2.5 bg-emerald-400/5 leading-relaxed flex items-start gap-2`}
      >
        <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400/80" />
        <span>{POCK_INSTANT_CREDIT_NOTE}</span>
      </p>

      <p className={`${textSize} text-white/45 leading-relaxed`}>
        {POCK_ACH_DELAY_NOTE}
      </p>

      <p className={`${textSize} text-white/50 leading-relaxed`}>
        {POCK_VOLATILITY_NOTE}
      </p>

      {showOnChainCta && (
        <a
          href={POCK_ONCHAIN_DEX_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 ${textSize} font-medium text-neon-cyan hover:underline`}
        >
          {POCK_ONCHAIN_PREFERENCE}
          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
        </a>
      )}
    </div>
  );
}