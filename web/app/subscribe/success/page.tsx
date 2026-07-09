"use client";

import { usePock } from "@/context/PockContext";
import { syncStripeCheckout } from "@/lib/syncStripeCheckout";
import { tierDisplayName } from "@/lib/subscriptionConfig";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function SubscribeSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { user, refresh, loading } = usePock();

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      if (sessionId) {
        await syncStripeCheckout(sessionId).catch(() => null);
      }
      if (!cancelled) await refresh();
    };

    sync();
    const t = setInterval(sync, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [refresh, sessionId]);

  return (
    <main className="min-h-screen px-4 py-16 max-w-lg mx-auto text-center space-y-6">
      <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto" />
      <h1 className="text-2xl font-semibold">Subscription confirmed</h1>
      <p className="text-sm text-white/50 leading-relaxed">
        Stripe is activating your plan. Your monthly included $POCK pool and
        full history access update automatically once the webhook clears.
      </p>

      {loading ? (
        <p className="text-sm text-white/40 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Syncing account…
        </p>
      ) : user?.subscription_active ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4 text-sm space-y-1">
          <p className="text-emerald-400 font-medium">
            {tierDisplayName(user.subscription_tier)} active
          </p>
          <p className="text-white/55">
            {user.included_pock_remaining} / {user.included_pock_allowance}{" "}
            included $POCK · {user.pock_balance} wallet
          </p>
        </div>
      ) : (
        <p className="text-xs text-white/40">
          Still processing — refresh in a few seconds if your tier hasn&apos;t
          appeared yet.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Link
          href="/bio-age"
          className="px-6 py-2.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/25 transition-colors"
        >
          Open calculator
        </Link>
        <Link
          href="/subscribe"
          className="px-6 py-2.5 rounded-xl border border-white/15 text-white/55 text-sm hover:border-white/25 transition-colors"
        >
          View plans
        </Link>
      </div>
    </main>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white/40">
          Loading…
        </div>
      }
    >
      <SubscribeSuccessContent />
    </Suspense>
  );
}