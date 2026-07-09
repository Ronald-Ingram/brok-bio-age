import {
  hashRevealPassword,
  validateRevealPassword,
} from "@/lib/accountRevealPassword";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      accessToken?: string;
      password?: string;
      currentPassword?: string;
    };

    if (!body.accessToken || !body.password) {
      return NextResponse.json({ error: "auth_required" }, { status: 400 });
    }

    const validation = validateRevealPassword(body.password);
    if (validation) {
      return NextResponse.json({ error: validation }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(
      body.accessToken
    );
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("brok_users")
      .select("account_reveal_password_hash")
      .eq("id", authData.user.id)
      .single();

    if (fetchErr) {
      if (fetchErr.code === "42703") {
        return NextResponse.json({ error: "migration_required" }, { status: 503 });
      }
      throw fetchErr;
    }

    const currentHash = existing?.account_reveal_password_hash as
      | string
      | null
      | undefined;

    if (currentHash && !body.currentPassword) {
      return NextResponse.json({ error: "current_password_required" }, { status: 400 });
    }

    if (currentHash && body.currentPassword) {
      const { verifyRevealPassword } = await import("@/lib/accountRevealPassword");
      if (!verifyRevealPassword(body.currentPassword, currentHash)) {
        return NextResponse.json({ error: "current_password_invalid" }, { status: 403 });
      }
    }

    const { error: updateErr } = await supabase
      .from("brok_users")
      .update({
        account_reveal_password_hash: hashRevealPassword(body.password),
        updated_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("account-reveal set-password error:", e);
    return NextResponse.json({ error: "set_password_failed" }, { status: 500 });
  }
}