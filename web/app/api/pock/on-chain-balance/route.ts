import { getPockSplBalance } from "@/lib/solanaPockVerify";
import { getUserSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { accessToken?: string };
    if (!body.accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 400 });
    }

    const supabase = getUserSupabase(body.accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: user, error: userErr } = await supabase
      .from("brok_users")
      .select("solana_wallet_address")
      .eq("id", authData.user.id)
      .single();

    if (userErr || !user?.solana_wallet_address) {
      return NextResponse.json({ error: "wallet_not_connected" }, { status: 400 });
    }

    const proof = await getPockSplBalance(user.solana_wallet_address as string);
    return NextResponse.json({
      wallet: proof.wallet,
      balanceUi: proof.balanceUi,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "balance_failed";
    if (msg === "pock_mint_not_configured") {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}