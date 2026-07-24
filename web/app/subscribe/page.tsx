"use client";

import { SubscribeSection } from "@/components/SubscribeSection";
import { usePock } from "@/context/PockContext";
import { PRELAUNCH_LABEL } from "@/lib/prelaunchPricing";
import { METER_RATES } from "@/lib/subscriptionConfig";
import { NORTH_STAR } from "@/lib/siteCopy";
import { ArrowLeft, Dna, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SubscribeContent() {
  const { loading, ready } = usePock();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "1";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-white/40">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 max-w-3xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-white/45 hover:text-neon-cyan mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to BROK
      </Link>

      <header className="flex items-center gap-3 mb-6">
        <Dna className="w-8 h-8 text-neon-cyan" />
        <div>
          <h1 className="text-2xl font-semibold">BROK Subscriptions</h1>
          <p className="text-sm text-white/45">
            Essential <span className="line-through text-white/30">$29</span> $9/mo
            · Pro <span className="line-through text-white/30">$79</span> $49/mo —{" "}
            {PRELAUNCH_LABEL}
          </p>
        </div>
      </header>

      <p className="text-sm text-white/50 leading-relaxed mb-8 italic border-l-2 border-neon-cyan/25 pl-4">
        {NORTH_STAR}
      </p>

      {canceled && (
        <p className="text-sm text-amber-400/90 border border-amber-400/20 rounded-xl px-4 py-3 mb-6 bg-amber-400/5">
          Checkout canceled — pick a plan when you&apos;re ready.
        </p>
      )}

      {!ready ? (
        <p className="text-sm text-white/50 text-center py-12">
          Create your free BROK account on the{" "}
          <Link href="/bio-age" className="text-neon-cyan hover:underline">
            calculator
          </Link>{" "}
          or{" "}
          <Link href="/genius-wallet" className="text-neon-cyan hover:underline">
            Genius Wallet
          </Link>
          , then return here to subscribe.
        </p>
      ) : (
        <SubscribeSection />
      )}

      <section className="mt-8 rounded-xl border border-white/8 bg-bg-card p-5 text-xs text-white/40 space-y-2">
        <p className="font-medium text-white/55">Active usage metering only</p>
        <p>
          Base turn {METER_RATES.baseTurnPock} $POCK · voice +{METER_RATES.voiceBlockPock}{" "}
          · avatar +{METER_RATES.avatarBlockPock} per spoken block · BROK Genius
          path +30%. Billed while speaking or animating — static mode is free.
        </p>
        <p>Bio-Age calculations: {METER_RATES.calcPock} $POCK each (included pool first).</p>
      </section>
    </main>
  );
}

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white/40">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      }
    >
      <SubscribeContent />
    </Suspense>
  );
}