import { settlePendingCustodyReleases } from "@/lib/custodyReleaseExecutor";
import { corpWalletSignerConfigured } from "@/lib/solanaCorpWallet";
import { getServiceSupabase } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getServiceSupabase();
  const { data: pending } = await supabase
    .from("custody_release_queue")
    .select(
      "id, user_id, dest_wallet, amount_pock, status, attempts, error_message, solana_tx_signature, created_at, settled_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    signerConfigured: corpWalletSignerConfigured(),
    pending: pending ?? [],
  });
}

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { limit?: number };
  const supabase = getServiceSupabase();
  const results = await settlePendingCustodyReleases(supabase, {
    limit: Math.min(body.limit ?? 10, 25),
  });

  return NextResponse.json({ results });
}