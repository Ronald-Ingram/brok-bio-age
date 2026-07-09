import { brokEmailConfigured, BROK_INBOX_EMAIL } from "@/lib/brokEmail";
import { NEOBANX_CORP_WALLET } from "@/lib/corpWalletConfig";
import { POCK_BUYBACK_PCT } from "@/lib/treasuryBuybackPolicy";
import {
  BROK_API_BASE,
  brokApiConfigured,
  cartesiaConfigured,
  heygenConfigured,
} from "@/lib/brokApiConfig";
import {
  DEFAULT_LLM_PROVIDER,
  MODEL_ROUTING,
} from "@/lib/modelRouterConfig";
import { getServiceSupabase } from "@/lib/supabase/server";
import { SUBSCRIPTION_TIERS } from "@/lib/subscriptionConfig";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function assertAdmin(req: Request): boolean {
  const secret = process.env.BROK_OG_ADMIN_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-brok-og-admin")?.trim() === secret;
}

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getServiceSupabase();

  const [
    usersRes,
    subsRes,
    ledgerRes,
    corpRes,
    canonRes,
    stripeEventsRes,
    stripePaymentsRes,
    balancesRes,
    buybackRes,
    highIqAlertsRes,
  ] = await Promise.all([
    supabase.from("brok_users").select("id", { count: "exact", head: true }),
    supabase
      .from("brok_users")
      .select("id", { count: "exact", head: true })
      .eq("subscription_active", true),
    supabase
      .from("pock_ledger")
      .select("kind, amount, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("corp_pock_wallet")
      .select("float_remaining, float_allocated, wallet_address, updated_at")
      .eq("id", "neobanx")
      .maybeSingle(),
    supabase.from("core_knowledge").select("id", { count: "exact", head: true }),
    supabase
      .from("stripe_subscription_events")
      .select("tier, event_kind, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("stripe_payments")
      .select("stripe_session_id, user_id, pock_amount, amount_cents, created_at"),
    supabase
      .from("brok_users")
      .select("pock_balance, custody_status, on_chain_pock_balance"),
    supabase
      .from("treasury_buyback_accruals")
      .select("buyback_usd_cents, gross_usd_cents, status, product_line, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    (async () => {
      const { data: flags, error: flagErr } = await supabase
        .from("brok_querent_flags")
        .select("user_id")
        .eq("high_iq", true);
      if (flagErr) return { count: 0, error: flagErr };
      const ids = (flags ?? []).map((f) => f.user_id);
      if (!ids.length) return { count: 0 };
      return supabase
        .from("brok_chat_log")
        .select("id", { count: "exact", head: true })
        .in("user_id", ids)
        .eq("high_iq_alerted", false);
    })(),
  ]);

  const ledger = ledgerRes.data ?? [];
  const stripeCredits = ledger.filter((e) => e.kind === "stripe_credit");
  const stripePayments = stripePaymentsRes.data ?? [];
  const userBalances = balancesRes.data ?? [];

  const totalReservedPock = userBalances
    .filter((u) => u.custody_status === "reserved")
    .reduce((sum, u) => sum + Number(u.pock_balance ?? 0), 0);
  const totalLedgerPock = userBalances.reduce(
    (sum, u) => sum + Number(u.pock_balance ?? 0),
    0
  );
  const totalOnChainQueued = userBalances.reduce(
    (sum, u) => sum + Number(u.on_chain_pock_balance ?? 0),
    0
  );
  const totalUsdCents = stripePayments.reduce(
    (sum, p) => sum + Number(p.amount_cents ?? 0),
    0
  );
  const totalPockFromStripe = stripePayments.reduce(
    (sum, p) => sum + Number(p.pock_amount ?? 0),
    0
  );
  const buybackAccruals = buybackRes.data ?? [];
  const buybackAccruedUsd = buybackAccruals
    .filter((a) => a.status === "accrued" || a.status === "queued")
    .reduce((sum, a) => sum + Number(a.buyback_usd_cents ?? 0), 0) / 100;
  const buybackExecutedUsd = buybackAccruals
    .filter((a) => a.status === "executed")
    .reduce((sum, a) => sum + Number(a.buyback_usd_cents ?? 0), 0) / 100;
  const buybackObligationUsd = Math.round(totalUsdCents * POCK_BUYBACK_PCT) / 100;
  const buybackUnaccruedUsd = Math.max(
    0,
    buybackObligationUsd - buybackAccruedUsd - buybackExecutedUsd
  );
  const meterDebits = ledger.filter((e) => e.kind === "meter_debit");
  const calcDebits = ledger.filter((e) => e.kind === "calc_debit");

  const revenueEstimateUsd = SUBSCRIPTION_TIERS.reduce((acc, t) => {
    const count =
      stripeEventsRes.data?.filter(
        (e) => e.tier === t.id && e.event_kind === "checkout"
      ).length ?? 0;
    return acc + count * t.priceUsd;
  }, 0);

  let brokHealth: Record<string, unknown> | null = null;
  if (brokApiConfigured()) {
    try {
      const h = await fetch(`${BROK_API_BASE}/health`, { next: { revalidate: 0 } });
      if (h.ok) brokHealth = await h.json();
    } catch {
      brokHealth = { status: "unreachable" };
    }
  }

  const highIqPending =
    (highIqAlertsRes as { count?: number })?.count ?? 0;

  const integrations = {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    supabase: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    brokApi: brokApiConfigured(),
    cartesia: cartesiaConfigured(),
    heygen: heygenConfigured(),
    twilio: Boolean(process.env.TWILIO_ACCOUNT_SID),
    brokEmail: brokEmailConfigured(),
  };

  const outages = Object.entries(integrations)
    .filter(([, ok]) => !ok)
    .map(([name]) => `${name} not configured`);

  if (brokHealth && (brokHealth as { status?: string }).status === "unreachable") {
    outages.push("BROK API unreachable");
  }

  if (highIqPending > 0) {
    outages.push(`${highIqPending} unanswered question(s) from High IQ? querents`);
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    users: { total: usersRes.count ?? 0, subscribed: subsRes.count ?? 0 },
    pock: {
      corpFloat: corpRes.data?.float_remaining ?? null,
      corpAllocated: corpRes.data?.float_allocated ?? null,
      corpWallet: corpRes.data?.wallet_address ?? NEOBANX_CORP_WALLET,
      stripeTopUps: stripeCredits.length,
      meterUsageEvents: meterDebits.length,
      calcEvents: calcDebits.length,
    },
    treasury: {
      stripePaymentCount: stripePayments.length,
      stripeUsdCollected: Math.round(totalUsdCents) / 100,
      buybackPolicyPct: POCK_BUYBACK_PCT,
      buybackAccruedUsd,
      buybackExecutedUsd,
      buybackObligationUsd,
      buybackUnaccruedUsd,
      buybackAccrualCount: buybackAccruals.length,
      stripePockIssued: totalPockFromStripe,
      userLedgerPockTotal: totalLedgerPock,
      userReservedPockTotal: totalReservedPock,
      onChainQueuedPock: totalOnChainQueued,
      recentStripePayments: [...stripePayments]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 25)
        .map((p) => ({
        sessionId: p.stripe_session_id,
        userId: p.user_id,
        pockAmount: p.pock_amount,
        usd: p.amount_cents != null ? p.amount_cents / 100 : null,
        at: p.created_at,
      })),
    },
    kironCanon: {
      documents: canonRes.error ? 0 : (canonRes.count ?? 0),
      error: canonRes.error?.message ?? null,
    },
    revenue: {
      subscriptionCheckoutsTracked: stripeEventsRes.data?.length ?? 0,
      estimatedFirstMonthUsd: revenueEstimateUsd,
      tiers: SUBSCRIPTION_TIERS.map((t) => ({
        id: t.id,
        name: t.name,
        priceUsd: t.priceUsd,
      })),
    },
    models: {
      activeProvider: DEFAULT_LLM_PROVIDER,
      routes: MODEL_ROUTING,
    },
    integrations,
    brokHealth,
    outages,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    qa: {
      highIqPendingAlerts: highIqPending,
      brokInbox: BROK_INBOX_EMAIL,
      brokEmailConfigured: brokEmailConfigured(),
    },
  });
}