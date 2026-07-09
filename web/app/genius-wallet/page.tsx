"use client";

import { DigitalAssetDisclaimer } from "@/components/DigitalAssetDisclaimer";
import { PockBalanceAlert } from "@/components/PockBalanceAlert";
import { GeniusDollarGLogo } from "@/components/GeniusDollarGLogo";
import { WalletPanel } from "@/components/WalletPanel";
import { usePock } from "@/context/PockContext";
import { syncStripeCheckout } from "@/lib/syncStripeCheckout";
import {
  BROK_WALLET_FUTURE_NOTE,
  BUY_POCK_FEATURE_HEADLINE,
  GENIUS_TOKEN_LABEL,
  GENIUS_WALLET_TAGLINE,
  GENIUS_WALLET_TITLE,
} from "@/lib/geniusWalletCopy";
import { giftClaimRegisterUrl } from "@/lib/giftPockMessage";
import { BROK_IN_EVERY_POCKET, NORTH_STAR } from "@/lib/siteCopy";
import { SITE_URL } from "@/lib/siteConfig";
import { ArrowRight, CheckCircle2, Coins, Loader2, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function GeniusWalletContent() {
  const { configured, ready, loading, createAccount, refresh } = usePock();
  const searchParams = useSearchParams();
  const claimToken = searchParams.get("claim");
  const purchased = searchParams.get("purchased") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const sessionId = searchParams.get("session_id");
  const topup = searchParams.get("topup") === "1";
  const [syncingPurchase, setSyncingPurchase] = useState(false);
  const [creditedPock, setCreditedPock] = useState<number | null>(null);

  useEffect(() => {
    if (configured && !ready && !loading) {
      void createAccount();
    }
  }, [configured, ready, loading, createAccount]);

  useEffect(() => {
    if (!topup) return;
    const scrollToBuy = () => {
      document.getElementById("buy-pock")?.scrollIntoView({ behavior: "smooth" });
    };
    scrollToBuy();
    const t = window.setTimeout(scrollToBuy, 400);
    return () => window.clearTimeout(t);
  }, [topup]);

  useEffect(() => {
    if (!purchased || !sessionId) return;
    let cancelled = false;
    setSyncingPurchase(true);
    void (async () => {
      const result = await syncStripeCheckout(sessionId).catch(() => null);
      if (!cancelled) {
        if (result?.credited) setCreditedPock(result.credited);
        await refresh();
        setSyncingPurchase(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [purchased, sessionId, refresh]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#181f1c] via-bg-card to-[#0e1411] px-5 py-8 sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,249,255,0.1),transparent_65%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-neon-cyan/5 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col items-center text-center">
          <p className="mb-6 text-[10px] uppercase tracking-[0.24em] text-neon-cyan/70">
            {SITE_URL.replace("https://", "")} · {GENIUS_TOKEN_LABEL}
          </p>

          <GeniusDollarGLogo size="hero" />

          <div className="mt-8 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/25 bg-neon-cyan/8 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-neon-cyan">
              <User className="h-3.5 w-3.5" />
              Human-controlled wallet
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {GENIUS_WALLET_TITLE}
            </h1>

            <p className="text-sm leading-relaxed text-white/55 sm:text-base">
              {GENIUS_WALLET_TAGLINE}
            </p>

            <p className="text-sm font-medium text-neon-cyan/80">
              {BROK_IN_EVERY_POCKET}
            </p>

            <a
              href="#buy-pock"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-neon-cyan/50 bg-neon-cyan/15 px-6 py-3 text-sm font-medium text-neon-cyan transition-colors hover:bg-neon-cyan/25"
            >
              <Coins className="h-4 w-4" />
              {BUY_POCK_FEATURE_HEADLINE}
            </a>
          </div>

          <p className="mt-6 max-w-xl text-sm italic leading-relaxed text-white/45">
            {NORTH_STAR}
          </p>
        </div>
      </section>

      {purchased && (
        <section className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/8 px-5 py-4 text-sm text-white/75 space-y-1">
          <p className="flex items-center gap-2 font-medium text-emerald-300">
            {syncingPurchase ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            {syncingPurchase
              ? "Confirming payment — crediting reserved $POCK…"
              : "Top-up successful — reserved $POCK credited immediately."}
          </p>
          {creditedPock != null && creditedPock > 0 && !syncingPurchase && (
            <p className="text-xs text-white/50 pl-6">
              +{creditedPock.toLocaleString()} $POCK locked at checkout price · spendable now in BROK.
            </p>
          )}
        </section>
      )}

      {canceled && (
        <section className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-400/8 px-5 py-3 text-sm text-amber-200/90">
          Checkout canceled — pick an amount in Buy $POCK below when you&apos;re ready.
        </section>
      )}

      {claimToken && (
        <section className="mt-6 rounded-2xl border border-neon-cyan/30 bg-neon-cyan/8 px-5 py-4 text-sm text-white/75 space-y-2">
          <p className="font-medium text-neon-cyan">You have a gift to claim</p>
          <p>
            Create your free Genius Wallet account below if needed, then finish
            claiming with your link.
          </p>
          <Link
            href={`/claim?token=${encodeURIComponent(claimToken)}`}
            className="inline-flex items-center gap-1.5 font-medium text-neon-cyan hover:underline"
          >
            Go to claim page
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <p className="text-[11px] text-white/40">
            Register shortcut: {giftClaimRegisterUrl(claimToken)}
          </p>
        </section>
      )}

      <PockBalanceAlert alwaysRemind className="mt-8" />

      <div className="mt-6">
        <WalletPanel variant="genius" hideHeader />
      </div>

      <section
        id="brok-wallet"
        className="mt-8 scroll-mt-24 rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/8 via-bg-card to-bg-card px-6 py-5 sm:px-8"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/15">
            <Sparkles className="h-5 w-5 text-violet-300" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white/80">BROK Wallet (coming)</p>
            <p className="text-sm leading-relaxed text-white/50">
              {BROK_WALLET_FUTURE_NOTE}
            </p>
            <p className="text-[11px] text-white/35">
              Genius Wallet stays human-controlled. BROK Wallet is a separate layer for
              agentic spending you authorize.
            </p>
          </div>
        </div>
      </section>

      <nav className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/45">
        <Link href="/" className="transition-colors hover:text-neon-cyan">
          BROK Home
        </Link>
        <Link href="/bio-age" className="transition-colors hover:text-neon-cyan">
          Bio-Age Calculator
        </Link>
        <Link href="/chat" className="transition-colors hover:text-neon-cyan">
          BROK Chat
        </Link>
        <Link href="/subscribe" className="transition-colors hover:text-neon-cyan">
          Subscriptions
        </Link>
        <Link href="/trust" className="transition-colors hover:text-neon-cyan">
          Trust &amp; security
        </Link>
      </nav>

      <DigitalAssetDisclaimer className="mx-auto mt-10 max-w-2xl text-center" />
    </main>
  );
}

export default function GeniusWalletPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <GeniusWalletContent />
    </Suspense>
  );
}