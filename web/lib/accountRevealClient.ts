import { ensureAuthSession } from "./pockService";
import { getSupabase } from "./supabase/client";

async function authPost<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  await ensureAuthSession();
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) throw new Error("auth_required");

  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: session.access_token,
      ...body,
    }),
  });

  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "request_failed");
  }
  return data;
}

export async function fetchAccountRevealStatus(): Promise<{ hasPassword: boolean }> {
  return authPost("/api/pock/account-reveal/status", {});
}

export async function setAccountRevealPassword(
  password: string,
  currentPassword?: string
): Promise<{ ok: boolean }> {
  return authPost("/api/pock/account-reveal/set-password", {
    password,
    ...(currentPassword ? { currentPassword } : {}),
  });
}

export async function verifyAccountRevealPassword(
  password: string
): Promise<{ ok: boolean }> {
  return authPost("/api/pock/account-reveal/verify", { password });
}