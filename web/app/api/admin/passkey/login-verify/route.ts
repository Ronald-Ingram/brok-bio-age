import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { createAdminSessionToken } from "@/lib/adminAuth";
import { verifyAuthentication } from "@/lib/adminWebAuthn";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      credential?: AuthenticationResponseJSON;
    };
    if (!body.credential) {
      return NextResponse.json({ error: "credential_required" }, { status: 400 });
    }

    const result = await verifyAuthentication(req, body.credential);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "login_failed" }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      session: createAdminSessionToken(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "login_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}