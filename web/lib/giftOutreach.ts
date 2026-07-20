/**
 * First-receive gift activation outreach + day-5 circle-back + engagement.
 * One lifecycle per account (not on subsequent gifts).
 */

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { brokEmailConfigured, sendBrokEmail, BROK_INBOX_EMAIL } from "@/lib/brokEmail";
import {
  dailyOpsReportEmail,
  day0ActivationEmail,
  day0ActivationSms,
  day5CircleBackEmail,
  day5CircleBackSms,
} from "@/lib/giftOutreachCopy";
import type { PockInvitePayload } from "@/lib/pockInvite";
import { inviteKeyFromToken } from "@/lib/pockGiftClaimServer";
import { isTwilioConfigured, sendSms } from "@/lib/twilioSms";
import { displayAccountNumber } from "@/lib/pockAccount";

/** Days after first claim before circle-back if still unengaged. */
export const CIRCLE_BACK_DAYS = 5;

export type FeedbackSource = "day0" | "day5" | "in_app" | "chat" | "email_reply";

export interface GiftOutreachRow {
  id: string;
  user_id: string;
  invite_id: string | null;
  amount: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  first_claimed_at: string;
  day0_sent_at: string | null;
  day5_sent_at: string | null;
  engaged_at: string | null;
  in_app_notice_pending: boolean;
  day5_in_app_pending: boolean;
}

function isMissingTable(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const m = (err.message ?? "").toLowerCase();
  return (
    err.code === "42P01" ||
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table")
  );
}

export function tokenHashFromInviteToken(token: string): string {
  return inviteKeyFromToken(token);
}

export async function recordPockInvite(
  supabase: SupabaseClient,
  opts: {
    token: string;
    kind: "gift" | "transfer";
    senderId: string;
    amount: number;
    recipientName?: string | null;
    recipientEmail?: string | null;
    recipientPhone?: string | null;
    expiresAtMs: number;
    claimedUserId?: string | null;
  }
): Promise<string | null> {
  const tokenHash = tokenHashFromInviteToken(opts.token);
  const row = {
    token_hash: tokenHash,
    kind: opts.kind,
    sender_id: opts.senderId,
    amount: opts.amount,
    recipient_name: opts.recipientName ?? null,
    recipient_email: opts.recipientEmail?.trim().toLowerCase() || null,
    recipient_phone: opts.recipientPhone ?? null,
    recipient_user_id: opts.claimedUserId ?? null,
    claimed_at: opts.claimedUserId ? new Date().toISOString() : null,
    expires_at: new Date(opts.expiresAtMs).toISOString(),
  };
  const { data, error } = await supabase
    .from("pock_invites")
    .upsert(row, { onConflict: "token_hash" })
    .select("id")
    .maybeSingle();
  if (error) {
    if (!isMissingTable(error)) {
      console.warn("[gift_outreach] recordPockInvite:", error.message);
    }
    return null;
  }
  return (data?.id as string) ?? null;
}

