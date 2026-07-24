import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUserFrozen } from "@/lib/emergencyKill";
import { onFirstGiftReceive } from "@/lib/giftOutreach";
import { creditPockFromStripe } from "@/lib/stripePockCredit";
import { verifyInvite, type PockInvitePayload } from "@/lib/pockInvite";

export class GiftClaimError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "GiftClaimError";
    this.code = code;
    this.status = status;
  }
}

export interface GiftClaimResult {
  ok: true;
  amount: number;
  alreadyClaimed: boolean;
  message: string;
  /** True only on the account's first invite credit (triggers activation outreach). */
  firstReceive?: boolean;
}

export function inviteKeyFromToken(token: string): string {
  return `invite-${createHash("sha256").update(token).digest("hex").slice(0, 40)}`;
}

export function verifyGiftInvite(token: string): PockInvitePayload | null {
  const payload = verifyInvite(token);
  if (!payload || payload.kind !== "gift") return null;
  return payload;
}

/** Gift or transfer — both can credit a logged-in Genius Wallet. */
export function verifyClaimableInvite(token: string): PockInvitePayload | null {
  const payload = verifyInvite(token);
  if (!payload) return null;
  if (payload.kind !== "gift" && payload.kind !== "transfer") return null;
  return payload;
}

function inviteCreditMessage(
  payload: PockInvitePayload,
  credited: boolean
): string {
  const usdSuffix =
    payload.usdEquivalent != null
      ? ` (~$${payload.usdEquivalent.toFixed(2)} USD)`
      : "";
  const label = payload.kind === "gift" ? "gift" : "transfer";
  return credited
    ? `✓ ${payload.amount} $POCK ${label}${usdSuffix} added to your Genius Wallet.`
    : `✓ ${payload.amount} $POCK ${label}${usdSuffix} is already in your wallet.`;
}

/**
 * Credit invite $POCK to an existing logged-in account (idempotent).
 * Works for gifts and sends — simplest path for registered recipients.
 */
export async function claimGiftForUser(
  supabase: SupabaseClient,
  userId: string,
  token: string
): Promise<GiftClaimResult> {
  const payload = verifyClaimableInvite(token);
  if (!payload) {
    throw new GiftClaimError("invite_expired_or_invalid", 400);
  }

  if (isUserFrozen(userId)) {
    throw new GiftClaimError("account_frozen", 403);
  }
  if (payload.senderId && isUserFrozen(payload.senderId)) {
    throw new GiftClaimError("sender_frozen", 403);
  }

  const inviteKey = inviteKeyFromToken(token);

  const { data: existing, error: lookupErr } = await supabase
    .from("stripe_payments")
    .select("user_id")
    .eq("stripe_session_id", inviteKey)
    .maybeSingle();

  if (lookupErr) {
    throw new GiftClaimError(lookupErr.message, 500);
  }

  if (existing) {
    if (existing.user_id === userId) {
      return {
        ok: true,
        amount: payload.amount,
        alreadyClaimed: true,
        firstReceive: false,
        message: inviteCreditMessage(payload, false),
      };
    }
    throw new GiftClaimError("gift_already_claimed", 409);
  }

  const creditNote = payload.recipientName
    ? `${payload.kind === "gift" ? "Gift" : "Send"} for ${payload.recipientName} · reserved in Genius Wallet`
    : `${payload.kind === "gift" ? "Gift" : "Transfer"} $POCK received · reserved in Genius Wallet`;

  try {
    await creditPockFromStripe(supabase, {
      userId,
      amount: payload.amount,
      stripeSessionId: inviteKey,
      note: creditNote,
    });
  } catch (creditErr) {
    const msg = creditErr instanceof Error ? creditErr.message : "credit_failed";
    throw new GiftClaimError(msg, 500);
  }

  // First-receive only: activation email/SMS + in-app notice lifecycle.
  let firstReceive = false;
  try {
    const outreach = await onFirstGiftReceive({
      supabase,
      userId,
      token,
      payload,
      alreadyClaimed: false,
    });
    firstReceive = outreach.firstReceive;
  } catch (e) {
    console.warn(
      "[gift_claim] outreach failed (credit still ok):",
      e instanceof Error ? e.message : e
    );
  }

  return {
    ok: true,
    amount: payload.amount,
    alreadyClaimed: false,
    firstReceive,
    message: firstReceive
      ? `${inviteCreditMessage(payload, true)} You're activated — check the welcome note for next steps.`
      : inviteCreditMessage(payload, true),
  };
}
