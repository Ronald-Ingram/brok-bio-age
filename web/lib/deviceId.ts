const DEVICE_KEY = "brok_bioage_device_v1";
const COOKIE_NAME = "brok_device_v1";
/** 400 days — Chrome/Safari practical max for first-party cookies */
const COOKIE_MAX_AGE_SEC = 400 * 24 * 60 * 60;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const parts = document.cookie.split(";").map((p) => p.trim());
    for (const p of parts) {
      if (p.startsWith(`${name}=`)) {
        const v = decodeURIComponent(p.slice(name.length + 1));
        return v || null;
      }
    }
  } catch {
    /* private mode */
  }
  return null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  try {
    const secure =
      typeof location !== "undefined" && location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
  } catch {
    /* ignore */
  }
}

/**
 * Stable browser identity for Genius Wallet auth binding.
 * Dual-write: localStorage + first-party cookie so iOS “clear cache” or
 * security resets that wipe only one store are less likely to mint a new wallet.
 * Full “Clear Website Data” / private mode still creates a new session — use Switch account + PIN.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  try {
    const fromLs = localStorage.getItem(DEVICE_KEY);
    const fromCookie = readCookie(COOKIE_NAME);
    const id = fromLs || fromCookie || crypto.randomUUID();

    // Heal whichever store is missing
    if (fromLs !== id) {
      try {
        localStorage.setItem(DEVICE_KEY, id);
      } catch {
        /* quota / private */
      }
    }
    if (fromCookie !== id) {
      writeCookie(COOKIE_NAME, id);
    }
    return id;
  } catch {
    // localStorage completely blocked — cookie-only fallback
    const fromCookie = readCookie(COOKIE_NAME);
    if (fromCookie) return fromCookie;
    const id = crypto.randomUUID();
    writeCookie(COOKIE_NAME, id);
    return id;
  }
}
