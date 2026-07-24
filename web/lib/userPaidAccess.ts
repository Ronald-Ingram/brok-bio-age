import { getServiceSupabase } from "./supabase/server";

/**
 * First N chat turns per account use premium xAI (Grok 4.5) for first impressions,
 * even before payment. After that, premium only if paid.
 * Override with env BROK_PREMIUM_INTRO_TURNS.
 */
export const PREMIUM_INTRO_CHAT_TURNS = Math.max(
  0,
  Number(process.env.BROK_PREMIUM_INTRO_TURNS ?? "15") || 15
);

/**
 * True if we have received real payment(s) from this user OR they hold paid entitlements:
 * - subscription_active
 * - pock_og / essential / premium tier
 * - any stripe_payments row (card top-up / subscription invoice)
 */
export async function userHasReceivedPayment(
  userId: string
): Promise<boolean> {
  if (!userId?.trim()) return false;
  try {
    const supabase = getServiceSupabase();

    const { data: user } = await supabase
      .from("brok_users")
      .select("subscription_active, subscription_tier")
      .eq("id", userId)
      .maybeSingle();

    if (user?.subscription_active) return true;
    if (user?.subscription_tier === "pock_og") return true;
    if (
      user?.subscription_tier === "essential" ||
      user?.subscription_tier === "premium"
    ) {
      return true;
    }

    const { count, error } = await supabase
      .from("stripe_payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (!error && (count ?? 0) > 0) return true;
    return false;
  } catch (e) {
    console.warn("[userHasReceivedPayment]", e);
    return false;
  }
}

/** Lifetime chat turns logged for this user (assistant/user rows in brok_chat_log). */
export async function countUserChatTurns(userId: string): Promise<number> {
  if (!userId?.trim()) return 0;
  try {
    const supabase = getServiceSupabase();
    const { count, error } = await supabase
      .from("brok_chat_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) {
      console.warn("[countUserChatTurns]", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (e) {
    console.warn("[countUserChatTurns]", e);
    return 0;
  }
}

export type PremiumChatAccess = {
  /** Use grok-4.5 + Grok-first routing */
  usePremium: boolean;
  reason: "paid" | "intro" | "none";
  chatTurns: number;
  introLimit: number;
};

/**
 * Premium model access:
 * 1) Paid / payment received → always premium
 * 2) Else first PREMIUM_INTRO_CHAT_TURNS (default 15) → premium for stickiness
 * 3) Else standard path
 */
export async function resolvePremiumChatAccess(
  userId: string
): Promise<PremiumChatAccess> {
  const introLimit = PREMIUM_INTRO_CHAT_TURNS;
  const [paid, chatTurns] = await Promise.all([
    userHasReceivedPayment(userId),
    countUserChatTurns(userId),
  ]);

  if (paid) {
    return { usePremium: true, reason: "paid", chatTurns, introLimit };
  }
  if (chatTurns < introLimit) {
    return { usePremium: true, reason: "intro", chatTurns, introLimit };
  }
  return { usePremium: false, reason: "none", chatTurns, introLimit };
}

/** Premium xAI model for paid / intro users (env override). */
export function resolvePremiumXaiModel(): string {
  return (
    process.env.XAI_PREMIUM_MODEL?.trim() ||
    process.env.XAI_MODEL_PREMIUM?.trim() ||
    "grok-4.5"
  );
}

/** Standard xAI model for free after intro. */
export function resolveStandardXaiModel(): string {
  return process.env.XAI_MODEL?.trim() || "grok-3";
}
