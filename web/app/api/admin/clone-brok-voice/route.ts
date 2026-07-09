import {
  cloneBrokVoiceFromReference,
  findBrokCloneVoice,
  listCartesiaVoices,
} from "@/lib/cartesiaClone";
import { cartesiaConfigured } from "@/lib/brokApiConfig";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.BROK_OG_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("x-brok-admin-secret")?.trim();
  const url = new URL(req.url);
  const query = url.searchParams.get("secret")?.trim();
  return header === secret || query === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!cartesiaConfigured()) {
    return NextResponse.json({ error: "cartesia_not_configured" }, { status: 503 });
  }

  try {
    const voices = await listCartesiaVoices();
    const brokClone = findBrokCloneVoice(voices);
    return NextResponse.json({
      brokClone,
      configuredVoiceId: process.env.CARTESIA_VOICE_ID ?? null,
      voiceCount: voices.length,
      voices: voices.map((v) => ({ id: v.id, name: v.name })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!cartesiaConfigured()) {
    return NextResponse.json({ error: "cartesia_not_configured" }, { status: 503 });
  }

  try {
    const voices = await listCartesiaVoices();
    const existing = findBrokCloneVoice(voices);
    if (existing) {
      return NextResponse.json({
        voice: existing,
        source: "existing_clone",
        hint: `Set CARTESIA_VOICE_ID=${existing.id} on Vercel`,
      });
    }

    const cloned = await cloneBrokVoiceFromReference();
    return NextResponse.json({
      voice: cloned,
      source: "new_clone",
      hint: `Set CARTESIA_VOICE_ID=${cloned.id} on Vercel and redeploy`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "clone_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}