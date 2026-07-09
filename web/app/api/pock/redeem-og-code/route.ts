import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { code?: string; accessToken?: string };

    if (!body.code?.trim()) {
      return NextResponse.json({ error: "code_required" }, { status: 400 });
    }
    if (!body.accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
    }

    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${body.accessToken}` } },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser(
      body.accessToken
    );
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("redeem_og_vip_code", {
      p_code: body.code.trim(),
    });

    if (error) {
      const map: Record<string, number> = {
        code_invalid: 400,
        code_expired: 410,
        code_exhausted: 410,
        og_already_claimed: 409,
      };
      for (const [key, status] of Object.entries(map)) {
        if (error.message?.includes(key)) {
          return NextResponse.json({ error: key }, { status });
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tier: "pock_og", user: data });
  } catch (e) {
    console.error("redeem-og-code:", e);
    return NextResponse.json({ error: "redeem_failed" }, { status: 500 });
  }
}