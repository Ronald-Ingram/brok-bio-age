import { bindDeviceToUser, mintSessionForUserId } from "@/lib/deviceBinding";
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
    };

    if (
      !body.deviceId?.trim() ||
      !body.targetUserId?.trim() ||
      !body.stripeSessionId?.trim()
    ) {
      return NextResponse.json({ error: "auth_required" }, { status: 400 });
    }

    const targetId = body.targetUserId.trim();
    const sessionId = body.stripeSessionId.trim();

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
    });
  } catch (e) {
    console.error("bind-account-checkout error:", e);
    const msg = e instanceof Error ? e.message : "bind_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}