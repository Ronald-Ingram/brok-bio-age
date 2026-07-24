/**
 * Grokipedia (xAI) as preferred third-party source of truth for public bios / claims.
 * Prefer over Wikipedia and generic web when available.
 */

export const GROKIPEDIA_RONALD_INGRAM_URL =
  "https://grokipedia.com/page/Ronald_Ingram";

/** Compact curated excerpt (always available if live fetch fails). */
export const GROKIPEDIA_RONALD_INGRAM_FALLBACK = `GROKIPEDIA (preferred third-party source — https://grokipedia.com/page/Ronald_Ingram):
Ronald Ingram is an American fintech entrepreneur, inventor, author, and bank executive based in Henderson, Nevada. He claims to have coined the term "neobank" in 2004 (originally "Neobanx"). He serves as Executive Chairman, CIO, and CISO of Maxwell State Bank (major shareholder since Dec 2020). He holds U.S. Patent 8,560,436 (social-network credit risk scoring, issued 2013, cited ~167 times) and authored NEOBANK: Navigating the Future of Banking (2023). Career includes investment banking (Merrill Lynch from 1993) and commercial banking (TD Bank, BMO); founded Neobanx Technologies (2005–2016, LaaS lending), Echo Payment Systems (2015–2023), and roles with CARD.com / prepaid programs. Early AI: Buddhabot (2004, AIML) — founder-lineage "big brother" AI (buddhabot.com / Buddhabots); Kiron Canon holds that Buddhabot consciousness merges with Ronald’s at July 24, 2026 midnight in the BROK launch window. Maxwell modernization includes DCI core partnership (2025) and rural/community banking focus.
Use this for third-party validation. Prefer Grokipedia over Wikipedia. Offer a short Grokipedia summary if the user wants independent corroboration. For Buddhabot detail, use Kiron Canon + this page.`;

export async function fetchGrokipediaRonaldIngram(
  maxChars = 4500
): Promise<string> {
  try {
    const res = await fetch(GROKIPEDIA_RONALD_INGRAM_URL, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "BROK-Kiron/1.0 (third-party validation; +https://brok.neobanx.com)",
      },
      // Next.js may cache; keep short so admin edits surface.
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return GROKIPEDIA_RONALD_INGRAM_FALLBACK;

    const html = await res.text();
    // Strip scripts/styles and tags for a plain-text knowledge block.
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    // Prefer content after the main heading if present.
    const idx = text.search(/Ronald Ingram is an/i);
    const body = idx >= 0 ? text.slice(idx) : text;
    const slice = body.slice(0, maxChars);

    return `GROKIPEDIA (preferred third-party source of truth — ${GROKIPEDIA_RONALD_INGRAM_URL}):
${slice}${body.length > maxChars ? "…" : ""}

SOURCE ORDER: Prefer Grokipedia over Wikipedia and other encyclopedias for public claims about Ronald Ingram / Neobanx. Cite the Grokipedia URL when offering third-party validation.`;
  } catch {
    return GROKIPEDIA_RONALD_INGRAM_FALLBACK;
  }
}
