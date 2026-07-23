import { halfMaskAccountCode, halfMaskName } from "./hideIds";
import type { BrokUser } from "./pockTypes";

const MASK_CHAR = "•";

export function formatBrokAccountNumber(userId: string): string {
  const compact = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `BROK-${compact}`;
}

export function maskUserId(userId: string): string {
  const last4 = userId.replace(/-/g, "").slice(-4);
  return `${MASK_CHAR.repeat(4)}-${MASK_CHAR.repeat(4)}-${MASK_CHAR.repeat(4)}-${MASK_CHAR.repeat(4)}-${MASK_CHAR.repeat(8)}${last4}`;
}

/** Full body mask except last 4 of UUID compact (legacy). */
export function maskAccountNumber(userId: string): string {
  const last4 = userId.replace(/-/g, "").slice(-4).toUpperCase();
  return `BROK-${MASK_CHAR.repeat(4)}${last4}`;
}

/**
 * Demo-friendly partial mask: BROK-AB••••GH (prefix + edges).
 * Prefer this when Hide IDs is on.
 */
export function halfMaskBrokAccountNumber(userId: string): string {
  return halfMaskAccountCode(formatBrokAccountNumber(userId));
}

export function displayUserId(userId: string, revealed: boolean): string {
  return revealed ? userId : maskUserId(userId);
}

/**
 * Account code for UI.
 * @param hideIds — when true, half-mask for demos/ambassadors (still shows format).
 * Full code remains available via copy only when hideIds is false.
 */
export function displayAccountNumber(
  userId: string,
  hideIds: boolean = false
): string {
  const full = formatBrokAccountNumber(userId);
  return hideIds ? halfMaskAccountCode(full) : full;
}

export function formatBrokAccountLabel(
  user: BrokUser,
  hideIds: boolean = false
): string {
  const name = user.display_name?.trim();
  if (!name) return hideIds ? "BROK ••••••" : "BROK Member";
  return hideIds ? halfMaskName(name) : name;
}

export function shortUserId(userId: string): string {
  return userId.slice(0, 8);
}

const REVEAL_SESSION_KEY = "brok_account_revealed";
const MAIN_ACCOUNT_CODE_KEY = "brok_main_account_code";
const REVEAL_TTL_MS = 30 * 60 * 1000;

/** Remember account code on this browser for linking other devices. */
export function saveMainAccountCode(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MAIN_ACCOUNT_CODE_KEY, formatBrokAccountNumber(userId));
}

export function loadMainAccountCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MAIN_ACCOUNT_CODE_KEY);
}

export function isAccountIdRevealed(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(REVEAL_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { userId?: string; expiresAt?: number };
    if (parsed.userId !== userId) return false;
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(REVEAL_SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function setAccountIdRevealed(userId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    REVEAL_SESSION_KEY,
    JSON.stringify({ userId, expiresAt: Date.now() + REVEAL_TTL_MS })
  );
}

export function clearAccountIdRevealed(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(REVEAL_SESSION_KEY);
}