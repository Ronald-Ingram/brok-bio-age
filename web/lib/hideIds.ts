/**
 * Demo / ambassador privacy: half-mask names & account codes for pattern education
 * without full exposure on shared screens.
 */

const MASK = "•";
export const HIDE_IDS_STORAGE_KEY = "brok_hide_ids";

export function readHideIdsPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HIDE_IDS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeHideIdsPreference(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HIDE_IDS_STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

/** Show first half of a token; mask the rest (min 1 mask if length > 1). */
export function halfMaskToken(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.length === 1) return MASK;
  if (t.length === 2) return t[0] + MASK;
  const show = Math.ceil(t.length / 2);
  return t.slice(0, show) + MASK.repeat(t.length - show);
}

/** Per-word half-mask for display names. */
export function halfMaskName(name: string): string {
  const t = name.trim();
  if (!t) return t;
  return t
    .split(/\s+/)
    .map((part) => halfMaskToken(part))
    .join(" ");
}

/**
 * BROK-XXXXXXXX → BROK-AB••••GH (prefix + first 2 + last 2 of body).
 * Keeps recognizable format for education / demos.
 */
export function halfMaskAccountCode(code: string): string {
  const t = code.trim().toUpperCase();
  if (!t.startsWith("BROK-")) return halfMaskToken(t);
  const body = t.slice(5).replace(/[^A-Z0-9]/g, "");
  if (body.length <= 2) return `BROK-${MASK.repeat(Math.max(body.length, 4))}`;
  if (body.length <= 4) {
    return `BROK-${body.slice(0, 1)}${MASK.repeat(body.length - 1)}`;
  }
  const head = body.slice(0, 2);
  const tail = body.slice(-2);
  const midLen = Math.max(body.length - 4, 2);
  return `BROK-${head}${MASK.repeat(midLen)}${tail}`;
}

/** Soft balance mask for demos: keep magnitude band when possible. */
export function halfMaskBalance(amount: number): string {
  if (!Number.isFinite(amount)) return "•••";
  const n = Math.abs(Math.round(amount));
  if (n < 10) return MASK.repeat(2);
  const s = n.toLocaleString("en-US");
  const digits = s.replace(/\D/g, "");
  if (digits.length <= 2) return MASK.repeat(digits.length);
  const show = Math.min(2, Math.ceil(digits.length / 2));
  // e.g. 12,450 → 12,•••
  const maskedDigits =
    digits.slice(0, show) + MASK.repeat(digits.length - show);
  let di = 0;
  let out = "";
  for (const ch of s) {
    if (/\d/.test(ch)) {
      out += maskedDigits[di++] ?? MASK;
    } else {
      out += ch;
    }
  }
  return amount < 0 ? `-${out}` : out;
}
