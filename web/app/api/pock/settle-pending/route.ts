import { settlePendingCustodyReleases } from "@/lib/custodyReleaseExecutor";
import { getServiceSupabase, getUserSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { accessToken?: string };
    if (!body.accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const userClient = getUserSupabase(body.accessToken);
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const service = getServiceSupabase();
    const results = await settlePendingCustodyReleases(service, {
      userId: authData.user.id,
      limit: 5,
    });

    return NextResponse.json({ results });
  } catch (e) {
    console.error("settle-pending error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "settle_failed" },
      { status: 500 }
    );
  }
}