import { NEOBANX_CORP_WALLET } from "@/lib/corpWalletConfig";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function assertAdmin(req: Request): boolean {
  const secret = process.env.BROK_OG_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("x-brok-og-admin")?.trim();
  return header === secret;
}

/** GET — corp float status (admin only) */
export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getServiceSupabase();
  const { data: wallet, error: walletErr } = await supabase
    .from("corp_pock_wallet")
    .select("wallet_address, float_remaining, float_allocated, updated_at")
    .eq("id", "neobanx")
    .maybeSingle();

  if (walletErr) {
    return NextResponse.json({ error: walletErr.message }, { status: 500 });
  }

  const { data: recent, error: ledgerErr } = await supabase
    .from("corp_pock_ledger")
    .select("amount, float_after, kind, user_id, note, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (ledgerErr) {
    return NextResponse.json({ error: ledgerErr.message }, { status: 500 });
  }

  return NextResponse.json({
    wallet: wallet ?? { wallet_address: NEOBANX_CORP_WALLET, float_remaining: 0, float_allocated: 0 },
    recentLedger: recent ?? [],
  });
}

/** POST — seed corp float after on-chain reconciliation (admin only) */
export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { amount?: number; note?: string };
  const amount = Math.floor(body.amount ?? 0);
  if (amount < 1) {
    return NextResponse.json({ error: "amount_invalid" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc("seed_corp_pock_float", {
    p_amount: amount,
    p_note: body.note ?? "Admin corp float seed",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ wallet: data });
}