import {
  mergeSecondaryIntoPrimary,
  type AccountMergeResult,
} from "@/lib/accountMerge";
import { verifyRevealPassword } from "@/lib/accountRevealPassword";
import { bindDeviceToUser, mintSessionForUserId } from "@/lib/deviceBinding";
import { resolveBrokAccountId } from "@/lib/resolveBrokAccountId";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      deviceId?: string;
      targetUserId?: string;
      password?: string;
      /** Orphan session on this device — balance merged into target after bind */
      currentUserId?: string;
    };

    if (!body.deviceId?.trim() || !body.targetUserId?.trim() || !body.password) {
      return NextResponse.json({ error: "auth_required" }, { status: 400 });
    }

    const targetId = await resolveBrokAccountId(body.targetUserId);
    if (!targetId) {
      return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    }

    const supabase = getServiceSupabase();
    const { data: userRow, error: userErr } = await supabase
      .from("brok_users")
      .select("id, account_reveal_password_hash")
      .eq("id", targetId)
      .single();

    if (userErr || !userRow) {
      return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    }

    const hash = userRow.account_reveal_password_hash as string | null;
    if (!hash) {
      return NextResponse.json(
        { error: "reveal_password_not_set" },
        { status: 400 }
      );
    }

    if (!verifyRevealPassword(body.password, hash)) {
      return NextResponse.json({ error: "password_invalid" }, { status: 403 });
    }

    const orphanId = body.currentUserId?.trim();
    let mergeResult: AccountMergeResult = { merged: false, pockTransferred: 0 };
    if (orphanId && orphanId !== targetId) {
      mergeResult = await mergeSecondaryIntoPrimary(targetId, orphanId);
    }

    await bindDeviceToUser(body.deviceId.trim(), targetId);
    const tokens = await mintSessionForUserId(targetId);

    return NextResponse.json({
      ok: true,
      userId: targetId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      mergedPock: mergeResult.pockTransferred,
      mergedFrom: mergeResult.secondaryUserId ?? null,
    });
  } catch (e) {
    console.error("bind-account error:", e);
    const msg = e instanceof Error ? e.message : "bind_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}