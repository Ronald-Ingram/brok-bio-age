import { settleCustodyRelease } from "@/lib/custodyReleaseExecutor";
import { getServiceSupabase, getUserSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      accessToken?: string;
      amount?: number;
      destWallet?: string;
    };

    if (!body.accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const supabase = getUserSupabase(body.accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const amount =
      body.amount != null ? Math.floor(Number(body.amount)) : undefined;
    if (amount != null && (!Number.isFinite(amount) || amount < 1)) {
      return NextResponse.json({ error: "amount_invalid" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("request_custody_release", {
      p_amount: amount ?? null,
      p_dest_wallet: body.destWallet?.trim() || null,
    });

    if (error) {
      const msg = error.message ?? "release_failed";
      if (msg.includes("wallet_not_connected")) {
        return NextResponse.json({ error: "wallet_not_connected" }, { status: 400 });
      }
      if (msg.includes("nothing_to_release")) {
        return NextResponse.json({ error: "nothing_to_release" }, { status: 400 });
      }
      if (msg.includes("insufficient_pock") || msg.includes("amount_invalid")) {
        return NextResponse.json({ error: "amount_invalid" }, { status: 400 });
      }
      if (msg.includes("wallet_address_invalid")) {
        return NextResponse.json({ error: "wallet_address_invalid" }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const releaseId = (data as { release_id?: string })?.release_id;
    let settlement = null;
    if (releaseId) {
      const service = getServiceSupabase();
      settlement = await settleCustodyRelease(service, releaseId);
    }

    return NextResponse.json({ ...data, settlement });
  } catch (e) {
    console.error("request-release error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "release_failed" },
      { status: 500 }
    );
  }
}