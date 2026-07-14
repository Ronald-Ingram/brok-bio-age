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
import {
  AdminPasskeyGate,
  clearAdminSession,
  loadAdminSession,
} from "@/components/admin/AdminPasskeyGate";
import { CorrectAnswersPanel } from "@/components/admin/CorrectAnswersPanel";
import { MediumMemoryPanel } from "@/components/admin/MediumMemoryPanel";
import { MemoryHierarchyPanel } from "@/components/admin/MemoryHierarchyPanel";
import { TreasuryBuybackPanel } from "@/components/admin/TreasuryBuybackPanel";
import { adminAuthHeaders } from "@/lib/adminAuthClient";

interface DashboardData {
  generatedAt: string;
  users: {
    total: number;
    subscribed: number;
    created24h?: number;
    created7d?: number;
  };
  walletCreation?: {
    note: string;
    walletsTotal: number;
    walletsCreated24h: number;
    walletsCreated7d: number;
    trialCredits24h: number;
    trialCredits7d: number;
    trialPock24h: number;
    trialPock7d: number;
    trialCreditsSampled: number;
    trialPockSampled: number;
    deviceBindingsTotal: number;
    usersWithMultipleDevices: number;
    maxDevicesOnOneWallet: number;
    avgWalletsPerBoundDevice: number;
    recentWallets: {
      code: string;
      userId: string;
      balance: number;
      trialCredited: boolean;
      hasPin: boolean;
      deviceCount: number;
      displayName: string | null;
      createdAt: string;
      updatedAt: string;
    }[];
    recentDevices: {
      deviceIdShort: string;
      deviceId: string;
      userCode: string;
      userId: string;
      boundAt: string;
      boundVia: string | null;
    }[];
    recentTrialCredits: {
      code: string;
      userId: string;
      amount: number;
      at: string;
      note: string | null;
    }[];
  };
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
  kironCanon: { documents: number; error?: string | null; note?: string };
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
  const [session, setSession] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: adminAuthHeaders({ session: token }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Session expired or secret rotated — force re-login instead of stuck "forbidden".
        if (res.status === 403 || json.error === "forbidden") {
          clearAdminSession();
          setSession(null);
          setData(null);
          setError(
            "Admin session expired or invalid. Sign in again with your admin secret (or passkey if registered). Sessions last 8 hours."
          );
          return;
        }
        throw new Error(json.error ?? "load_failed");
      }
      setData(json);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = loadAdminSession();
    if (saved) {
      setSession(saved);
      void load(saved);
    }
  }, [load]);

  const handleSession = (token: string) => {
    setError(null);
    setSession(token);
    void load(token);
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

      <AdminPasskeyGate
        session={session}
        onSession={handleSession}
        onClear={() => {
          setSession(null);
          setData(null);
          setError(null);
        }}
      />

      {loading && !data && session && (
        <p className="text-sm text-white/45 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading dashboard…
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400/90 border border-red-400/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {data && session && (
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
              value={
                data.kironCanon.error
                  ? `Error: ${data.kironCanon.error}`
                  : `${data.kironCanon.documents} in core_knowledge`
              }
            />
            <StatCard
              icon={Activity}
              label="Product usage (recent)"
              value={`${data.pock.calcEvents} calcs · ${data.pock.meterUsageEvents} meter · ${data.pock.stripeTopUps} top-ups`}
            />
            {data.walletCreation && (
              <>
                <StatCard
                  icon={Users}
                  label="Wallets created"
                  value={`${data.walletCreation.walletsCreated24h} / 24h · ${data.walletCreation.walletsCreated7d} / 7d`}
                />
                <StatCard
                  icon={Coins}
                  label="Trial credits (+100)"
                  value={`${data.walletCreation.trialCredits24h} / 24h · ${data.walletCreation.trialPock24h.toLocaleString()} $POCK`}
                />
              </>
            )}
          </div>

          {data.walletCreation && (
            <section className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-4">
              <h2 className="text-sm font-medium text-white/85 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-300" />
                Wallet creation & free trial monitor
              </h2>
              <p className="text-xs text-white/50 leading-relaxed">
                {data.walletCreation.note}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-white/40 block">Total wallets</span>
                  <span className="text-white/85 font-semibold tabular-nums">
                    {data.walletCreation.walletsTotal.toLocaleString()}
                  </span>
                </p>
                <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-white/40 block">Device bindings</span>
                  <span className="text-white/85 font-semibold tabular-nums">
                    {data.walletCreation.deviceBindingsTotal.toLocaleString()}
                  </span>
                  <span className="text-white/35 block mt-0.5">
                    ~{data.walletCreation.avgWalletsPerBoundDevice} wallet per
                    bound device (current model)
                  </span>
                </p>
                <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-white/40 block">Trial $POCK (7d)</span>
                  <span className="text-amber-200/90 font-semibold tabular-nums">
                    {data.walletCreation.trialCredits7d} events ·{" "}
                    {data.walletCreation.trialPock7d.toLocaleString()} $POCK
                  </span>
                </p>
                <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="text-white/40 block">Multi-device wallets</span>
                  <span className="text-white/85 font-semibold tabular-nums">
                    {data.walletCreation.usersWithMultipleDevices} wallets
                  </span>
                  <span className="text-white/35 block mt-0.5">
                    max {data.walletCreation.maxDevicesOnOneWallet} devices on
                    one account (sample)
                  </span>
                </p>
              </div>

              {data.walletCreation.recentWallets.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-white/70">
                    Recent wallets created
                  </h3>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="sticky top-0 bg-bg-card">
                        <tr className="text-white/35 border-b border-white/10">
                          <th className="py-2 pr-2">When</th>
                          <th className="py-2 pr-2">Code</th>
                          <th className="py-2 pr-2">Balance</th>
                          <th className="py-2 pr-2">PIN</th>
                          <th className="py-2 pr-2">Devices</th>
                          <th className="py-2">Trial</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/55">
                        {data.walletCreation.recentWallets.map((w) => (
                          <tr key={w.userId} className="border-b border-white/5">
                            <td className="py-1.5 pr-2 whitespace-nowrap">
                              {new Date(w.createdAt).toLocaleString()}
                            </td>
                            <td className="py-1.5 pr-2 font-mono text-neon-cyan/80">
                              {w.code}
                            </td>
                            <td className="py-1.5 pr-2 tabular-nums">
                              {w.balance.toLocaleString()}
                            </td>
                            <td className="py-1.5 pr-2">
                              {w.hasPin ? "yes" : "—"}
                            </td>
                            <td className="py-1.5 pr-2 tabular-nums">
                              {w.deviceCount}
                            </td>
                            <td className="py-1.5">
                              {w.trialCredited ? "yes" : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data.walletCreation.recentDevices.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-white/70">
                    Recent device → wallet bindings
                  </h3>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="sticky top-0 bg-bg-card">
                        <tr className="text-white/35 border-b border-white/10">
                          <th className="py-2 pr-2">Bound</th>
                          <th className="py-2 pr-2">Device</th>
                          <th className="py-2 pr-2">Wallet</th>
                          <th className="py-2">Via</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/55">
                        {data.walletCreation.recentDevices.map((d) => (
                          <tr
                            key={`${d.deviceId}-${d.boundAt}`}
                            className="border-b border-white/5"
                          >
                            <td className="py-1.5 pr-2 whitespace-nowrap">
                              {new Date(d.boundAt).toLocaleString()}
                            </td>
                            <td className="py-1.5 pr-2 font-mono text-white/40">
                              {d.deviceIdShort}
                            </td>
                            <td className="py-1.5 pr-2 font-mono text-neon-cyan/80">
                              {d.userCode}
                            </td>
                            <td className="py-1.5 text-white/40">
                              {d.boundVia ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data.walletCreation.recentTrialCredits.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-white/70">
                    Recent trial credits (7d)
                  </h3>
                  <div className="overflow-x-auto max-h-40 overflow-y-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="sticky top-0 bg-bg-card">
                        <tr className="text-white/35 border-b border-white/10">
                          <th className="py-2 pr-2">When</th>
                          <th className="py-2 pr-2">Wallet</th>
                          <th className="py-2">$POCK</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/55">
                        {data.walletCreation.recentTrialCredits.map((t, i) => (
                          <tr
                            key={`${t.userId}-${t.at}-${i}`}
                            className="border-b border-white/5"
                          >
                            <td className="py-1.5 pr-2 whitespace-nowrap">
                              {new Date(t.at).toLocaleString()}
                            </td>
                            <td className="py-1.5 pr-2 font-mono text-neon-cyan/80">
                              {t.code}
                            </td>
                            <td className="py-1.5 tabular-nums text-amber-200/80">
                              +{t.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

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

          <MemoryHierarchyPanel />

          <MediumMemoryPanel adminSession={session} />

          <CorrectAnswersPanel adminSession={session} />

          <TreasuryBuybackPanel adminSession={session} />

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