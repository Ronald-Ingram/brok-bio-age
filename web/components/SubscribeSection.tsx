"use client";

import { usePock } from "@/context/PockContext";
import { getSupabase } from "@/lib/supabase/client";
import {
  PREMIUM_PRIZE_POOL_POCK,
  tierDisplayName,
  type SubscriptionTierId,
} from "@/lib/subscriptionConfig";
import { PRELAUNCH_LABEL, PRELAUNCH_TIERS } from "@/lib/prelaunchPricing";
import { PaymentMethodsBadges } from "@/components/PaymentMethodsBadges";
import { formatUsd } from "@/lib/purchaseConfig";
import { motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

interface SubscribeSectionProps {
  compact?: boolean;
}

export function SubscribeSection({ compact = false }: SubscribeSectionProps) {
  const { user, ready, refresh } = usePock();
  const [loadingTier, setLoadingTier] = useState<SubscriptionTierId | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  if (!ready || !user) return null;

  const startCheckout = async (tierId: SubscriptionTierId) => {
    setError(null);
    setLoadingTier(tierId);
    try {
      const supabase = getSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error("auth_required");

      const res = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId,
          userId: user.id,
          accessToken: session.access_token,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        if (data.error === "stripe_not_configured") {
          setError("Stripe is not configured yet — add STRIPE_SECRET_KEY to deploy.");
          return;
        }
        throw new Error(data.error ?? "checkout_failed");
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "checkout_failed");
    } finally {
      setLoadingTier(null);
    }
  };

  if (user.subscription_active && user.subscription_tier) {
    return (
      <section
        className={`rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-5 ${
          compact ? "" : "p-6 sm:p-8"
        }`}
      >
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white/90">
              {tierDisplayName(user.subscription_tier)} active
            </h2>
            <p className="text-sm text-white/50 mt-1">
              {user.included_pock_remaining} / {user.included_pock_allowance}{" "}
              included $POCK remaining this month · {user.pock_balance} wallet
            </p>
            {user.subscription_renews_at && (
              <p className="text-xs text-white/35 mt-2">
                Renews{" "}
                {new Date(user.subscription_renews_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="text-xs text-white/40 hover:text-neon-cyan transition-colors"
          >
            Refresh
          </button>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-neon-cyan/20 bg-gradient-to-b from-bg-card to-black/20 space-y-5 ${
        compact ? "p-5" : "p-6 sm:p-8"
      }`}
    >
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-neon-cyan shrink-0 mt-0.5" />
        <div>
          <h2 className={`font-semibold text-white/90 ${compact ? "text-base" : "text-lg"}`}>
            Subscribe — {PRELAUNCH_LABEL}
          </h2>
          <p className="text-sm text-white/45 mt-1">
            Charged today, then monthly (~every 30 days). Each plan includes a
            monthly $POCK usage allowance that spends first; when it runs out,
            extra usage debits your wallet. Voice and avatar meter only while
            active — static mode is free. Pay with card, Google Pay, or Apple Pay.
          </p>
          <div className="mt-3">
            <PaymentMethodsBadges compact />
          </div>
        </div>
      </div>

      <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
        {PRELAUNCH_TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`relative rounded-xl border p-5 flex flex-col gap-4 ${
              tier.popular
                ? "border-neon-cyan/40 bg-neon-cyan/5"
                : "border-white/10 bg-black/20"
            }`}
          >
            {tier.popular && (
              <span className="absolute -top-2.5 right-4 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                Popular
              </span>
            )}
            <div>
              <h3 className="text-sm font-medium text-white/85">{tier.name}</h3>
              <div className="flex items-baseline gap-2 flex-wrap mt-1">
                <span className="text-sm text-white/35 line-through">
                  ${tier.strikethroughUsd}/mo
                </span>
                <p className="text-2xl font-semibold tabular-nums text-neon-cyan">
                  {formatUsd(tier.priceUsd)}
                  <span className="text-sm text-white/40 font-normal">/mo</span>
                </p>
              </div>
              <p className="text-[10px] text-amber-300/85 font-medium mt-1">
                {PRELAUNCH_LABEL}
              </p>
              <p className="text-xs text-white/45 mt-1">{tier.tagline}</p>
            </div>
            <ul className="space-y-1.5 text-xs text-white/55 flex-1">
              {tier.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  {h}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={loadingTier !== null}
              onClick={() => startCheckout(tier.id)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 disabled:opacity-50 transition-colors"
            >
              {loadingTier === tier.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `Subscribe · ${formatUsd(tier.priceUsd)}/mo`
              )}
            </button>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-white/40 leading-relaxed border-t border-white/5 pt-4">
        <span className="text-white/55">Billing:</span> First charge today when
        you subscribe. Stripe renews monthly until you cancel — typically the
        same calendar day each month (approximately every 30 days). Cancel
        anytime from your Stripe receipt or contact support.
      </p>

      <p className="text-[11px] text-white/35 leading-relaxed">
        Pro includes unlimited BROK access, Ingram Genius Protocol, education,
        coaching, strategic advice, and saved historical reports. Pro members are
        eligible for the {PREMIUM_PRIZE_POOL_POCK.toLocaleString()} $POCK prize
        for the largest verified chronological − BROK bio-age delta; winners may be
        required to provide notarized or third-party validated labs. Names and
        rankings may be published and used promotionally.
      </p>

      {error && (
        <p className="text-xs text-amber-400/90 border border-amber-400/20 rounded-lg px-3 py-2 bg-amber-400/5">
          {error}
        </p>
      )}
    </motion.section>
  );
}