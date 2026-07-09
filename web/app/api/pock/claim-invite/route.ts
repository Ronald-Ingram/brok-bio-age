import { createHash } from "crypto";
import { creditPockFromStripe } from "@/lib/stripePockCredit";
import { getServiceSupabase } from "@/lib/supabase/server";
import {
  isValidClaimPassword,
  verifyInvite,
  type RecipientClaimMethod,
} from "@/lib/pockInvite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      method?: RecipientClaimMethod;
      brokUserId?: string;
      walletAddress?: string;
      claimPassword?: string;
    };

    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "token_required" }, { status: 400 });
    }

    const payload = verifyInvite(token);
    if (!payload) {
      return NextResponse.json({ error: "invite_expired_or_invalid" }, { status: 400 });
    }

    const method = body.method;
    if (!method || !["brok_id", "wallet", "password"].includes(method)) {
      return NextResponse.json({ error: "method_required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const inviteKey = `invite-${createHash("sha256").update(token).digest("hex").slice(0, 40)}`;

    if (method === "password") {
      const pwd = body.claimPassword?.trim().toUpperCase();
      if (!pwd || !isValidClaimPassword(pwd)) {
        return NextResponse.json({ error: "password_invalid" }, { status: 400 });
      }
      if (pwd !== payload.claimPassword.toUpperCase()) {
        return NextResponse.json({ error: "password_mismatch" }, { status: 403 });
      }

      const registerHint =
        payload.kind === "gift"
          ? "Create your free BROK account, then return to this claim page and enter your new BROK user ID to receive the gift."
          : "Create a BROK account (or sign in) and return to this claim page with your BROK user ID to complete the transfer.";

      return NextResponse.json({
        ok: true,
        method: "password",
        amount: payload.amount,
        kind: payload.kind,
        message: `Password verified. ${registerHint}`,
        claimPassword: payload.claimPassword,
      });
    }

    if (method === "brok_id") {
      const brokUserId = body.brokUserId?.trim();
      if (!brokUserId) {
        return NextResponse.json({ error: "brok_id_required" }, { status: 400 });
      }

      const { data: recipient, error: recErr } = await supabase
        .from("brok_users")
        .select("id")
        .eq("id", brokUserId)
        .maybeSingle();
      if (recErr || !recipient) {
        return NextResponse.json({ error: "recipient_not_found" }, { status: 404 });
      }

      const creditNote =
        payload.kind === "gift"
          ? payload.recipientName
            ? `Gift for ${payload.recipientName} · reserved in Genius Wallet`
            : "Gift $POCK received · reserved in Genius Wallet"
          : `POCK invite from ${payload.senderId.slice(0, 8)}… · reserved custody`;

      try {
        await creditPockFromStripe(supabase, {
          userId: brokUserId,
          amount: payload.amount,
          stripeSessionId: inviteKey,
          note: creditNote,
        });
      } catch (creditErr) {
        const msg =
          creditErr instanceof Error ? creditErr.message : "credit_failed";
        return NextResponse.json({ error: msg }, { status: 500 });
      }

      const usdSuffix =
        payload.kind === "gift" && payload.usdEquivalent
          ? ` (~$${payload.usdEquivalent.toFixed(2)} USD)`
          : "";

      return NextResponse.json({
        ok: true,
        method: "brok_id",
        amount: payload.amount,
        kind: payload.kind,
        message:
          payload.kind === "gift"
            ? `🎁 ${payload.amount} $POCK gift${usdSuffix} credited to your BROK account.`
            : `${payload.amount} $POCK credited to your BROK account.`,
      });
    }

    const wallet = body.walletAddress?.trim();
    if (!wallet || wallet.length < 8) {
      return NextResponse.json({ error: "wallet_required" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      method: "wallet",
      amount: payload.amount,
      walletAddress: wallet,
      message: `Withdrawal of ${payload.amount} $POCK to ${wallet.slice(0, 10)}… queued for processing within 24 hours.`,
    });
  } catch (e) {
    console.error("claim-invite error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "claim_failed" },
      { status: 500 }
    );
  }
}