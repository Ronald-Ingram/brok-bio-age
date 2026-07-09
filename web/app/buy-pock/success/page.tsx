"use client";

import { usePock } from "@/context/PockContext";
import { syncStripeCheckout } from "@/lib/syncStripeCheckout";
import { motion } from "framer-motion";
import { CheckCircle2, Coins, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { user, refresh, loading } = usePock();
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const poll = async () => {
      if (sessionId) {
        await syncStripeCheckout(sessionId).catch(() => null);
      }
      await refresh();
      if (cancelled) return;
      attempts += 1;
      if (attempts < 8) {
        timer = setTimeout(poll, 1500);
      } else {
        setSyncing(false);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refresh, sessionId]);

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full rounded-2xl border border-neon-cyan/25 bg-bg-card p-8 text-center space-y-6"
      >
        <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
        <div>
          <h1 className="text-xl font-semibold text-white/90">
            Payment received
          </h1>
          <p className="text-sm text-white/50 mt-2">
            Your $POCK balance updates automatically after Stripe confirms
            payment.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-neon-cyan">
          {syncing || loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Coins className="w-4 h-4" />
          )}
          <span className="text-lg font-semibold tabular-nums">
            {user ? `${user.pock_balance} $POCK` : "Syncing balance…"}
          </span>
        </div>

        {sessionId && (
          <p className="text-[10px] text-white/25 break-all">
            Ref: {sessionId.slice(0, 24)}…
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/genius-wallet"
            className="flex-1 px-5 py-3 rounded-xl bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 transition-colors text-center"
          >
            Genius Wallet
          </Link>
          <Link
            href="/genius-wallet#buy-pock"
            className="px-5 py-3 rounded-xl border border-white/15 text-white/55 text-sm hover:border-white/25 transition-colors text-center"
          >
            Buy more
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

export default function BuyPockSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/40">
          Loading…
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}