"use client";

import { usePock } from "@/context/PockContext";
import { PaymentMethodsBadges } from "@/components/PaymentMethodsBadges";
import { PockAssetDisclaimer } from "@/components/PockAssetDisclaimer";
import { PockPricingDisclosure } from "@/components/PockPricingDisclosure";
import { PrepaidCardLimitModal } from "@/components/PrepaidCardLimitModal";
import {
  BUY_POCK_FEATURE_HEADLINE,
  BUY_POCK_FEATURE_SUBLINE,
  BUY_POCK_PAYMENT_NOTE,
} from "@/lib/geniusWalletCopy";
import {
  formatEstimatedPock,
  type PockMarketQuote,
} from "@/lib/pockPrice";
import {
  formatUsd,
  POCK_PACKAGES,
  PREPAID_CARD_DISCLAIMER,
  PREPAID_MIN_USD,
  PREPAID_WARN_USD,
} from "@/lib/purchaseConfig";
import { PRELAUNCH_LABEL, PRELAUNCH_TIERS } from "@/lib/prelaunchPricing";
import { subscriptionIncludedSummary } from "@/lib/subscriptionConfig";
import { getSupabase } from "@/lib/supabase/client";
import { Clock, Coins, CreditCard, Loader2, Package, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function estimatePock(usd: number, usdPerPock: number): number {
  if (usdPerPock <= 0) return 0;
  return Math.max(1, Math.floor(usd / usdPerPock));
}

interface NeoWalletProductsPanelProps {
  /** Prominent buy-first layout for Genius Wallet */
  featured?: boolean;
}

export function NeoWalletProductsPanel({
  featured = false,
}: NeoWalletProductsPanelProps) {
  const { user, createAccount, refresh } = usePock();
  const [quote, setQuote] = useState<PockMarketQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [checkoutTier, setCheckoutTier] = useState<string | null>(null);
  const [prepaidUsd, setPrepaidUsd] = useState(featured ? "50.00" : "25.00");
  const [prepaidLoading, setPrepaidLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [pendingPrepaidUsd, setPendingPrepaidUsd] = useState(0);

  const loadQuote = useCallback(async () => {
    setLoadingQuote(true);
    try {
      const res = await fetch("/api/pock/price");
      if (res.ok) setQuote(await res.json());
    } finally {
      setLoadingQuote(false);
    }
  }, []);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  const usdPerPock = quote?.usdPerPock ?? 0.2;
  const quoteAsOf = quote?.asOf
    ? new Date(quote.asOf).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const startCheckout = async (opts: { packageId?: string; customUsd?: number }) => {
    setError(null);
    if (!user) {
      await createAccount();
      await refresh();
    }
    const supabase = getSupabase();
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session.session?.access_token;
    const userId = session.session?.user?.id ?? user?.id;
    if (!accessToken || !userId) {
      setError("Sign in required — refresh and try again");
      return;
    }

    const key = opts.packageId ?? "prepaid";
    setCheckoutTier(key);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...opts,
          userId,
          accessToken,
        }),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        estimatedPock?: number;
      };
      if (!res.ok) {
        setError(data.error ?? "checkout_failed");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Could not start checkout");
    } finally {
      setCheckoutTier(null);
      setPrepaidLoading(false);
    }
  };

  const prepaidAmount = parseFloat(prepaidUsd);
  const prepaidValid =
    Number.isFinite(prepaidAmount) && prepaidAmount >= PREPAID_MIN_USD;
  const prepaidEst = prepaidValid ? estimatePock(prepaidAmount, usdPerPock) : 0;

  const requestPrepaidCheckout = () => {
    if (!prepaidValid) return;
    if (prepaidAmount >= PREPAID_WARN_USD) {
      setPendingPrepaidUsd(prepaidAmount);
      setLimitModalOpen(true);
      return;
    }
    setPrepaidLoading(true);
    startCheckout({ customUsd: prepaidAmount });
  };

  return (
    <>
      <PrepaidCardLimitModal
        open={limitModalOpen}
        amountUsd={pendingPrepaidUsd}
        onCancel={() => {
          setLimitModalOpen(false);
          setPrepaidLoading(false);
        }}
        onConfirm={() => {
          setLimitModalOpen(false);
          setPrepaidLoading(true);
          startCheckout({ customUsd: pendingPrepaidUsd });
        }}
      />
      <section
        id="buy-pock"
        className={`scroll-mt-24 rounded-2xl border p-6 space-y-6 ${
          featured
            ? "border-neon-cyan/35 bg-gradient-to-b from-neon-cyan/10 via-bg-card to-bg-card shadow-[0_0_48px_rgba(0,249,255,0.08)]"
            : "border-white/10 bg-bg-card"
        }`}
      >
        <div className="flex items-start gap-3">
          {featured ? (
            <Coins className="w-6 h-6 text-neon-cyan shrink-0 mt-0.5" />
          ) : (
            <Package className="w-5 h-5 text-neon-cyan shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-3">
            {featured ? (
              <>
                <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300/90">
                  No subscription required
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white/95">
                  {BUY_POCK_FEATURE_HEADLINE}
                </h3>
                <p className="text-sm text-white/55 leading-relaxed max-w-2xl">
                  {BUY_POCK_FEATURE_SUBLINE}
                </p>
                <PaymentMethodsBadges compact />
                <p className="text-[11px] text-white/40 leading-relaxed">
                  {BUY_POCK_PAYMENT_NOTE}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-medium text-white/85">
                  Buy $POCK &amp; subscribe
                </h3>
                <p className="text-xs text-white/45 leading-relaxed">
                  Pay in USD — receive an{" "}
                  <strong className="text-white/65 font-medium">estimated</strong>{" "}
                  $POCK amount based on the latest near real-time market quote.
                </p>
              </>
            )}
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/40">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-2 py-0.5">
                <Clock className="h-3 w-3 text-neon-cyan/70" />
                {loadingQuote
                  ? "Loading quote…"
                  : `Last quote: ${formatUsd(usdPerPock)}/$POCK${quoteAsOf ? ` · ${quoteAsOf}` : ""}`}
              </span>
              {quote?.delayed && (
                <span className="text-amber-400/80">Cached quote</span>
              )}
              {quote && !quote.delayed && quote.source === "dexscreener" && (
                <span className="text-neon-cyan/70">Live DEX feed</span>
              )}
            </div>
          </div>
        </div>

        <PockPricingDisclosure showOnChainCta={featured} />

        {/* USD top-up tiers */}
        <div>
          <p className="text-xs uppercase tracking-wider text-white/35 mb-3">
            {featured ? "Quick top-ups" : "Card top-ups"}
          </p>
          <div className={`grid gap-3 sm:grid-cols-3 ${featured ? "sm:gap-4" : ""}`}>
            {POCK_PACKAGES.map((tier) => {
              const est = estimatePock(tier.priceUsd, usdPerPock);
              const busy = checkoutTier === tier.id;
              return (
                <div
                  key={tier.id}
                  className={`relative rounded-xl border flex flex-col gap-2.5 ${
                    featured ? "p-5" : "p-4"
                  } ${
                    tier.popular
                      ? "border-neon-cyan/40 bg-neon-cyan/8"
                      : "border-white/8 bg-black/20"
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-2 right-3 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25">
                      Popular
                    </span>
                  )}
                  <p className="text-sm font-medium text-white/85">
                    {formatUsd(tier.priceUsd)} top-up
                  </p>
                  <p className="text-lg font-semibold text-neon-cyan tabular-nums leading-tight">
                    Est. ~{formatEstimatedPock(est)}{" "}
                    <span className="text-sm font-medium text-white/40">$POCK</span>
                  </p>
                  <p className="text-[10px] text-white/40 flex-1 leading-relaxed">
                    {tier.label} package · card, bank, or wallet pay
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startCheckout({ packageId: tier.id })}
                    className={`w-full rounded-lg border border-neon-cyan/45 text-neon-cyan hover:bg-neon-cyan/15 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5 font-medium ${
                      featured ? "text-sm px-4 py-2.5 bg-neon-cyan/10" : "text-xs px-3 py-2"
                    }`}
                  >
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CreditCard className="w-3.5 h-3.5" />
                    )}
                    Buy {formatUsd(tier.priceUsd)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prepaid custom */}
        <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-neon-cyan" />
            <p className="text-sm font-medium text-white/85">Prepaid tokens</p>
          </div>
          <p className="text-xs text-white/45 leading-relaxed">
            {PREPAID_CARD_DISCLAIMER}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <label className="flex-1 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40">
                USD amount (min {formatUsd(PREPAID_MIN_USD)})
              </span>
              <input
                type="number"
                min={PREPAID_MIN_USD}
                step={0.01}
                value={prepaidUsd}
                onChange={(e) => setPrepaidUsd(e.target.value)}
                placeholder="e.g. 25.00"
                className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm tabular-nums focus:border-neon-cyan/40 outline-none"
              />
            </label>
            <div className="text-sm text-white/55 sm:pb-1 shrink-0">
              Est. ~{" "}
              <span className="text-neon-cyan font-semibold tabular-nums">
                {prepaidValid ? formatEstimatedPock(prepaidEst) : "—"}
              </span>{" "}
              $POCK
            </div>
            <button
              type="button"
              disabled={
                !prepaidValid || prepaidLoading || checkoutTier === "prepaid"
              }
              onClick={requestPrepaidCheckout}
              className="shrink-0 px-5 py-2.5 rounded-lg bg-neon-cyan/15 border border-neon-cyan/45 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {(prepaidLoading || checkoutTier === "prepaid") && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Pay {prepaidValid ? formatUsd(prepaidAmount) : "—"}
            </button>
          </div>
        </div>

        {/* Subscriptions */}
        <div className={featured ? "pt-4 border-t border-white/8" : ""}>
          <p className="text-xs uppercase tracking-wider text-white/35 mb-1">
            {featured ? "Optional — monthly BROK plans" : "Monthly subscriptions"} ·{" "}
            {PRELAUNCH_LABEL}
          </p>
          {featured && (
            <p className="text-[11px] text-white/40 mb-3">
              Subscriptions add included $POCK pools — top-ups above work without any plan.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {PRELAUNCH_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`relative rounded-xl border p-4 flex flex-col gap-2 ${
                  tier.popular
                    ? "border-neon-cyan/35 bg-neon-cyan/5"
                    : "border-white/8 bg-black/20"
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-2 right-3 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25">
                    Popular
                  </span>
                )}
                <p className="text-sm font-medium text-white/85">{tier.name}</p>
                <p className="text-xs text-white/45">{tier.tagline}</p>
                <div className="flex items-baseline gap-2 flex-wrap pt-1">
                  <span className="text-xs text-white/30 line-through">
                    ${tier.strikethroughUsd}/mo
                  </span>
                  <span className="text-lg font-semibold text-neon-cyan tabular-nums">
                    {formatUsd(tier.priceUsd)}
                    <span className="text-xs text-white/40 font-normal">/mo</span>
                  </span>
                </div>
                <Link
                  href="/subscribe"
                  className="w-full text-center text-xs px-3 py-2 rounded-lg border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                >
                  Subscribe
                </Link>
                <p className="text-[10px] text-white/35 leading-relaxed">
                  {subscriptionIncludedSummary(tier)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-white/40 border border-white/8 rounded-lg px-4 py-3 bg-black/20 leading-relaxed">
          {featured
            ? "Crypto and wire transfers — coming soon. US bank (ACH) and cards available now via Stripe where enabled."
            : "Pay with crypto or wire — coming soon. US bank (ACH) via Stripe where enabled."}
        </p>

        {error && (
          <p className="text-xs text-red-400/90 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <PockAssetDisclaimer compact />
      </section>
    </>
  );
}