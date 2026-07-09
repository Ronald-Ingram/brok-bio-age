import { isValidSolanaAddress } from "@/lib/custody";
import { getUserSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      accessToken?: string;
      solanaAddress?: string;
    };

    if (!body.accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const address = body.solanaAddress?.trim() ?? "";
    if (!isValidSolanaAddress(address)) {
      return NextResponse.json({ error: "wallet_address_invalid" }, { status: 400 });
    }

    const supabase = getUserSupabase(body.accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("connect_solana_wallet", {
      p_address: address,
    });

    if (error) {
      const msg = error.message ?? "connect_failed";
      if (msg.includes("wallet_already_linked")) {
        return NextResponse.json({ error: "wallet_already_linked" }, { status: 409 });
      }
      if (msg.includes("wallet_address_invalid")) {
        return NextResponse.json({ error: "wallet_address_invalid" }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (e) {
    console.error("connect-wallet error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "connect_failed" },
      { status: 500 }
    );
  }
}