import { synthesizeHeyGenPcmChunks } from "@/lib/heygenLiveAvatar";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as { text?: string; fullLength?: boolean };
  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }

  try {
    const chunks = await synthesizeHeyGenPcmChunks(text, {
      fullLength: body.fullLength,
    });
    return NextResponse.json({
      chunks,
      sampleRate: 24000,
      encoding: "pcm_s16le",
      segmentCount: body.fullLength ? "chunked" : 1,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "speak_failed";
    return NextResponse.json(
      {
        error: msg,
        hint:
          msg.includes("brok_voice_clone")
            ? "Connect BROK Voice Clone (Neobanx voice service) for lip-sync audio"
            : undefined,
      },
      { status: 502 }
    );
  }
}