import { getUserSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const body = (await req.json()) as {
      subWalletId?: string;
      amount?: number;
      note?: string;
    };

    const amount = Math.floor(body.amount ?? 0);
    if (!body.subWalletId || amount < 1) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const supabase = getUserSupabase(token);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("fund_genius_sub_wallet", {
      p_sub_wallet_id: body.subWalletId,
      p_amount: amount,
      p_note: body.note?.trim() ?? null,
    });

    if (error) {
      const msg = error.message ?? "fund_failed";
      if (msg.includes("insufficient_balance")) {
        return NextResponse.json({ error: "insufficient_balance" }, { status: 400 });
      }
      if (msg.includes("sub_wallet_not_found")) {
        return NextResponse.json({ error: "sub_wallet_not_found" }, { status: 404 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("sub-wallet fund:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "fund_failed" },
      { status: 500 }
    );
  }
}