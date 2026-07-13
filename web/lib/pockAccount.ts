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

export function maskAccountNumber(userId: string): string {
  const last4 = userId.replace(/-/g, "").slice(-4).toUpperCase();
  return `BROK-${MASK_CHAR.repeat(4)}${last4}`;
}

export function displayUserId(userId: string, revealed: boolean): string {
  return revealed ? userId : maskUserId(userId);
}

/** Account code is always visible — needed to link devices. Not a secret. */
export function displayAccountNumber(userId: string, _revealed?: boolean): string {
  return formatBrokAccountNumber(userId);
}

export function formatBrokAccountLabel(user: BrokUser): string {
  const name = user.display_name?.trim();
  if (name) return name;
  return "BROK Member";
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