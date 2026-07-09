import { DIGITAL_ASSET_DISCLAIMER } from "@/lib/digitalAssetDisclaimer";
import Link from "next/link";

interface DigitalAssetDisclaimerProps {
  className?: string;
  compact?: boolean;
}

export function DigitalAssetDisclaimer({
  className = "",
  compact = false,
}: DigitalAssetDisclaimerProps) {
  return (
    <p
      className={`text-white/40 leading-relaxed ${
        compact ? "text-[10px]" : "text-[11px]"
      } ${className}`}
      role="note"
    >
      {DIGITAL_ASSET_DISCLAIMER.replace(" See Trust FAQ.", "")}{" "}
      <Link href="/trust" className="text-neon-cyan/75 hover:text-neon-cyan underline">
        Trust FAQ
      </Link>
      .
    </p>
  );
}