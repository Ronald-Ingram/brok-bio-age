"use client";

import { PockAssetDisclaimer } from "@/components/PockAssetDisclaimer";
import { PurchaseOption } from "@/components/PurchaseOption";
import { StripeCheckoutModal } from "@/components/StripeCheckoutModal";
import {
  POCK_PURCHASE_PATHS,
  POCK_PURCHASE_VISION,
} from "@/lib/purchaseConfig";
import { motion } from "framer-motion";
import { Bot, CreditCard, Sparkles } from "lucide-react";
import { useState } from "react";

const PATH_ICONS = {
  card: CreditCard,
  crypto: Bot,
} as const;

export function BuyPockSection() {
  const [stripeOpen, setStripeOpen] = useState(false);
  const card = POCK_PURCHASE_PATHS.find((p) => p.id === "card")!;
  const crypto = POCK_PURCHASE_PATHS.find((p) => p.id === "crypto")!;

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-white/10 bg-gradient-to-b from-bg-card to-black/20 p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white/90">
              Buy more $POCK
            </h2>
            <p className="text-sm text-white/45 mt-1">
              Top up your balance — card for humans, crypto for agents.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PurchaseOption
            title={card.title}
            description={card.description}
            audience={card.audience}
            ctaLabel={card.ctaLabel}
            icon={PATH_ICONS.card}
            available={card.available}
            highlight
            onAction={() => setStripeOpen(true)}
          />
          <PurchaseOption
            title={crypto.title}
            description={crypto.description}
            audience={crypto.audience}
            ctaLabel={crypto.ctaLabel}
            icon={PATH_ICONS.crypto}
            available={crypto.available}
            badge={crypto.badge}
          />
        </div>

        <p className="text-xs text-white/35 text-center leading-relaxed border-t border-white/5 pt-5">
          <span className="text-neon-cyan/70">x402 note:</span> Crypto payments
          will become the native machine-to-machine method for BROK agents,
          Neoscore queries, and IEM workflows — no human in the loop.
        </p>

        <PockAssetDisclaimer className="text-center border-t border-white/5 pt-4" />

        <p className="text-[11px] text-center text-white/40 tracking-wide">
          {POCK_PURCHASE_VISION}
        </p>
      </motion.section>

      <StripeCheckoutModal
        open={stripeOpen}
        onClose={() => setStripeOpen(false)}
      />
    </>
  );
}