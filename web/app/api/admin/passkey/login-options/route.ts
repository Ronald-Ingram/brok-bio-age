import { buildAuthenticationOptions } from "@/lib/adminWebAuthn";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const options = await buildAuthenticationOptions(req);
    return NextResponse.json(options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "options_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}