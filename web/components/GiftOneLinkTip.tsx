"use client";

import { GIFT_ONE_LINK_SENDER_TIP } from "@/lib/geniusWalletCopy";
import { Info } from "lucide-react";
import { useId, useState } from "react";

interface GiftOneLinkTipProps {
  /** Inline icon tooltip vs full callout banner */
  variant?: "tip" | "callout";
  className?: string;
}

export function GiftOneLinkTip({
  variant = "callout",
  className = "",
}: GiftOneLinkTipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  if (variant === "tip") {
    return (
      <span className={`relative inline-flex items-center shrink-0 align-middle ${className}`}>
        <button
          type="button"
          tabIndex={0}
          className="inline-flex text-white/35 hover:text-neon-cyan/80 transition-colors"
          aria-label={GIFT_ONE_LINK_SENDER_TIP}
          aria-describedby={open ? tooltipId : undefined}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
        {open && (
          <span
            id={tooltipId}
            role="tooltip"
            className="absolute left-1/2 bottom-full z-40 mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/15 bg-[#12121a] px-3 py-2 text-left text-[11px] leading-snug text-white/80 shadow-xl"
          >
            <span className="block font-medium text-neon-cyan">One link · one gift</span>
            <span className="block text-white/55 mt-0.5 normal-case font-normal">
              Send this link only to your recipient. Anyone with the link can claim it.
            </span>
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      className={`rounded-lg border border-amber-400/25 bg-amber-400/8 px-3 py-2.5 text-xs text-amber-100/90 leading-relaxed ${className}`}
      role="status"
    >
      <p className="font-medium text-amber-200/95">One link · one gift</p>
      <p className="text-amber-100/80 mt-0.5">{GIFT_ONE_LINK_SENDER_TIP}</p>
    </div>
  );
}