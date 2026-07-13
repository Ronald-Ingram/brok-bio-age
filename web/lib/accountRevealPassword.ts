import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LEN = 64;

export function hashRevealPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyRevealPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  if (!salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, "hex");
    const derived = scryptSync(password, salt, KEY_LEN);
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

/**
 * Device PIN: 4–8 digits preferred for simplicity.
 * Also accepts longer passphrases (8–128) for users who already set one.
 */
export function validateRevealPassword(password: string): string | null {
  if (!password) return "password_too_short";
  const digitsOnly = /^\d{4,8}$/.test(password);
  const passphrase = password.length >= 8 && password.length <= 128;
  if (!digitsOnly && !passphrase) {
    return "password_too_short";
  }
  if (password.length > 128) {
    return "password_too_long";
  }
  return null;
}