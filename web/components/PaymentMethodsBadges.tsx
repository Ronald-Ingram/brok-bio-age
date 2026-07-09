"use client";

import { Building2, CreditCard, Smartphone } from "lucide-react";

export function PaymentMethodsBadges({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 ${
        compact ? "text-[10px]" : "text-xs"
      } text-white/40`}
    >
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
        <CreditCard className="w-3 h-3 text-neon-cyan/70" />
        Card
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
        <Smartphone className="w-3 h-3 text-neon-cyan/70" />
        Apple / Google Pay
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
        <Building2 className="w-3 h-3 text-neon-cyan/70" />
        US bank (ACH)
      </span>
      <span className="text-white/30">via Stripe</span>
    </div>
  );
}