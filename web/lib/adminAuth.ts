import { createHmac, timingSafeEqual } from "crypto";

/** 7 days — long enough for multi-day work; re-auth if secret rotates. */
const SESSION_TTL_SEC = 7 * 24 * 60 * 60;

export function getAdminSecret(): string | undefined {
  return process.env.BROK_OG_ADMIN_SECRET?.trim() || undefined;
}

export function createAdminSessionToken(): string {
  const secret = getAdminSecret();
  if (!secret) throw new Error("admin_secret_not_configured");

  const payload = {
    sub: "brok_admin",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyAdminSessionToken(token: string): boolean {
  const secret = getAdminSecret();
  if (!secret || !token.includes(".")) return false;

  const [body, sig] = token.split(".", 2);
  if (!body || !sig) return false;

  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      sub?: string;
      exp?: number;
    };
    if (payload.sub !== "brok_admin") return false;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Optional extra lock: comma-separated admin user UUIDs in BROK_ADMIN_USER_IDS.
 * When set, callers that pass x-brok-user-id must match; passkey/session secret
 * still required via assertAdmin(). Used for future dual-factor admin paths.
 */
export function getAdminUserIdAllowlist(): string[] {
  const raw = process.env.BROK_ADMIN_USER_IDS?.trim() ?? "";
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowlistedAdminUserId(userId: string | null | undefined): boolean {
  const list = getAdminUserIdAllowlist();
  if (!list.length) return true; // no allowlist configured → secret/session alone is enough
  if (!userId) return false;
  return list.includes(userId.trim().toLowerCase());
}

export function assertAdmin(req: Request): boolean {
  const session = req.headers.get("x-brok-admin-session")?.trim();
  if (session && verifyAdminSessionToken(session)) {
    // Optional: if client also sends user id, enforce allowlist when configured
    const uid = req.headers.get("x-brok-user-id")?.trim();
    if (uid && !isAllowlistedAdminUserId(uid)) return false;
    return true;
  }

  const secret = getAdminSecret();
  if (!secret) return false;
  if (req.headers.get("x-brok-og-admin")?.trim() !== secret) return false;
  const uid = req.headers.get("x-brok-user-id")?.trim();
  if (uid && !isAllowlistedAdminUserId(uid)) return false;
  return true;
}

export { adminAuthHeaders } from "./adminAuthClient";