import {
  mergeSecondaryIntoPrimary,
  type AccountMergeResult,
} from "@/lib/accountMerge";
import { bindDeviceToUser, mintSessionForUserId } from "@/lib/deviceBinding";
import {
  extractStripeSessionId,
  resolveBrokAccountId,
} from "@/lib/resolveBrokAccountId";
import { getStripe } from "@/lib/stripeServer";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Bind device to account by proving ownership via a paid Stripe checkout session. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      deviceId?: string;
      targetUserId?: string;
      stripeSessionId?: string;
      currentUserId?: string;
    };

    if (!body.deviceId?.trim() || !body.targetUserId?.trim() || !body.stripeSessionId?.trim()) {
      return NextResponse.json({ error: "auth_required" }, { status: 400 });
    }

    const targetId = await resolveBrokAccountId(body.targetUserId);
    if (!targetId) {
      return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    }

    const sessionId = extractStripeSessionId(body.stripeSessionId);
    if (!sessionId) {
      return NextResponse.json(
        {
          error: "invalid_stripe_session",
          hint: "Paste only the cs_live_… ID from your Stripe receipt URL, not the full ledger note.",
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "payment_not_paid" }, { status: 400 });
    }

    const sessionUserId = session.metadata?.brok_user_id;
    if (!sessionUserId || sessionUserId !== targetId) {
      return NextResponse.json({ error: "session_mismatch" }, { status: 403 });
    }

    const supabase = getServiceSupabase();
    const { data: userRow } = await supabase
      .from("brok_users")
      .select("id")
      .eq("id", targetId)
      .single();

    if (!userRow) {
      return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    }

    const orphanId = body.currentUserId?.trim();
    let mergeResult: AccountMergeResult = { merged: false, pockTransferred: 0 };
    if (orphanId && orphanId !== targetId) {
      mergeResult = await mergeSecondaryIntoPrimary(targetId, orphanId);
    }

    await bindDeviceToUser(
      body.deviceId.trim(),
      targetId,
      "stripe_session_proof"
    );
    const tokens = await mintSessionForUserId(targetId);

    return NextResponse.json({
      ok: true,
      userId: targetId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      mergedPock: mergeResult.pockTransferred,
      mergedFrom: mergeResult.secondaryUserId ?? null,
    });
  } catch (e) {
    console.error("bind-account-checkout error:", e);
    const msg = e instanceof Error ? e.message : "bind_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}