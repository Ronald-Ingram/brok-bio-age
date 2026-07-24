/**
 * Farm / anomaly metrics + Telegram/email alerts (Vercel cron + manual curl).
 */

import { brokEmailConfigured, sendBrokEmail } from "@/lib/brokEmail";
import { getServiceSupabase } from "@/lib/supabase/server";

export type FarmMetrics = {
  users_1h: number;
  users_15m: number;
  trials_1h: number;
  xfer_1h: number;
  release_1h: number;
  zero_trial_1h: number;
  users_total: number;
  kills_on: boolean;
  frozen_n: number;
  sink_xfer_1h: number;
};

export type FarmAlertResult = {
  ok: boolean;
  at: string;
  metrics: FarmMetrics;
  signals: string[];
  alerted: boolean;
  channels: { telegram: boolean; email: boolean };
  suppressed?: boolean;
};

function thr(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function hoursAgoIso(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function minutesAgoIso(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function headCount(build: (from: any) => any): Promise<number> {
  const supabase = getServiceSupabase();
  const q = build(supabase.from.bind(supabase));
  const { count, error } = await q;
  if (error) {
    console.warn("[farmAnomaly] count:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function collectFarmMetrics(): Promise<FarmMetrics> {
  const t1h = hoursAgoIso(1);
  const t15m = minutesAgoIso(15);

  const users_1h = await headCount((from) =>
    from("brok_users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", t1h)
  );
  const users_15m = await headCount((from) =>
    from("brok_users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", t15m)
  );
  const trials_1h = await headCount((from) =>
    from("pock_ledger")
      .select("id", { count: "exact", head: true })
      .eq("kind", "trial_credit")
      .gte("created_at", t1h)
  );
  const xfer_1h = await headCount((from) =>
    from("pock_ledger")
      .select("id", { count: "exact", head: true })
      .eq("kind", "transfer_out")
      .gte("created_at", t1h)
  );
  const release_1h = await headCount((from) =>
    from("pock_ledger")
      .select("id", { count: "exact", head: true })
      .eq("kind", "custody_release")
      .gte("created_at", t1h)
  );
  const zero_trial_1h = await headCount((from) =>
    from("brok_users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", t1h)
      .eq("trial_credited", true)
      .eq("pock_balance", 0)
  );
  const users_total = await headCount((from) =>
    from("brok_users").select("id", { count: "exact", head: true })
  );
  const frozen_n = await headCount((from) =>
    from("brok_users")
      .select("id", { count: "exact", head: true })
      .not("account_frozen_at", "is", null)
  );
  const sink_xfer_1h = await headCount((from) =>
    from("pock_ledger")
      .select("id", { count: "exact", head: true })
      .eq("kind", "transfer_out")
      .gte("created_at", t1h)
      .ilike("note", "%1cdaee38%")
  );

  let kills_on = true;
  try {
    const supabase = getServiceSupabase();
    const { data: switches } = await supabase
      .from("brok_kill_switches")
      .select("key, enabled")
      .in("key", ["trial_mint", "p2p_transfers"]);
    if (switches?.length) {
      kills_on = switches.every((s) => Boolean(s.enabled));
    }
  } catch {
    /* optional table */
  }

  return {
    users_1h,
    users_15m,
    trials_1h,
    xfer_1h,
    release_1h,
    zero_trial_1h,
    users_total,
    kills_on,
    frozen_n,
    sink_xfer_1h,
  };
}

export function evaluateFarmSignals(m: FarmMetrics): string[] {
  const alerts: string[] = [];
  if (m.users_1h >= thr("BROK_ALERT_USERS_1H", 40)) {
    alerts.push(
      `High wallet creates: ${m.users_1h}/hour (15m=${m.users_15m})`
    );
  }
  if (m.trials_1h >= thr("BROK_ALERT_TRIALS_1H", 25)) {
    alerts.push(`High trial credits: ${m.trials_1h}/hour`);
  }
  if (m.xfer_1h >= thr("BROK_ALERT_XFER_1H", 25)) {
    alerts.push(`High P2P transfer_out: ${m.xfer_1h}/hour`);
  }
  if (m.release_1h >= thr("BROK_ALERT_RELEASE_1H", 10)) {
    alerts.push(`High custody releases: ${m.release_1h}/hour`);
  }
  if (m.zero_trial_1h >= thr("BROK_ALERT_ZERO_TRIAL_1H", 20)) {
    alerts.push(
      `Farm signature: ${m.zero_trial_1h} new zero-balance trial wallets / hour`
    );
  }
  if (m.sink_xfer_1h > 0) {
    alerts.push(
      `Transfers mentioning sink 1cdaee38: ${m.sink_xfer_1h}/hour`
    );
  }
  // Kill switches intentionally OFF after reopen (min-reserve protects siphon).
  // Only warn if BROK_ALERT_EXPECT_KILLS_ON=1.
  const expectKills = ["1", "true", "on", "yes"].includes(
    (process.env.BROK_ALERT_EXPECT_KILLS_ON || "").trim().toLowerCase()
  );
  if (expectKills && !m.kills_on) {
    alerts.push("WARNING: trial_mint or p2p_transfers kill switch is OFF");
  }
  return alerts;
}

async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chat =
    process.env.BROK_ALERT_TELEGRAM_CHAT_ID?.trim() ||
    process.env.BROK_ALERT_TG_CHAT_ID?.trim() ||
    "6211143757";
  if (!token) {
    console.warn("[farmAnomaly] TELEGRAM_BOT_TOKEN not set");
    return false;
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chat,
          text: text.slice(0, 4000),
          disable_web_page_preview: true,
        }),
      }
    );
    if (!res.ok) {
      console.warn("[farmAnomaly] telegram", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[farmAnomaly] telegram error", e);
    return false;
  }
}

async function sendEmail(subject: string, body: string): Promise<boolean> {
  if (!brokEmailConfigured()) return false;
  const to =
    process.env.BROK_ALERT_EMAIL?.trim() ||
    process.env.BROK_INBOX_EMAIL?.trim() ||
    "info@neobanx.com";
  try {
    await sendBrokEmail({ to, subject, body });
    return true;
  } catch (e) {
    console.warn("[farmAnomaly] email error", e);
    return false;
  }
}

let lastAlertKey = "";
let lastAlertTs = 0;

export async function runFarmAnomalyCheck(opts?: {
  force?: boolean;
}): Promise<FarmAlertResult> {
  const at = new Date().toISOString();
  const metrics = await collectFarmMetrics();
  const signals = evaluateFarmSignals(metrics);
  const cooldownSec = thr("BROK_ALERT_COOLDOWN_SEC", 1800);

  if (!signals.length) {
    return {
      ok: true,
      at,
      metrics,
      signals: [],
      alerted: false,
      channels: { telegram: false, email: false },
    };
  }

  const key = signals.slice().sort().join("|");
  if (
    !opts?.force &&
    key === lastAlertKey &&
    Date.now() - lastAlertTs < cooldownSec * 1000
  ) {
    return {
      ok: true,
      at,
      metrics,
      signals,
      alerted: false,
      suppressed: true,
      channels: { telegram: false, email: false },
    };
  }

  const body = [
    "BROK anomaly alert (Vercel cron)",
    `UTC: ${at}`,
    "",
    "Signals:",
    ...signals.map((s) => `  • ${s}`),
    "",
    "Metrics (1h):",
    `  users_1h=${metrics.users_1h} trials_1h=${metrics.trials_1h} xfer_1h=${metrics.xfer_1h}`,
    `  release_1h=${metrics.release_1h} zero_trial_1h=${metrics.zero_trial_1h}`,
    `  users_total=${metrics.users_total} frozen=${metrics.frozen_n} kills_on=${metrics.kills_on}`,
    "",
    "Action: admin dashboard + kill switches + sink freezes.",
    "Docs: INCIDENT_TRIAL_FARM_KILL_2026-07-22.md",
  ].join("\n");

  const subject = `[BROK ALERT] ${signals[0]!.slice(0, 80)}`;
  const [telegram, email] = await Promise.all([
    sendTelegram(body),
    sendEmail(subject, body),
  ]);

  lastAlertKey = key;
  lastAlertTs = Date.now();

  return {
    ok: true,
    at,
    metrics,
    signals,
    alerted: telegram || email,
    channels: { telegram, email },
  };
}
