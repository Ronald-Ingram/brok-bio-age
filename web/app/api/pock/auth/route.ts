import { createHash } from "crypto";
import { getBoundUserId, mintSessionForUserId } from "@/lib/deviceBinding";
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

async function ensureAuthUser(email: string, password: string) {
  const admin = getServiceSupabase();
  const list = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list.data.users.find((u) => u.email === email);
  if (existing) return existing;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  return created.data.user;
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { deviceId?: string };
    if (!body.deviceId?.trim()) {
      return NextResponse.json({ error: "device_id_required" }, { status: 400 });
    }

    const deviceId = body.deviceId.trim();
    const boundUserId = await getBoundUserId(deviceId);
    if (boundUserId) {
      const tokens = await mintSessionForUserId(boundUserId);
      return NextResponse.json({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        bound: true,
        userId: boundUserId,
      });
    }

    const { email, password } = credentialsForDevice(deviceId);
    await ensureAuthUser(email, password);
    const tokens = await signIn(email, password);

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "auth_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}