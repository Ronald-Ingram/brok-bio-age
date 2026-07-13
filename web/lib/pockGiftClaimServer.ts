import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
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
}

export function inviteKeyFromToken(token: string): string {
  return `invite-${createHash("sha256").update(token).digest("hex").slice(0, 40)}`;
}

export function verifyGiftInvite(token: string): PockInvitePayload | null {
  const payload = verifyInvite(token);
  if (!payload || payload.kind !== "gift") return null;
  return payload;
}

function giftCreditMessage(payload: PockInvitePayload, credited: boolean): string {
  const usdSuffix =
    payload.usdEquivalent != null
      ? ` (~$${payload.usdEquivalent.toFixed(2)} USD)`
      : "";
  return credited
    ? `🎁 ${payload.amount} $POCK gift${usdSuffix} credited to your Genius Wallet.`
    : `🎁 ${payload.amount} $POCK gift${usdSuffix} is already in your wallet.`;
}

export async function claimGiftForUser(
  supabase: SupabaseClient,
  userId: string,
  token: string
): Promise<GiftClaimResult> {
  const payload = verifyGiftInvite(token);
  if (!payload) {
    throw new GiftClaimError("invite_expired_or_invalid", 400);
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
        message: giftCreditMessage(payload, false),
      };
    }
    throw new GiftClaimError("gift_already_claimed", 409);
  }

  const creditNote = payload.recipientName
    ? `Gift for ${payload.recipientName} · reserved in Genius Wallet`
    : "Gift $POCK received · reserved in Genius Wallet";

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

  return {
    ok: true,
    amount: payload.amount,
    alreadyClaimed: false,
    message: giftCreditMessage(payload, true),
  };
}