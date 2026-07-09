"use client";

import { AlertTriangle } from "lucide-react";

interface DisclaimerBannerProps {
  onAccept: () => void;
}

export function DisclaimerBanner({ onAccept }: DisclaimerBannerProps) {
  return (
    <div
      data-disclaimer-overlay
      className="bio-disclaimer-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-6 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div
        className="bio-disclaimer-panel relative w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#111114] p-6 space-y-4 shadow-2xl pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h2 id="disclaimer-title" className="font-semibold text-base">
            Research tool — not medical advice
          </h2>
        </div>
        <p className="text-sm text-white/65 leading-relaxed">
          BROK Bio-Age is for self-tracking and biohacker research only. BROK
          adjustments are heuristic and not clinically validated. Do not use for
          diagnosis or treatment decisions. Consult a physician for health
          decisions.
        </p>
        <button
          type="button"
          data-disclaimer-accept
          onClick={onAccept}
          className="bio-disclaimer-accept w-full py-2.5 rounded-lg bg-[#00f9ff]/15 border border-[#00f9ff]/40 text-[#00f9ff] text-sm font-medium hover:bg-[#00f9ff]/25 active:bg-[#00f9ff]/35 transition-colors cursor-pointer pointer-events-auto disabled:opacity-60"
        >
          I understand — continue
        </button>
      </div>
    </div>
  );
}