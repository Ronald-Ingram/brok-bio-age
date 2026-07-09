"use client";

import { SubscribeSection } from "@/components/SubscribeSection";
import { usePock } from "@/context/PockContext";
import { FREE_TIER_COPY } from "@/lib/freeReport";
import {
  FREE_TIER_BENEFITS,
  PREMIUM_PRIZE_POOL_POCK,
} from "@/lib/subscriptionConfig";
import { PRELAUNCH_LABEL } from "@/lib/prelaunchPricing";
import { MAX_FREE_HISTORY } from "@/lib/pockService";
import { Check, Sparkles } from "lucide-react";

export function UpgradeCard() {
  const { user } = usePock();

  if (!user || user.subscription_active) return null;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-neon-cyan/25 bg-gradient-to-br from-neon-cyan/5 to-transparent p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-neon-cyan shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-white/90">
              Free vs subscribe
            </h2>
            <p className="text-sm text-white/50 mt-1">
              {FREE_TIER_COPY.label}. Paid reports can save up to{" "}
              {MAX_FREE_HISTORY} trend preview entries; subscribers get unlimited
              saved history.
            </p>
          </div>
        </div>

        <ul className="space-y-1.5 text-sm text-white/60">
          {[
            `Free: ${FREE_TIER_BENEFITS.freeReportCount} report, not saved`,
            `Essential — $29 → $9/mo (${PRELAUNCH_LABEL}): historical results saved`,
            `Pro — $79 → $49/mo (${PRELAUNCH_LABEL}): ${PREMIUM_PRIZE_POOL_POCK.toLocaleString()} $POCK prize pool + Ingram Genius Protocol`,
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <SubscribeSection compact />
    </section>
  );
}