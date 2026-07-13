import { adminPasskeyCount } from "@/lib/adminWebAuthn";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const count = await adminPasskeyCount();
    return NextResponse.json({
      passkeysRegistered: count,
      biometricAvailable: count > 0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "status_failed";
    return NextResponse.json({ error: msg, passkeysRegistered: 0 }, { status: 500 });
  }
}