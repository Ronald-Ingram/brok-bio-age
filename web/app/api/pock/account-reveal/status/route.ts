import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { accessToken?: string };
    if (!body.accessToken) {
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
        return NextResponse.json({ hasPassword: false });
      }
      throw error;
    }

    const hash = data?.account_reveal_password_hash as string | null | undefined;
    return NextResponse.json({ hasPassword: Boolean(hash?.length) });
  } catch (e) {
    console.error("account-reveal status error:", e);
    return NextResponse.json({ error: "status_failed" }, { status: 500 });
  }
}