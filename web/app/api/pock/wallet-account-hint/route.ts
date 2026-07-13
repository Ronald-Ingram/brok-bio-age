import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { walletAddress?: string };
    const wallet = body.walletAddress?.trim();
    if (!wallet || wallet.length < 32) {
      return NextResponse.json({ error: "wallet_required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("brok_users")
      .select("id, pock_balance")
      .eq("solana_wallet_address", wallet)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ found: false });
    }

    const id = String(data.id);
    const accountCode = `BROK-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    return NextResponse.json({
      found: true,
      accountSuffix: id.replace(/-/g, "").slice(-4).toUpperCase(),
      accountCode,
      accountMasked: `BROK-••••${id.replace(/-/g, "").slice(-4).toUpperCase()}`,
      pockBalance: Number(data.pock_balance ?? 0),
    });
  } catch (e) {
    console.error("wallet-account-hint error:", e);
    return NextResponse.json({ error: "hint_failed" }, { status: 500 });
  }
}