import { GiftClaimError, claimGiftForUser } from "@/lib/pockGiftClaimServer";
import { getServiceSupabase, getUserSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      accessToken?: string;
      token?: string;
    };

    const accessToken = body.accessToken?.trim();
    const token = body.token?.trim();

    if (!accessToken) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    if (!token) {
      return NextResponse.json({ error: "token_required" }, { status: 400 });
    }

    const userClient = getUserSupabase(accessToken);
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    const result = await claimGiftForUser(supabase, authData.user.id, token);

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GiftClaimError) {
      return NextResponse.json({ error: e.code }, { status: e.status });
    }
    console.error("auto-claim-gift error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "claim_failed" },
      { status: 500 }
    );
  }
}