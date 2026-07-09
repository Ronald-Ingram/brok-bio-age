import { createHmac, randomBytes } from "crypto";

export type RecipientClaimMethod = "brok_id" | "wallet" | "password";
export type PockInviteKind = "transfer" | "gift";

export interface PockInvitePayload {
  v: 1;
  kind: PockInviteKind;
  senderId: string;
  amount: number;
  phone?: string;
  email?: string;
  claimPassword: string;
  exp: number;
  recipientName?: string;
  usdEquivalent?: number;
  personalMessage?: string;
  senderName?: string;
}

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateClaimPassword(length = 8): string {
  let out = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    out += CHARSET[bytes[i]! % CHARSET.length];
  }
  return out;
}

function inviteSecret(): string {
  const secret =
    process.env.POCK_INVITE_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "brok-dev-invite-secret";
  return secret;
}

function b64url(data: string): string {
  return Buffer.from(data, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(data: string): string {
  const pad = data.length % 4 === 0 ? "" : "=".repeat(4 - (data.length % 4));
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString(
    "utf8"
  );
}

export function signInvite(
  payload: Omit<PockInvitePayload, "v"> & { kind?: PockInviteKind }
): string {
  const { kind, ...rest } = payload;
  const body: PockInvitePayload = {
    v: 1,
    kind: kind ?? "transfer",
    ...rest,
  };
  const json = JSON.stringify(body);
  const sig = createHmac("sha256", inviteSecret())
    .update(json)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${b64url(json)}.${sig}`;
}

export function verifyInvite(token: string): PockInvitePayload | null {
  const [bodyB64, sig] = token.split(".");
  if (!bodyB64 || !sig) return null;
  try {
    const json = b64urlDecode(bodyB64);
    const expected = createHmac("sha256", inviteSecret())
      .update(json)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    if (sig !== expected) return null;
    const payload = JSON.parse(json) as PockInvitePayload;
    if (payload.v !== 1 || payload.exp < Date.now()) return null;
    if (!payload.kind) payload.kind = "transfer";
    return payload;
  } catch {
    return null;
  }
}

export function inviteExpiresAt(hours = 72): number {
  return Date.now() + hours * 60 * 60 * 1000;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidClaimPassword(value: string): boolean {
  return /^[A-Z0-9]{8}$/i.test(value.trim());
}