"use client";

import { usePock } from "@/context/PockContext";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { PaymentMethodsBadges } from "@/components/PaymentMethodsBadges";
import { PockAssetDisclaimer } from "@/components/PockAssetDisclaimer";
import { PockPricingDisclosure } from "@/components/PockPricingDisclosure";
import { PockPurchaseEstimate } from "@/components/PockPurchaseEstimate";
import { PrepaidCardLimitModal } from "@/components/PrepaidCardLimitModal";
import {
  formatEstimatedPock,
  estimatePockFromUsd,
} from "@/lib/pockPrice";
import {
  formatUsd,
  POCK_PACKAGES,
  PREPAID_CARD_DISCLAIMER,
  PREPAID_MIN_USD,
  PREPAID_WARN_USD,
} from "@/lib/purchaseConfig";
import {
  ArrowLeft,
  Check,
  Coins,
  CreditCard,
  Loader2,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function BuyPockContent() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "1";
  const { user, loading, createAccount, refresh } = usePock();
  const [selectedId, setSelectedId] = useState(
    POCK_PACKAGES.find((p) => p.popular)?.id ?? POCK_PACKAGES[0].id
  );
  const [usdPerPock, setUsdPerPock] = useState(0.2);
  const [prepaidUsd, setPrepaidUsd] = useState("");
  const [mode, setMode] = useState<"tier" | "prepaid">("tier");
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  const selected = POCK_PACKAGES.find((p) => p.id === selectedId)!;
  const prepaidAmount = parseFloat(prepaidUsd);
  const prepaidValid =
    mode === "prepaid" &&
    Number.isFinite(prepaidAmount) &&
    prepaidAmount >= PREPAID_MIN_USD;

  useEffect(() => {
    fetch("/api/pock/price")
      .then((r) => r.json())
      .then((d: { usdPerPock?: number }) => {
        if (d.usdPerPock) setUsdPerPock(d.usdPerPock);
      })
      .catch(() => null);
  }, []);

  const payUsd = mode === "prepaid" && prepaidValid ? prepaidAmount : selected.priceUsd;
  const estPock = estimatePockFromUsd(payUsd, usdPerPock);

  const runCheckout = async () => {
    setError(null);
    if (!isSupabaseConfigured()) {
      setError("Payments not configured — contact support");
      return;
    }
    if (!user) {
      await createAccount();
      await refresh();
    }
    const supabase = getSupabase();
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session.session?.access_token;
    const userId = session.session?.user?.id ?? user?.id;
    if (!accessToken || !userId) {
      setError("Sign in required — return to Bio-Age and create account first");
      return;
    }

    setCheckingOut(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(mode === "prepaid" && prepaidValid
            ? { customUsd: prepaidAmount }
            : { packageId: selectedId }),
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
        if (data.error === "stripe_not_configured") {
          setError("Stripe checkout coming online — try again shortly");
        } else {
          setError(data.error ?? "Checkout failed");
        }
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Could not start checkout");
    } finally {
      setCheckingOut(false);
    }
  };

  const startCheckout = () => {
    if (mode === "prepaid" && prepaidValid && prepaidAmount >= PREPAID_WARN_USD) {
      setLimitModalOpen(true);
      return;
    }
    runCheckout();
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 py-10 sm:px-6">
      <PrepaidCardLimitModal
        open={limitModalOpen}
        amountUsd={prepaidAmount}
        onCancel={() => setLimitModalOpen(false)}
        onConfirm={() => {
          setLimitModalOpen(false);
          runCheckout();
        }}
      />
      <div className="max-w-2xl mx-auto space-y-8">
        <Link
          href="/genius-wallet"
          className="inline-flex items-center gap-2 text-sm text-white/45 hover:text-neon-cyan transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Genius Wallet
        </Link>

        <header className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">
            Kiron.AI · BROK Commerce
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Top up <span className="text-neon-cyan">$POCK</span>
          </h1>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Pay in USD — your $POCK quantity locks when you start checkout. Card
            payments credit your Genius Wallet reserve immediately.
          </p>
          <PaymentMethodsBadges />
        </header>

        <PockPricingDisclosure />

        {canceled && (
          <p className="text-sm text-amber-400/90 text-center rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
            Checkout canceled — pick a package below to try again.
          </p>
        )}

        <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-bg-card to-black/30 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/55">
              <CreditCard className="w-4 h-4 text-neon-cyan" />
              Quote: {formatUsd(usdPerPock)}/$POCK
            </div>
            {user && (
              <span className="text-xs px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/25 text-neon-cyan tabular-nums">
                Balance: {user.pock_balance} $POCK
              </span>
            )}
          </div>

          <div className="grid gap-3">
            {POCK_PACKAGES.map((tier) => {
              const est = estimatePockFromUsd(tier.priceUsd, usdPerPock);
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => {
                    setMode("tier");
                    setSelectedId(tier.id);
                  }}
                  className={`relative flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors ${
                    mode === "tier" && selectedId === tier.id
                      ? "border-neon-cyan/50 bg-neon-cyan/8"
                      : "border-white/10 bg-bg-card hover:border-white/20"
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-2 right-4 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                      Popular
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        mode === "tier" && selectedId === tier.id
                          ? "border-neon-cyan bg-neon-cyan/20"
                          : "border-white/25"
                      }`}
                    >
                      {mode === "tier" && selectedId === tier.id && (
                        <Check className="w-3 h-3 text-neon-cyan" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white/90">
                        {tier.label} · {formatUsd(tier.priceUsd)}
                      </p>
                      <p className="text-xs text-white/40">
                        Est. {formatEstimatedPock(est)} $POCK
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className={`rounded-xl border p-4 space-y-3 transition-colors ${
              mode === "prepaid"
                ? "border-neon-cyan/40 bg-neon-cyan/5"
                : "border-white/10 bg-black/20"
            }`}
          >
            <button
              type="button"
              onClick={() => setMode("prepaid")}
              className="flex items-center gap-2 text-sm font-medium text-white/85 w-full text-left"
            >
              <Wallet className="w-4 h-4 text-neon-cyan" />
              Prepaid tokens (custom USD)
            </button>
            <p className="text-xs text-white/45">
              {PREPAID_CARD_DISCLAIMER}
            </p>
            <input
              type="number"
              min={PREPAID_MIN_USD}
              step={0.01}
              placeholder={`Min ${PREPAID_MIN_USD} USD — any amount`}
              value={prepaidUsd}
              onChange={(e) => {
                setPrepaidUsd(e.target.value);
                setMode("prepaid");
              }}
              className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm tabular-nums focus:border-neon-cyan/40 outline-none"
            />
            {prepaidValid && (
              <p className="text-xs text-neon-cyan/80">
                Est.{" "}
                {formatEstimatedPock(
                  estimatePockFromUsd(prepaidAmount, usdPerPock)
                )}{" "}
                $POCK
              </p>
            )}
          </div>

          <PockPurchaseEstimate
            tier={selected}
            customUsd={mode === "prepaid" && prepaidValid ? prepaidAmount : undefined}
          />

          <button
            type="button"
            onClick={startCheckout}
            disabled={
              checkingOut ||
              loading ||
              (mode === "prepaid" && !prepaidValid)
            }
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan font-medium hover:bg-neon-cyan/30 disabled:opacity-50 transition-colors"
          >
            {checkingOut || loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            Pay {formatUsd(payUsd)} · est. ~{formatEstimatedPock(estPock)} $POCK
          </button>

          {error && (
            <p className="text-sm text-red-400/90 text-center">{error}</p>
          )}
        </section>

        <ul className="flex flex-wrap justify-center gap-6 text-xs text-white/40">
          <li className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-neon-cyan/70" />
            Stripe secure checkout
          </li>
          <li className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-neon-cyan/70" />
            Instant wallet credit
          </li>
        </ul>

        <p className="text-[11px] text-center text-white/35">
          US bank (ACH) available via Stripe where enabled. Crypto and wire — coming soon.
        </p>

        <PockAssetDisclaimer className="text-center" />
      </div>
    </main>
  );
}

export default function BuyPockPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/40">
          Loading…
        </div>
      }
    >
      <BuyPockContent />
    </Suspense>
  );
}