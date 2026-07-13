import { heygenConfigured } from "@/lib/brokApiConfig";
import { sanitizeBrokAvatarError } from "@/lib/brokAvatarErrors";
import { createHeyGenLiveSession } from "@/lib/heygenLiveAvatar";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  if (!heygenConfigured()) {
    return NextResponse.json(
      {
        error: "avatar_not_configured",
        hint: sanitizeBrokAvatarError("avatar_not_configured"),
      },
      { status: 503 }
    );
  }

  try {
    const session = await createHeyGenLiveSession();
    if (!session.wsUrl) {
      return NextResponse.json(
        {
          error: "avatar_session_incomplete",
          hint: sanitizeBrokAvatarError("avatar_no_websocket"),
        },
        { status: 502 }
      );
    }
    return NextResponse.json(session);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "avatar_session_failed";
    console.error("BROK avatar session error:", e);
    return NextResponse.json(
      {
        error: "avatar_session_failed",
        hint: sanitizeBrokAvatarError(msg),
      },
      { status: 502 }
    );
  }
}