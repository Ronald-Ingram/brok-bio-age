import { assertAdmin } from "@/lib/adminAuth";
import { buildRegistrationOptions } from "@/lib/adminWebAuthn";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const options = await buildRegistrationOptions(req);
    return NextResponse.json(options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "options_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}