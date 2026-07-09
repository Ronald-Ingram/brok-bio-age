import { reconcileUserPock } from "@/lib/pockReconcile";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      accessToken?: string;
      sessionId?: string;
    };

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

    const result = await reconcileUserPock(supabase, authData.user.id, {
      sessionId: body.sessionId,
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "reconcile_failed";
    console.error("POCK reconcile error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}