import { verifyRevealPassword } from "@/lib/accountRevealPassword";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      accessToken?: string;
      password?: string;
    };

    if (!body.accessToken || !body.password) {
      return NextResponse.json({ error: "auth_required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(
      body.accessToken
    );
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("brok_users")
      .select("account_reveal_password_hash")
      .eq("id", authData.user.id)
      .single();

    if (error) {
      if (error.code === "42703") {
        return NextResponse.json({ error: "migration_required" }, { status: 503 });
      }
      throw error;
    }

    const hash = data?.account_reveal_password_hash as string | null | undefined;
    if (!hash) {
      return NextResponse.json({ error: "password_not_set" }, { status: 400 });
    }

    const ok = verifyRevealPassword(body.password, hash);
    if (!ok) {
      return NextResponse.json({ error: "password_invalid" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("account-reveal verify error:", e);
    return NextResponse.json({ error: "verify_failed" }, { status: 500 });
  }
}