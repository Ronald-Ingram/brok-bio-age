import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { assertAdmin, createAdminSessionToken } from "@/lib/adminAuth";
import { verifyRegistration } from "@/lib/adminWebAuthn";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      credential?: RegistrationResponseJSON;
      deviceLabel?: string;
    };
    if (!body.credential) {
      return NextResponse.json({ error: "credential_required" }, { status: 400 });
    }

    const result = await verifyRegistration(req, body.credential, body.deviceLabel);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "register_failed" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      session: createAdminSessionToken(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "register_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}