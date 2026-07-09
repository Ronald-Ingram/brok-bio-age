"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Coins,
  Loader2,
  Server,
  Users,
} from "lucide-react";
import Link from "next/link";
import { CorrectAnswersPanel } from "@/components/admin/CorrectAnswersPanel";
import { TreasuryBuybackPanel } from "@/components/admin/TreasuryBuybackPanel";

interface DashboardData {
  generatedAt: string;
  users: { total: number; subscribed: number };
  pock: {
    corpFloat: number | null;
    corpAllocated?: number | null;
    corpWallet?: string;
    stripeTopUps: number;
    meterUsageEvents: number;
    calcEvents: number;
  };
  treasury: {
    stripePaymentCount: number;
    stripeUsdCollected: number;
    stripePockIssued: number;
    userLedgerPockTotal: number;
    userReservedPockTotal: number;
    onChainQueuedPock: number;
    recentStripePayments: {
      sessionId: string;
      userId: string;
      pockAmount: number;
      usd: number | null;
      at: string;
    }[];
  };
  kironCanon: { documents: number };
  revenue: {
    subscriptionCheckoutsTracked: number;
    estimatedFirstMonthUsd: number;
    tiers: { id: string; name: string; priceUsd: number }[];
  };
  models: {
    activeProvider: string;
    routes: { id: string; label: string; model: string; role: string }[];
  };
  integrations: Record<string, boolean>;
  outages: string[];
  brokHealth: Record<string, unknown> | null;
  siteUrl: string | null;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!secret.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: { "x-brok-og-admin": secret.trim() },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "forbidden");
      setData(json);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    const saved = sessionStorage.getItem("brok_admin_secret");
    if (saved) setSecret(saved);
  }, []);

  const saveAndLoad = () => {
    sessionStorage.setItem("brok_admin_secret", secret.trim());
    load();
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-neon-cyan" />
          Kiron Admin
        </h1>
        <p className="text-sm text-white/45">
          Usage, models, Canon, subscriptions, integrations —{" "}
          <Link href="/avatar" className="text-neon-cyan hover:underline">
            BROK Avatar
          </Link>
          {" · "}
          <Link href="/genius-wallet" className="text-neon-cyan hover:underline">
            Genius Wallet
          </Link>
        </p>
      </header>

      <section className="rounded-xl border border-white/10 bg-bg-card p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="password"
          placeholder="BROK_OG_ADMIN_SECRET"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm font-mono"
        />
        <button
          type="button"
          onClick={saveAndLoad}
          disabled={loading || !secret.trim()}
          className="px-5 py-2.5 rounded-lg border border-neon-cyan/50 text-neon-cyan text-sm hover:bg-neon-cyan/10 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Load"}
        </button>
      </section>

      {error && (
        <p className="text-sm text-red-400/90 border border-red-400/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {data && (
        <div className="space-y-4">
          {data.outages.length > 0 && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-sm text-amber-200/90 space-y-1">
                <p className="font-medium">Alerts</p>
                {data.outages.map((o) => (
                  <p key={o} className="text-xs text-amber-200/70">
                    {o}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              icon={Users}
              label="Users"
              value={`${data.users.total} total · ${data.users.subscribed} subscribed`}
            />
            <StatCard
              icon={Coins}
              label="Corp float"
              value={
                data.pock.corpFloat != null
                  ? `${data.pock.corpFloat.toLocaleString()} $POCK`
                  : "—"
              }
            />
            <StatCard
              icon={BookOpen}
              label="Kiron Canon docs"
              value={String(data.kironCanon.documents)}
            />
            <StatCard
              icon={Activity}
              label="Product usage (recent)"
              value={`${data.pock.calcEvents} calcs · ${data.pock.meterUsageEvents} meter · ${data.pock.stripeTopUps} top-ups`}
            />
          </div>

          <section className="rounded-xl border border-white/10 bg-bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-white/80 flex items-center gap-2">
              <Server className="w-4 h-4 text-neon-cyan" />
              Model routing
            </h2>
            <p className="text-xs text-white/45">
              Active: <span className="text-neon-cyan">{data.models.activeProvider}</span> ·
              Canon consulted first on BROK API
            </p>
            <ul className="text-xs text-white/55 space-y-1">
              {data.models.routes.map((r) => (
                <li key={r.id}>
                  <span className="text-white/70">{r.label}</span> — {r.model}{" "}
                  <span className="text-white/30">({r.role})</span>
                </li>
              ))}
            </ul>
          </section>

          <CorrectAnswersPanel adminSecret={secret} />

          <TreasuryBuybackPanel adminSecret={secret} />

          <section className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-4 space-y-4">
            <h2 className="text-sm font-medium text-white/85 flex items-center gap-2">
              <Coins className="w-4 h-4 text-neon-cyan" />
              Genius Wallet treasury
            </h2>
            <p className="text-xs text-white/45 leading-relaxed">
              USD from Stripe top-ups lands in your Neobanx Stripe balance. Matching
              $POCK is issued as <strong className="text-white/65">reserved ledger</strong>{" "}
              credits in Supabase — separate from corp trial float (
              {data.pock.corpWallet?.slice(0, 8)}…).
            </p>
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-white/40 block">Stripe USD collected</span>
                <span className="text-neon-cyan font-semibold tabular-nums">
                  ${data.treasury.stripeUsdCollected.toFixed(2)}
                </span>
                <span className="text-white/35"> · {data.treasury.stripePaymentCount} payments</span>
              </p>
              <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-white/40 block">$POCK issued (Stripe)</span>
                <span className="text-white/85 font-semibold tabular-nums">
                  {data.treasury.stripePockIssued.toLocaleString()}
                </span>
              </p>
              <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-white/40 block">User reserved ledger</span>
                <span className="text-white/85 font-semibold tabular-nums">
                  {data.treasury.userReservedPockTotal.toLocaleString()} $POCK
                </span>
              </p>
              <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-white/40 block">Corp float (trials)</span>
                <span className="text-white/85 font-semibold tabular-nums">
                  {data.pock.corpFloat?.toLocaleString() ?? "—"} $POCK
                </span>
              </p>
            </div>
            {data.treasury.recentStripePayments.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                  <thead>
                    <tr className="text-white/35 border-b border-white/10">
                      <th className="py-2 pr-3">When</th>
                      <th className="py-2 pr-3">USD</th>
                      <th className="py-2 pr-3">$POCK</th>
                      <th className="py-2">User</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/55">
                    {data.treasury.recentStripePayments.map((p) => (
                      <tr key={p.sessionId} className="border-b border-white/5">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {new Date(p.at).toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {p.usd != null ? `$${p.usd.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-neon-cyan/90">
                          {p.pockAmount}
                        </td>
                        <td className="py-2 font-mono text-white/40">
                          {p.userId.slice(0, 8)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-bg-card p-4 space-y-2">
            <h2 className="text-sm font-medium text-white/80">Revenue snapshot</h2>
            <p className="text-xs text-white/45">
              Tracked subscription checkouts: {data.revenue.subscriptionCheckoutsTracked} ·
              Est. first-month USD (checkout events): $
              {data.revenue.estimatedFirstMonthUsd.toFixed(2)}
            </p>
            <ul className="text-xs text-white/50">
              {data.revenue.tiers.map((t) => (
                <li key={t.id}>
                  {t.name}: ${t.priceUsd}/mo
                </li>
              ))}
            </ul>
          </section>

          <p className="text-[10px] text-white/30 text-center">
            Updated {new Date(data.generatedAt).toLocaleString()} · site{" "}
            {data.siteUrl ?? "—"}
          </p>
        </div>
      )}
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-bg-card p-4">
      <div className="flex items-center gap-2 text-white/45 text-xs mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="text-sm font-medium text-white/85">{value}</p>
    </div>
  );
}