export async function countPriorInviteCredits(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("stripe_payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .like("stripe_session_id", "invite-%");
  if (error) {
    console.warn("[gift_outreach] countPriorInviteCredits:", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * After a successful first gift/transfer credit — create outreach + send day-0.
 * Subsequent claims for the same user are no-ops (unique user_id).
 */
export async function onFirstGiftReceive(opts: {
  supabase: SupabaseClient;
  userId: string;
  token: string;
  payload: PockInvitePayload;
  alreadyClaimed: boolean;
}): Promise<{ firstReceive: boolean; outreachId?: string }> {
  const { supabase, userId, token, payload, alreadyClaimed } = opts;
  if (alreadyClaimed) return { firstReceive: false };

  // Count includes the row just inserted → first receive when count === 1
  const prior = await countPriorInviteCredits(supabase, userId);
  if (prior > 1) return { firstReceive: false };

  const inviteId = await recordPockInvite(supabase, {
    token,
    kind: payload.kind === "gift" ? "gift" : "transfer",
    senderId: payload.senderId,
    amount: payload.amount,
    recipientName: payload.recipientName,
    recipientEmail: payload.email,
    recipientPhone: payload.phone,
    expiresAtMs: payload.exp,
    claimedUserId: userId,
  });

  const contactEmail = payload.email?.trim().toLowerCase() || null;
  const contactPhone = payload.phone?.trim() || null;

  const { data: existing } = await supabase
    .from("gift_outreach")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.id) {
    return { firstReceive: false, outreachId: existing.id as string };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("gift_outreach")
    .insert({
      user_id: userId,
      invite_id: inviteId,
      amount: payload.amount,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      first_claimed_at: new Date().toISOString(),
      in_app_notice_pending: true,
    })
    .select("id")
    .maybeSingle();

  if (insErr) {
    if (insErr.code === "23505") {
      // race — another request created the row
      return { firstReceive: false };
    }
    if (!isMissingTable(insErr)) {
      console.warn("[gift_outreach] insert:", insErr.message);
    }
    return { firstReceive: true };
  }

  const outreachId = inserted?.id as string | undefined;
  await sendDay0Outreach(supabase, {
    userId,
    outreachId,
    contactEmail,
    contactPhone,
    recipientName: payload.recipientName,
    amount: payload.amount,
  });

  return { firstReceive: true, outreachId };
}

async function sendDay0Outreach(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    outreachId?: string;
    contactEmail: string | null;
    contactPhone: string | null;
    recipientName?: string | null;
    amount?: number | null;
  }
): Promise<void> {
  let channel: string | null = null;
  let status = "in_app_only";

  if (opts.contactEmail && brokEmailConfigured()) {
    try {
      const msg = day0ActivationEmail({
        recipientName: opts.recipientName,
        amount: opts.amount,
      });
      await sendBrokEmail({
        to: opts.contactEmail,
        subject: msg.subject,
        body: msg.body,
      });
      channel = "email";
      status = "sent";
    } catch (e) {
      status = `email_failed:${e instanceof Error ? e.message : "error"}`.slice(
        0,
        120
      );
      console.warn("[gift_outreach] day0 email:", status);
    }
  }

  if (!channel && opts.contactPhone && isTwilioConfigured()) {
    try {
      const r = await sendSms(opts.contactPhone, day0ActivationSms({ amount: opts.amount }));
      if (r.sent) {
        channel = "sms";
        status = "sent";
      } else {
        status = `sms_failed:${r.error ?? "unknown"}`.slice(0, 120);
      }
    } catch (e) {
      status = `sms_failed:${e instanceof Error ? e.message : "error"}`.slice(0, 120);
    }
  }

  if (opts.outreachId) {
    await supabase
      .from("gift_outreach")
      .update({
        day0_sent_at: new Date().toISOString(),
        day0_channel: channel ?? "in_app",
        day0_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", opts.outreachId);
  }
}

export async function markGiftEngaged(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("gift_outreach")
    .update({
      engaged_at: now,
      in_app_notice_pending: false,
      day5_in_app_pending: false,
      updated_at: now,
    })
    .eq("user_id", userId)
    .is("engaged_at", null);
  if (error && !isMissingTable(error)) {
    console.warn("[gift_outreach] markEngaged:", error.message);
  }
}

export async function userHasChatActivity(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("brok_chat_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .limit(1);
  if ((count ?? 0) > 0) return true;

  const { count: tCount } = await supabase
    .from("brok_chat_threads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .limit(1);
  return (tCount ?? 0) > 0;
}

/** Backfill outreach rows for historical invite claims missing a lifecycle. */
export async function backfillGiftOutreachFromClaims(
  supabase: SupabaseClient
): Promise<{ created: number }> {
  const { data: payments, error } = await supabase
    .from("stripe_payments")
    .select("user_id, pock_amount, created_at, stripe_session_id")
    .like("stripe_session_id", "invite-%")
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) {
    if (!isMissingTable(error)) console.warn("[gift_outreach] backfill list:", error.message);
    return { created: 0 };
  }

  const firstByUser = new Map<
    string,
    { amount: number; claimedAt: string }
  >();
  for (const p of payments ?? []) {
    const uid = p.user_id as string;
    if (!uid || firstByUser.has(uid)) continue;
    firstByUser.set(uid, {
      amount: Number(p.pock_amount ?? 0),
      claimedAt: p.created_at as string,
    });
  }

  let created = 0;
  for (const [userId, info] of firstByUser) {
    const { data: exists } = await supabase
      .from("gift_outreach")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (exists) continue;

    const engaged = await userHasChatActivity(supabase, userId);
    const claimedMs = new Date(info.claimedAt).getTime();
    const ageDays = (Date.now() - claimedMs) / (86400 * 1000);
    const needsDay5 = !engaged && ageDays >= CIRCLE_BACK_DAYS;

    const { error: insErr } = await supabase.from("gift_outreach").insert({
      user_id: userId,
      amount: info.amount,
      first_claimed_at: info.claimedAt,
      in_app_notice_pending: !engaged,
      day5_in_app_pending: needsDay5,
      engaged_at: engaged ? new Date().toISOString() : null,
      day0_channel: "backfill",
      day0_status: "historical_no_contact",
      day0_sent_at: info.claimedAt,
    });
    if (!insErr) created += 1;
  }
  return { created };
}

export async function runDay5CircleBacks(
  supabase: SupabaseClient
): Promise<{ sent: number; queuedInApp: number; skipped: number }> {
  const cutoff = new Date(
    Date.now() - CIRCLE_BACK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: due, error } = await supabase
    .from("gift_outreach")
    .select("*")
    .is("day5_sent_at", null)
    .is("engaged_at", null)
    .lte("first_claimed_at", cutoff)
    .limit(200);

  if (error) {
    if (!isMissingTable(error)) console.warn("[gift_outreach] day5 query:", error.message);
    return { sent: 0, queuedInApp: 0, skipped: 0 };
  }

  let sent = 0;
  let queuedInApp = 0;
  let skipped = 0;

  for (const row of due ?? []) {
    const userId = row.user_id as string;
    // Re-check engagement (chat after claim)
    if (await userHasChatActivity(supabase, userId)) {
      await markGiftEngaged(supabase, userId);
      skipped += 1;
      continue;
    }

    let channel: string | null = null;
    let status = "in_app_only";
    const email = (row.contact_email as string | null)?.trim() || null;
    const phone = (row.contact_phone as string | null)?.trim() || null;
    const amount = row.amount as number | null;

    if (email && brokEmailConfigured()) {
      try {
        const msg = day5CircleBackEmail({ amount });
        await sendBrokEmail({ to: email, subject: msg.subject, body: msg.body });
        channel = "email";
        status = "sent";
        sent += 1;
      } catch (e) {
        status = `email_failed:${e instanceof Error ? e.message : "error"}`.slice(0, 120);
      }
    } else if (phone && isTwilioConfigured()) {
      const r = await sendSms(phone, day5CircleBackSms());
      if (r.sent) {
        channel = "sms";
        status = "sent";
        sent += 1;
      } else {
        status = `sms_failed:${r.error ?? "unknown"}`.slice(0, 120);
      }
    } else {
      queuedInApp += 1;
    }

    await supabase
      .from("gift_outreach")
      .update({
        day5_sent_at: new Date().toISOString(),
        day5_channel: channel ?? "in_app",
        day5_status: status,
        day5_in_app_pending: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }

  return { sent, queuedInApp, skipped };
}

export async function saveOnboardingFeedback(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    source: FeedbackSource;
    easeScore?: number | null;
    questions?: string | null;
    suggestions?: string | null;
    whyNotEngaged?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ease =
    opts.easeScore == null
      ? null
      : Math.min(10, Math.max(1, Math.round(Number(opts.easeScore))));

  const { error } = await supabase.from("brok_onboarding_feedback").insert({
    user_id: opts.userId,
    account_code: displayAccountNumber(opts.userId),
    source: opts.source,
    ease_score: ease,
    questions: opts.questions?.trim() || null,
    suggestions: opts.suggestions?.trim() || null,
    why_not_engaged: opts.whyNotEngaged?.trim() || null,
  });

  if (error) {
    if (isMissingTable(error)) {
      return { ok: false, error: "migration_required_023" };
    }
    return { ok: false, error: error.message };
  }

  // Seeing the form counts as light engagement for day0 path only if they chat later.
  // Submitting feedback marks day0 notice done.
  if (opts.source === "day0" || opts.source === "in_app") {
    await supabase
      .from("gift_outreach")
      .update({
        in_app_notice_pending: false,
        in_app_notice_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", opts.userId);
  }
  if (opts.source === "day5") {
    await supabase
      .from("gift_outreach")
      .update({
        day5_in_app_pending: false,
        day5_in_app_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", opts.userId);
  }

  return { ok: true };
}

export async function getPendingActivationNotice(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  pending: boolean;
  kind: "day0" | "day5" | null;
  amount: number | null;
  firstClaimedAt: string | null;
}> {
  const { data, error } = await supabase
    .from("gift_outreach")
    .select(
      "amount, first_claimed_at, in_app_notice_pending, day5_in_app_pending, engaged_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { pending: false, kind: null, amount: null, firstClaimedAt: null };
  }
  if (data.engaged_at) {
    return { pending: false, kind: null, amount: null, firstClaimedAt: null };
  }
  if (data.day5_in_app_pending) {
    return {
      pending: true,
      kind: "day5",
      amount: data.amount as number | null,
      firstClaimedAt: data.first_claimed_at as string,
    };
  }
  if (data.in_app_notice_pending) {
    return {
      pending: true,
      kind: "day0",
      amount: data.amount as number | null,
      firstClaimedAt: data.first_claimed_at as string,
    };
  }
  return { pending: false, kind: null, amount: null, firstClaimedAt: null };
}

export async function dismissActivationNotice(
  supabase: SupabaseClient,
  userId: string,
  kind: "day0" | "day5"
): Promise<void> {
  const now = new Date().toISOString();
  if (kind === "day0") {
    await supabase
      .from("gift_outreach")
      .update({
        in_app_notice_pending: false,
        in_app_notice_seen_at: now,
        updated_at: now,
      })
      .eq("user_id", userId);
  } else {
    await supabase
      .from("gift_outreach")
      .update({
        day5_in_app_pending: false,
        day5_in_app_seen_at: now,
        updated_at: now,
      })
      .eq("user_id", userId);
  }
}

export interface DailyReport {
  generatedAt: string;
  windowHours: number;
  feedback: {
    count: number;
    avgEase: number | null;
    easeHistogram: Record<string, number>;
    questions: { accountCode: string; text: string; source: string }[];
    suggestions: { accountCode: string; text: string; source: string }[];
    whyNot: { accountCode: string; text: string }[];
  };
  outreach: {
    firstReceivesInWindow: number;
    day0Sent: number;
    day5Sent: number;
    pendingInAppDay0: number;
    pendingInAppDay5: number;
    unengaged: number;
  };
  usageByAccount: {
    accountCode: string;
    chatTurns24h: number;
    giftReceived: boolean;
    subscribed: boolean;
    balance: number;
    engaged: boolean | null;
  }[];
  summaryText: string;
}

export async function buildDailyFeedbackUsageReport(
  supabase: SupabaseClient,
  windowHours = 24
): Promise<DailyReport> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const generatedAt = new Date().toISOString();

  const { data: feedbackRows } = await supabase
    .from("brok_onboarding_feedback")
    .select(
      "account_code, source, ease_score, questions, suggestions, why_not_engaged, created_at"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  const scores = (feedbackRows ?? [])
    .map((r) => r.ease_score as number | null)
    .filter((n): n is number => typeof n === "number");
  const hist: Record<string, number> = {};
  for (let i = 1; i <= 10; i++) hist[String(i)] = 0;
  for (const s of scores) hist[String(s)] = (hist[String(s)] ?? 0) + 1;
  const avgEase =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

  const questions = (feedbackRows ?? [])
    .filter((r) => (r.questions as string | null)?.trim())
    .map((r) => ({
      accountCode: (r.account_code as string) || "—",
      text: String(r.questions).slice(0, 500),
      source: String(r.source),
    }));
  const suggestions = (feedbackRows ?? [])
    .filter((r) => (r.suggestions as string | null)?.trim())
    .map((r) => ({
      accountCode: (r.account_code as string) || "—",
      text: String(r.suggestions).slice(0, 500),
      source: String(r.source),
    }));
  const whyNot = (feedbackRows ?? [])
    .filter((r) => (r.why_not_engaged as string | null)?.trim())
    .map((r) => ({
      accountCode: (r.account_code as string) || "—",
      text: String(r.why_not_engaged).slice(0, 500),
    }));

  const { count: firstReceives } = await supabase
    .from("gift_outreach")
    .select("id", { count: "exact", head: true })
    .gte("first_claimed_at", since);

  const { count: day0Sent } = await supabase
    .from("gift_outreach")
    .select("id", { count: "exact", head: true })
    .gte("day0_sent_at", since);

  const { count: day5Sent } = await supabase
    .from("gift_outreach")
    .select("id", { count: "exact", head: true })
    .gte("day5_sent_at", since);

  const { count: pendingDay0 } = await supabase
    .from("gift_outreach")
    .select("id", { count: "exact", head: true })
    .eq("in_app_notice_pending", true);

  const { count: pendingDay5 } = await supabase
    .from("gift_outreach")
    .select("id", { count: "exact", head: true })
    .eq("day5_in_app_pending", true);

  const { count: unengaged } = await supabase
    .from("gift_outreach")
    .select("id", { count: "exact", head: true })
    .is("engaged_at", null);

  // Usage: chat turns in window by user (anonymous account codes)
  const { data: chatLogs } = await supabase
    .from("brok_chat_log")
    .select("user_id")
    .gte("created_at", since)
    .limit(5000);

  const chatByUser = new Map<string, number>();
  for (const row of chatLogs ?? []) {
    const uid = row.user_id as string;
    if (!uid) continue;
    chatByUser.set(uid, (chatByUser.get(uid) ?? 0) + 1);
  }

  const userIds = [...chatByUser.keys()].slice(0, 100);
  const usageByAccount: DailyReport["usageByAccount"] = [];

  if (userIds.length) {
    const { data: users } = await supabase
      .from("brok_users")
      .select("id, pock_balance, subscription_active")
      .in("id", userIds);

    const { data: outreach } = await supabase
      .from("gift_outreach")
      .select("user_id, engaged_at")
      .in("user_id", userIds);

    const outreachMap = new Map(
      (outreach ?? []).map((o) => [o.user_id as string, o.engaged_at as string | null])
    );
    const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));

    for (const uid of userIds) {
      const u = userMap.get(uid);
      usageByAccount.push({
        accountCode: displayAccountNumber(uid),
        chatTurns24h: chatByUser.get(uid) ?? 0,
        giftReceived: outreachMap.has(uid),
        subscribed: Boolean(u?.subscription_active),
        balance: Number(u?.pock_balance ?? 0),
        engaged: outreachMap.has(uid)
          ? outreachMap.get(uid) != null
          : null,
      });
    }
    usageByAccount.sort((a, b) => b.chatTurns24h - a.chatTurns24h);
  }

  const lines = [
    `BROK daily feedback & usage report`,
    `Generated: ${generatedAt}`,
    `Window: last ${windowHours}h`,
    ``,
    `--- Feedback ---`,
    `Responses: ${(feedbackRows ?? []).length}`,
    `Avg onboard ease (1–10): ${avgEase ?? "n/a"}`,
    `Ease histogram: ${JSON.stringify(hist)}`,
    ``,
    `Questions (${questions.length}):`,
    ...questions.map((q) => `  [${q.accountCode}] (${q.source}) ${q.text}`),
    ``,
    `Suggestions (${suggestions.length}):`,
    ...suggestions.map((s) => `  [${s.accountCode}] (${s.source}) ${s.text}`),
    ``,
    `Why not engaged (${whyNot.length}):`,
    ...whyNot.map((w) => `  [${w.accountCode}] ${w.text}`),
    ``,
    `--- Gift outreach ---`,
    `First receives: ${firstReceives ?? 0}`,
    `Day-0 sends (window): ${day0Sent ?? 0}`,
    `Day-5 circle-backs (window): ${day5Sent ?? 0}`,
    `Pending in-app day0: ${pendingDay0 ?? 0}`,
    `Pending in-app day5: ${pendingDay5 ?? 0}`,
    `Still unengaged (all-time gift cohort): ${unengaged ?? 0}`,
    ``,
    `--- Usage per account (no names) ---`,
    ...usageByAccount.map(
      (u) =>
        `  ${u.accountCode} · chats=${u.chatTurns24h} · gift=${u.giftReceived ? "Y" : "n"} · sub=${u.subscribed ? "Y" : "n"} · bal=${u.balance} · engaged=${u.engaged === null ? "n/a" : u.engaged ? "Y" : "n"}`
    ),
    ``,
    `— BROK ops`,
  ];

  return {
    generatedAt,
    windowHours,
    feedback: {
      count: (feedbackRows ?? []).length,
      avgEase,
      easeHistogram: hist,
      questions,
      suggestions,
      whyNot,
    },
    outreach: {
      firstReceivesInWindow: firstReceives ?? 0,
      day0Sent: day0Sent ?? 0,
      day5Sent: day5Sent ?? 0,
      pendingInAppDay0: pendingDay0 ?? 0,
      pendingInAppDay5: pendingDay5 ?? 0,
      unengaged: unengaged ?? 0,
    },
    usageByAccount,
    summaryText: lines.join("\n"),
  };
}

export async function emailDailyReport(
  supabase: SupabaseClient
): Promise<{ emailed: boolean; error?: string }> {
  const report = await buildDailyFeedbackUsageReport(supabase, 24);
  const to =
    process.env.BROK_REPORT_EMAIL?.trim() ||
    process.env.BROK_INBOX_EMAIL?.trim() ||
    BROK_INBOX_EMAIL;

  if (!brokEmailConfigured()) {
    return { emailed: false, error: "brok_email_not_configured" };
  }
  try {
    const msg = dailyOpsReportEmail(report.summaryText);
    await sendBrokEmail({ to, subject: msg.subject, body: msg.body });
    return { emailed: true };
  } catch (e) {
    return {
      emailed: false,
      error: e instanceof Error ? e.message : "send_failed",
    };
  }
}

/** Hash helper export for create-invite without full token secret leak. */
export function stableTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 40);
}
