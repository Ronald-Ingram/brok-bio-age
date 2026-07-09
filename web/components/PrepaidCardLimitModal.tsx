"use client";

import { PREPAID_CARD_LIMIT_MESSAGE } from "@/lib/purchaseConfig";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PrepaidCardLimitModalProps {
  open: boolean;
  amountUsd: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PrepaidCardLimitModal({
  open,
  amountUsd,
  onConfirm,
  onCancel,
}: PrepaidCardLimitModalProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !portalTarget) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prepaid-limit-title"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#111114] p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-white/40 hover:text-white/70 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h2 id="prepaid-limit-title" className="font-semibold text-base">
            Large purchase ({amountUsd.toLocaleString(undefined, { style: "currency", currency: "USD" })})
          </h2>
        </div>

        <p className="text-sm text-white/65 leading-relaxed">
          {PREPAID_CARD_LIMIT_MESSAGE}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 transition-colors"
          >
            Continue to checkout
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg border border-white/15 text-white/55 text-sm hover:border-white/25 transition-colors"
          >
            Adjust amount
          </button>
        </div>
      </div>
    </div>,
    portalTarget
  );
}