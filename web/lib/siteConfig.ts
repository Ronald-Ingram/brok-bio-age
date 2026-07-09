/** Canonical site URLs — brok.neobanx.com is the live domain */
/** DNS: Cloudflare zone neobanx.com — account ronald@neobanx.com (not ringram08@gmail.com) */

export const PREFERRED_SITE_URL = "https://brok.neobanx.com";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? PREFERRED_SITE_URL;

export const SITE_DOMAIN = "brok.neobanx.com";

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}