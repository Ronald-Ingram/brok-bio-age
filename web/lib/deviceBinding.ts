import { getServiceSupabase } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function getBoundUserId(deviceId: string): Promise<string | null> {
  const admin = getServiceSupabase();
  const { data, error } = await admin
    .from("brok_device_bindings")
    .select("user_id")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw error;
  }
  return (data?.user_id as string | null) ?? null;
}

export async function bindDeviceToUser(
  deviceId: string,
  userId: string,
  via = "reveal_password"
): Promise<void> {
  const admin = getServiceSupabase();
  const { error } = await admin.from("brok_device_bindings").upsert(
    {
      device_id: deviceId,
      user_id: userId,
      bound_at: new Date().toISOString(),
      bound_via: via,
    },
    { onConflict: "device_id" }
  );
  if (error) throw error;
}

/** Mint a fresh session for an existing auth user (service role). */
export async function mintSessionForUserId(userId: string): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const admin = getServiceSupabase();
  const { data: userData, error: userErr } =
    await admin.auth.admin.getUserById(userId);
  if (userErr || !userData.user?.email) {
    throw new Error("user_not_found");
  }

  const email = userData.user.email;
  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  if (linkErr) throw linkErr;

  const tokenHash = linkData.properties?.hashed_token;
  if (!tokenHash) throw new Error("session_mint_failed");

  const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "magiclink",
      token_hash: tokenHash,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`session_verify_failed: ${err}`);
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
  };
  if (!tokens.access_token) throw new Error("session_mint_failed");
  return tokens;
}