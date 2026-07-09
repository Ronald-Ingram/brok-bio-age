import { createHeyGenLiveSession } from "@/lib/heygenLiveAvatar";
import { heygenConfigured } from "@/lib/brokApiConfig";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  if (!heygenConfigured()) {
    return NextResponse.json(
      {
        error: "heygen_not_configured",
        hint: "Set HEYGEN_API_KEY and HEYGEN_AVATAR_ID (LiveAvatar UUID) on Vercel",
      },
      { status: 503 }
    );
  }

  try {
    const session = await createHeyGenLiveSession();
    if (!session.wsUrl) {
      return NextResponse.json(
        { error: "heygen_no_websocket", hint: "LITE session missing ws_url" },
        { status: 502 }
      );
    }
    return NextResponse.json(session);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "heygen_session_failed";
    console.error("HeyGen session error:", e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}