import { POCK_WHITEPAPER_URL } from "@/lib/pockPrice";

interface PockAssetDisclaimerProps {
  compact?: boolean;
  className?: string;
}

export function PockAssetDisclaimer({
  compact = false,
  className = "",
}: PockAssetDisclaimerProps) {
  return (
    <p
      className={`text-white/40 leading-relaxed ${compact ? "text-[10px]" : "text-[11px]"} ${className}`}
    >
      $POCK is a digital asset (SEC/CFTC March 17 and April 28, 2026 guidance).
      Values may fluctuate. Quotes track public DEX data (near real-time) — not
      financial advice.{" "}
      <a href="/trust" className="text-neon-cyan/80 hover:text-neon-cyan underline">
        Trust FAQ
      </a>
      {" · "}
      See the{" "}
      <a
        href={POCK_WHITEPAPER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-neon-cyan/80 hover:text-neon-cyan underline underline-offset-2"
      >
        $POCK whitepaper
      </a>{" "}
      on Neobanx.com.
    </p>
  );
}