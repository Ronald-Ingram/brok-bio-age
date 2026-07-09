"use client";

import { PaymentMethodsBadges } from "@/components/PaymentMethodsBadges";
import { getPockCheckoutUrl, POCK_CHECKOUT_PATH } from "@/lib/purchaseConfig";
import { CreditCard, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface StripeCheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

export function StripeCheckoutModal({ open, onClose }: StripeCheckoutModalProps) {
  const router = useRouter();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const checkoutUrl = getPockCheckoutUrl();

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !portalTarget) return null;

  const goToCheckout = () => {
    onClose();
    if (checkoutUrl.startsWith("http")) {
      window.location.href = checkoutUrl;
    } else {
      router.push(POCK_CHECKOUT_PATH);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stripe-checkout-title"
      onClick={onClose}
    >
      <div
        className="relative z-[201] w-full max-w-md rounded-2xl border border-neon-cyan/25 bg-[#111114] p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/70 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/15 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2
              id="stripe-checkout-title"
              className="text-lg font-semibold text-white/90"
            >
              Top up with Stripe
            </h2>
            <p className="text-xs text-white/45">Secure checkout on Kiron.AI</p>
          </div>
        </div>

        <p className="text-sm text-white/60 leading-relaxed">
          You&apos;ll be redirected to Stripe checkout to buy $POCK with card,
          Google Pay, or Apple Pay. Balance updates automatically after payment
          clears.
        </p>

        <PaymentMethodsBadges compact />

        <ul className="text-xs text-white/45 space-y-1.5">
          <li>· Instant top-up — no wallet setup required</li>
          <li>· Powered by Stripe on Kiron.AI</li>
          <li>· Same account across BROK apps</li>
        </ul>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={goToCheckout}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 transition-colors"
          >
            Continue to checkout
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl border border-white/15 text-white/55 text-sm hover:border-white/25 transition-colors"
          >
            Cancel
          </button>
        </div>

        <p className="text-[10px] text-white/30 text-center break-all">
          {checkoutUrl}
        </p>
      </div>
    </div>,
    portalTarget
  );
}