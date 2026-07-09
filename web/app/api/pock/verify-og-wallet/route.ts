import { isWalletOgClaimWindowOpen } from "@/lib/ogEntitlementsConfig";
import { getPockSplBalance, normalizeSolanaAddress } from "@/lib/solanaPockVerify";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!isWalletOgClaimWindowOpen()) {
      return NextResponse.json({ error: "wallet_claim_closed" }, { status: 403 });
    }

    const body = (await req.json()) as {
      walletAddress?: string;
      userId?: string;
      accessToken?: string;
    };

    const wallet = body.walletAddress
      ? normalizeSolanaAddress(body.walletAddress)
      : null;
    if (!wallet) {
      return NextResponse.json({ error: "invalid_wallet" }, { status: 400 });
    }
    if (!body.userId || !body.accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(
      body.accessToken
    );
    if (authError || !authData.user || authData.user.id !== body.userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const proof = await getPockSplBalance(wallet);
    if (!proof.meetsMinimum) {
      return NextResponse.json(
        {
          error: "insufficient_pock_on_chain",
          balance: proof.balanceUi,
          required: 5550,
        },
        { status: 400 }
      );
    }

    const eventId = `ogwal_${wallet}_${body.userId}`;
    const { data, error } = await supabase.rpc("grant_pock_og", {
      p_user_id: body.userId,
      p_source: "wallet",
      p_event_id: eventId,
      p_wallet: wallet,
      p_balance_snapshot: Number(proof.balanceRaw),
      p_note: "POCK OG · wallet verified",
    });

    if (error) {
      if (error.message?.includes("wallet_already_claimed")) {
        return NextResponse.json({ error: "wallet_already_claimed" }, { status: 409 });
      }
      if (error.message?.includes("user not found")) {
        return NextResponse.json({ error: "user_not_found" }, { status: 404 });
      }
      console.error("grant_pock_og failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      tier: "pock_og",
      balance: proof.balanceUi,
      user: data,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "verify_failed";
    if (msg === "pock_mint_not_configured") {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    console.error("verify-og-wallet:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}