import { createHash } from "crypto";
import { getBoundUserId, mintSessionForUserId } from "@/lib/deviceBinding";
import {
  isNewDeviceAuthKilled,
  isUserFrozen,
} from "@/lib/emergencyKill";
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY!;

function credentialsForDevice(deviceId: string): {
  email: string;
  password: string;
} {
  const digest = createHash("sha256")
    .update(`${deviceId}:${SERVICE_KEY}`)
    .digest("hex");
  const email = `bioage-${digest.slice(0, 20)}@users.brok.app`;
  const password = digest;
  return { email, password };
}

async function signIn(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`sign_in_failed: ${err}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
  }>;
}

/** Create device user only when needed. Prefer sign-in first (works at any Auth scale). */
async function ensureAuthUserAndSignIn(email: string, password: string) {
  try {
    return await signIn(email, password);
  } catch {
    /* user may not exist yet */
  }

  // Emergency: do not mint new synthetic device users (trial farm vector).
  if (isNewDeviceAuthKilled()) {
    throw new Error("new_device_auth_paused");
  }

  const admin = getServiceSupabase();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  // Concurrent create: another request may have won the race.
  if (created.error && !/already|registered|exists/i.test(created.error.message)) {
    throw created.error;
  }
  return signIn(email, password);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { deviceId?: string };
    if (!body.deviceId?.trim()) {
      return NextResponse.json({ error: "device_id_required" }, { status: 400 });
    }

    const deviceId = body.deviceId.trim();
    const boundUserId = await getBoundUserId(deviceId);
    if (boundUserId) {
      if (isUserFrozen(boundUserId)) {
        return NextResponse.json({ error: "account_frozen" }, { status: 403 });
      }
      const tokens = await mintSessionForUserId(boundUserId);
      return NextResponse.json({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        bound: true,
        userId: boundUserId,
      });
    }

    const { email, password } = credentialsForDevice(deviceId);
    const tokens = await ensureAuthUserAndSignIn(email, password);

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "auth_error";
    if (message === "new_device_auth_paused") {
      return NextResponse.json(
        {
          error: "new_device_auth_paused",
          message:
            "New wallet creation is temporarily paused. If you already have a Genius Wallet, use “I already have a wallet” / PIN recover.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}