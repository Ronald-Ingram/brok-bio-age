import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function assertAdmin(req: Request): boolean {
  const secret = process.env.BROK_OG_ADMIN_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-brok-og-admin")?.trim() === secret;
}

/**
 * Merge secondary brok_users into primary: balance, ledger rows, stripe_payments.
 * Does not delete auth users (FK); zeros secondary balances and annotates ledger.
 */
export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      primaryUserId?: string;
      secondaryUserIds?: string[];
    };

    const primaryId = body.primaryUserId?.trim();
    const secondaryIds = (body.secondaryUserIds ?? []).map((s) => s.trim()).filter(Boolean);

    if (!primaryId || secondaryIds.length === 0) {
      return NextResponse.json({ error: "ids_required" }, { status: 400 });
    }

    if (secondaryIds.includes(primaryId)) {
      return NextResponse.json({ error: "primary_in_secondary" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: primary, error: pErr } = await supabase
      .from("brok_users")
      .select("*")
      .eq("id", primaryId)
      .single();
    if (pErr || !primary) {
      return NextResponse.json({ error: "primary_not_found" }, { status: 404 });
    }

    let totalMerged = 0;
    const merged: string[] = [];

    for (const secId of secondaryIds) {
      const { data: secondary, error: sErr } = await supabase
        .from("brok_users")
        .select("*")
        .eq("id", secId)
        .single();
      if (sErr || !secondary) continue;

      const transfer = Number(secondary.pock_balance ?? 0);
      if (transfer < 1) {
        merged.push(secId);
        continue;
      }

      const newPrimaryBalance = Number(primary.pock_balance ?? 0) + transfer;

      await supabase.from("pock_ledger").insert({
        user_id: primaryId,
        amount: transfer,
        balance_after: newPrimaryBalance,
        kind: "transfer_in",
        note: `Account merge from ${secId.slice(0, 8)}…`,
        custody_state: primary.custody_status === "self_custodial" ? "reserved" : "reserved",
      });

      await supabase.from("pock_ledger").insert({
        user_id: secId,
        amount: -transfer,
        balance_after: 0,
        kind: "transfer_out",
        note: `Merged into ${primaryId.slice(0, 8)}…`,
      });

      await supabase
        .from("brok_users")
        .update({ pock_balance: newPrimaryBalance, updated_at: new Date().toISOString() })
        .eq("id", primaryId);

      await supabase
        .from("brok_users")
        .update({
          pock_balance: 0,
          display_name: `merged→${primaryId.slice(0, 8)}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", secId);

      if (secondary.solana_wallet_address && !primary.solana_wallet_address) {
        await supabase
          .from("brok_users")
          .update({
            solana_wallet_address: secondary.solana_wallet_address,
            custody_status: secondary.custody_status,
            solana_wallet_connected_at: secondary.solana_wallet_connected_at,
          })
          .eq("id", primaryId);
      }

      await supabase
        .from("pock_ledger")
        .update({ user_id: primaryId })
        .eq("user_id", secId);

      await supabase
        .from("stripe_payments")
        .update({ user_id: primaryId })
        .eq("user_id", secId);

      primary.pock_balance = newPrimaryBalance;
      totalMerged += transfer;
      merged.push(secId);
    }

    return NextResponse.json({
      ok: true,
      primaryUserId: primaryId,
      mergedUserIds: merged,
      pockTransferred: totalMerged,
      primaryBalance: Number(primary.pock_balance ?? 0),
    });
  } catch (e) {
    console.error("consolidate-accounts error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "consolidate_failed" },
      { status: 500 }
    );
  }
}