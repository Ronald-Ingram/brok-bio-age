export const DISCLAIMER_KEY = "brok_bioage_disclaimer_v1";
export const DISCLAIMER_COOKIE = "brok_bioage_disclaimer_v1";

export function isDisclaimerAccepted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(DISCLAIMER_KEY) === "1") return true;
  } catch {
    // private mode / storage blocked
  }
  return document.cookie.split(";").some((part) => {
    const [name, value] = part.trim().split("=");
    return name === DISCLAIMER_COOKIE && value === "1";
  });
}

export function markDisclaimerAccepted(): void {
  try {
    localStorage.setItem(DISCLAIMER_KEY, "1");
  } catch {
    // still continue with cookie fallback
  }
  document.cookie = `${DISCLAIMER_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
}