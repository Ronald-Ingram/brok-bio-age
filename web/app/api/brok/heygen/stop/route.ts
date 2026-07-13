import { stopHeyGenLiveSession } from "@/lib/heygenLiveAvatar";
import { heygenConfigured } from "@/lib/brokApiConfig";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!heygenConfigured()) {
    return NextResponse.json({ error: "avatar_not_configured" }, { status: 503 });
  }

  const body = (await req.json()) as { sessionId?: string };
  if (!body.sessionId) {
    return NextResponse.json({ error: "session_id_required" }, { status: 400 });
  }

  await stopHeyGenLiveSession(body.sessionId);
  return NextResponse.json({ ok: true });
}