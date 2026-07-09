import { getUserSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}

export async function GET(req: Request) {
  try {
    const token = bearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const supabase = getUserSupabase(token);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const ledgerFor = new URL(req.url).searchParams.get("ledgerFor");
    if (ledgerFor) {
      const { data: ledger, error: ledgerErr } = await supabase
        .from("genius_sub_wallet_ledger")
        .select("id, sub_wallet_id, amount, balance_after, kind, note, created_at")
        .eq("sub_wallet_id", ledgerFor)
        .eq("parent_user_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (ledgerErr) {
        return NextResponse.json({ error: ledgerErr.message }, { status: 500 });
      }
      return NextResponse.json({ ledger: ledger ?? [] });
    }

    const { data: wallets, error: walletErr } = await supabase
      .from("genius_sub_wallets")
      .select("*")
      .eq("parent_user_id", authData.user.id)
      .order("created_at", { ascending: true });

    if (walletErr) {
      return NextResponse.json({ error: walletErr.message }, { status: 500 });
    }

    const ids = (wallets ?? []).map((w) => w.id);
    let fundedBySub: Record<string, number> = {};

    if (ids.length > 0) {
      const { data: ledgerRows } = await supabase
        .from("genius_sub_wallet_ledger")
        .select("sub_wallet_id, amount, kind")
        .eq("parent_user_id", authData.user.id)
        .in("sub_wallet_id", ids)
        .eq("kind", "fund_in");

      for (const row of ledgerRows ?? []) {
        const id = row.sub_wallet_id as string;
        fundedBySub[id] = (fundedBySub[id] ?? 0) + Number(row.amount ?? 0);
      }
    }

    const enriched = (wallets ?? []).map((w) => ({
      ...w,
      total_funded: fundedBySub[w.id] ?? 0,
    }));

    return NextResponse.json({ wallets: enriched });
  } catch (e) {
    console.error("sub-wallets GET:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "load_failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = bearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const body = (await req.json()) as { nickname?: string; note?: string };
    const nickname = body.nickname?.trim();
    if (!nickname) {
      return NextResponse.json({ error: "nickname_required" }, { status: 400 });
    }

    const supabase = getUserSupabase(token);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("create_genius_sub_wallet", {
      p_nickname: nickname,
      p_note: body.note?.trim() ?? null,
    });

    if (error) {
      const msg = error.message ?? "create_failed";
      if (msg.includes("nickname_taken")) {
        return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
      }
      if (msg.includes("sub_wallet_limit")) {
        return NextResponse.json({ error: "sub_wallet_limit" }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ wallet: { ...data, total_funded: 0 } });
  } catch (e) {
    console.error("sub-wallets POST:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "create_failed" },
      { status: 500 }
    );
  }
}