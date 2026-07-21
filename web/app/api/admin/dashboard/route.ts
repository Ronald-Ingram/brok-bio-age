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
import { assertAdmin } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getServiceSupabase();
  const now = Date.now();
  const since24h = new Date(now - 24 * 3600 * 1000).toISOString();
  const since7d = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

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
    users24hRes,
    users7dRes,
    trialLedgerRes,
    deviceBindingsRes,
    recentWalletsRes,
    recentBindingsRes,
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
    // core_knowledge has no `id` column (tags + content + created_at) — selecting id zeroes the count.
    supabase
      .from("core_knowledge")
      .select("tags", { count: "exact", head: true }),
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
    supabase
      .from("brok_users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    supabase
      .from("brok_users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d),
    // Recent trial credits (monitor free-credit minting / abuse)
    supabase
      .from("pock_ledger")
      .select("user_id, amount, created_at, note")
      .eq("kind", "trial_credit")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("brok_device_bindings")
      .select("device_id", { count: "exact", head: true }),
    supabase
      .from("brok_users")
      .select(
        "id, pock_balance, trial_credited, account_reveal_password_hash, display_name, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("brok_device_bindings")
      .select("device_id, user_id, bound_at, bound_via")
      .order("bound_at", { ascending: false })
      .limit(200),
  ]);

  const ledger = ledgerRes.data ?? [];
  const stripeCredits = ledger.filter((e) => e.kind === "stripe_credit");
  const stripePayments = stripePaymentsRes.data ?? [];
  const userBalances = balancesRes.data ?? [];

  /** Real Stripe Checkout only — exclude invite/vendor/ops rows that reuse stripe_payments. */
  const isStripeCheckoutSession = (sessionId: string | null | undefined) =>
    Boolean(sessionId && /^cs_(live|test)_/.test(sessionId));
  const cardPayments = stripePayments.filter((p) =>
    isStripeCheckoutSession(p.stripe_session_id as string)
  );

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
  // Cash collected via Stripe Checkout only (not vendor admin credits with amount_cents).
  const totalUsdCents = cardPayments.reduce(
    (sum, p) => sum + Number(p.amount_cents ?? 0),
    0
  );
  const totalPockFromStripe = cardPayments.reduce(
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

  const trialRows = trialLedgerRes.data ?? [];
  const trialIn24h = trialRows.filter(
    (r) => new Date(r.created_at).getTime() >= now - 24 * 3600 * 1000
  );
  const trialIn7d = trialRows.filter(
    (r) => new Date(r.created_at).getTime() >= now - 7 * 24 * 3600 * 1000
  );
  const sumAmt = (rows: { amount?: number | null }[]) =>
    rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  // Recent bindings sample (up to 200) for device↔wallet listing + multi-device counts
  const bindingSample = recentBindingsRes.data ?? [];
  const bindingsByUser = new Map<string, number>();
  for (const b of bindingSample) {
    const uid = String(b.user_id);
    bindingsByUser.set(uid, (bindingsByUser.get(uid) ?? 0) + 1);
  }
  // Each device_id is unique → one current wallet per device.
  // usersWithMultipleDevices = wallets that have linked several browsers (sample window).
  let usersWithMultipleDevices = 0;
  let maxDevicesOnOneWallet = 0;
  for (const n of bindingsByUser.values()) {
    if (n > 1) usersWithMultipleDevices += 1;
    if (n > maxDevicesOnOneWallet) maxDevicesOnOneWallet = n;
  }

  const recentWallets = (recentWalletsRes.data ?? []).map((u) => {
    const id = String(u.id);
    const compact = id.replace(/-/g, "").slice(0, 8).toUpperCase();
    return {
      code: `BROK-${compact}`,
      userId: id,
      balance: Number(u.pock_balance ?? 0),
      trialCredited: Boolean(u.trial_credited),
      hasPin: Boolean(u.account_reveal_password_hash),
      deviceCount: bindingsByUser.get(id) ?? 0,
      displayName: (u.display_name as string | null) ?? null,
      createdAt: String(u.created_at),
      updatedAt: String(u.updated_at),
    };
  });

  const recentDevices = bindingSample.slice(0, 40).map((b) => {
    const uid = String(b.user_id);
    const compact = uid.replace(/-/g, "").slice(0, 8).toUpperCase();
    const dev = String(b.device_id);
    return {
      deviceIdShort: `${dev.slice(0, 8)}…${dev.slice(-4)}`,
      deviceId: dev,
      userCode: `BROK-${compact}`,
      userId: uid,
      boundAt: String(b.bound_at),
      boundVia: (b.bound_via as string | null) ?? null,
    };
  });

  const walletsCreated24h = users24hRes.count ?? 0;
  const trialCredits24h = trialIn24h.length;
  // Soft alert: many new trial wallets in a day may mean storage-clear farming
  if (trialCredits24h >= 25 || walletsCreated24h >= 30) {
    outages.push(
      `Elevated free-wallet rate: ${walletsCreated24h} wallets / ${trialCredits24h} trial credits in 24h — monitor abuse`
    );
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    users: {
      total: usersRes.count ?? 0,
      subscribed: subsRes.count ?? 0,
      created24h: walletsCreated24h,
      created7d: users7dRes.count ?? 0,
    },
    walletCreation: {
      note:
        "Each new browser identity can mint one trial (+100 $POCK). Clearing site data creates a new device id → new wallet. Not permanent free credit policy — monitor only.",
      walletsTotal: usersRes.count ?? 0,
      walletsCreated24h,
      walletsCreated7d: users7dRes.count ?? 0,
      trialCredits24h,
      trialCredits7d: trialIn7d.length,
      trialPock24h: sumAmt(trialIn24h),
      trialPock7d: sumAmt(trialIn7d),
      // Sample window from last 200 trial_credit rows (not full history if older)
      trialCreditsSampled: trialRows.length,
      trialPockSampled: sumAmt(trialRows),
      deviceBindingsTotal: deviceBindingsRes.count ?? 0,
      usersWithMultipleDevices,
      maxDevicesOnOneWallet,
      /** 1:1 today: one browser device_id binds to one wallet at a time */
      avgWalletsPerBoundDevice: 1,
      recentWallets,
      recentDevices,
      recentTrialCredits: trialIn7d.slice(0, 25).map((r) => {
        const uid = String(r.user_id);
        const compact = uid.replace(/-/g, "").slice(0, 8).toUpperCase();
        return {
          code: `BROK-${compact}`,
          userId: uid,
          amount: Number(r.amount ?? 0),
          at: String(r.created_at),
          note: (r.note as string | null) ?? null,
        };
      }),
    },
    pock: {
      corpFloat: corpRes.data?.float_remaining ?? null,
      corpAllocated: corpRes.data?.float_allocated ?? null,
      corpWallet: corpRes.data?.wallet_address ?? NEOBANX_CORP_WALLET,
      stripeTopUps: stripeCredits.length,
      meterUsageEvents: meterDebits.length,
      calcEvents: calcDebits.length,
    },
    treasury: {
      stripePaymentCount: cardPayments.length,
      /** USD from real Stripe Checkout (cs_live_/cs_test_) only — not vendor/ops credits */
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
      recentStripePayments: [...cardPayments]
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
      // Full core_knowledge row count (Canon books + FAQs + strategic docs).
      note:
        "Includes Kiron Canon manuscripts, FAQ truth rows, and strategic core_knowledge docs",
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