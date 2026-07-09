import { bindDeviceToUser, mintSessionForUserId } from "@/lib/deviceBinding";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function assertAdmin(req: Request): boolean {
  const secret = process.env.BROK_OG_ADMIN_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-brok-og-admin")?.trim() === secret;
}

/** Admin: bind a device_id to a brok_users row (account recovery). */
export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      deviceId?: string;
      userId?: string;
    };

    if (!body.deviceId?.trim() || !body.userId?.trim()) {
      return NextResponse.json({ error: "ids_required" }, { status: 400 });
    }

    await bindDeviceToUser(body.deviceId.trim(), body.userId.trim(), "admin");
    const tokens = await mintSessionForUserId(body.userId.trim());

    return NextResponse.json({
      ok: true,
      userId: body.userId.trim(),
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  } catch (e) {
    console.error("admin bind-device error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "bind_failed" },
      { status: 500 }
    );
  }
}