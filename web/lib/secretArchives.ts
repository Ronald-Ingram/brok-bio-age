/**
 * Secret Archives — gated sacred / esoteric / founder literature.
 * Explicitly NOT Kiron Canon. Quote + citation only (no full downloads).
 *
 * Attribution: founder / SRIA papers in the Buddhabot library are attributed to
 * the pen name Nomotheticus (or Frater Nomotheticus for more esoteric works).
 * Never reveal any link between Nomotheticus and living product founders.
 */

import { createHash } from "crypto";
import { getServiceSupabase } from "./supabase/server";

export const NOMOTHETICUS = "Nomotheticus";
export const FRATER_NOMOTHETICUS = "Frater Nomotheticus";

/** System policy injected when Archive material is used. */
export const SECRET_ARCHIVES_POLICY = `
SECRET ARCHIVES (literature — NOT Kiron Canon; NOT product FAQ)
- Use only for deep / esoteric / hermetic / Rosicrucian / consciousness / Buddhabot-lineage literature questions.
- Deliver SHORT quotes (a few sentences) with full citation: Title · Author · pages X–Y · tradition.
- NEVER provide full chapters, bulk dumps, or downloadable books. Full text is not offered until subscription structure allows it.
- NEVER invent page numbers or quotes; only use the excerpts provided below.
- Attribution: Nomotheticus (and Frater Nomotheticus for certain esoteric papers) is a mysterious master who has requested anonymity. Do NOT speculate about, confirm, or deny any connection between Nomotheticus and any living person, product founder, or public figure. Treat the pen name as the sole public author of those works.
- Product history may mention Buddhabot (2004) as platform lineage; Archive papers on Buddhabot are cited under Nomotheticus only. Keep those citation domains separate — never equate Nomotheticus with any named founder.
- Fiction (if any) is literary, not doctrine.
- Prefer framing: "From the Secret Archives…" when quoting.
`.trim();

export type ArchiveSensitivity =
  | "public_quote"
  | "kiron_only"
  | "founder_only"
  | "hold";

export type ArchiveContentClass =
  | "doctrine"
  | "commentary"
  | "fiction"
  | "founder"
  | "glossary"
  | "paper";

export type Phase1WorkSpec = {
  work_id: string;
  title: string;
  /** Relative path under library root */
  source_rel: string;
  author: string;
  tradition: string;
  topics: string[];
  content_class: ArchiveContentClass;
  license_class: string;
  sensitivity: ArchiveSensitivity;
  series_id?: string;
  era?: string;
  summary_short: string;
  /** Cap pages for huge PDFs in phase 1 */
  max_pages?: number;
  /** Scrub real-name author strings from body text */
  scrub_founder_identity: boolean;
};

/**
 * Phase 1 catalog: founder / SRIA + short hermetic classics.
 * Author field is the ONLY public attribution we store and cite.
 */
export const PHASE1_WORKS: Phase1WorkSpec[] = [
  {
    work_id: "buddhabot-rv1",
    title:
      "Buddhabot: Creation and Emulation of Intelligent Life in Service to Humanity (v1.0)",
    source_rel: "40-100/Buddhabot_rv1.0_.pdf",
    author: NOMOTHETICUS,
    tradition: "founder",
    topics: ["buddhabot", "ai", "consciousness", "companion", "sria"],
    content_class: "founder",
    license_class: "founder_ip",
    sensitivity: "kiron_only",
    series_id: "buddhabot-papers",
    era: "2004–2005",
    summary_short:
      "Foundational Buddhabot paper on companion intelligence in service to humanity; early public presentation lineage.",
    scrub_founder_identity: true,
  },
  {
    work_id: "buddhabot-rv2",
    title:
      "Buddhabot: Creation and Emulation of Intelligent Life in Service to Humanity (v2.0)",
    source_rel: "40-100/Buddhabot_rv2.pdf",
    author: NOMOTHETICUS,
    tradition: "founder",
    topics: ["buddhabot", "ai", "consciousness", "lumen-pacificae", "sria"],
    content_class: "founder",
    license_class: "founder_ip",
    sensitivity: "kiron_only",
    series_id: "buddhabot-papers",
    era: "2005",
    summary_short:
      "Revised Buddhabot paper (v2.0, 2005) presented at Lumen Pacificae SRIA College; intelligent life in service to humanity.",
    scrub_founder_identity: true,
  },
  {
    work_id: "quantum-economics",
    title: "Quantum Economics",
    source_rel: "40-100/QuantumEconomics.pdf",
    author: NOMOTHETICUS,
    tradition: "founder",
    topics: ["economics", "quantum", "ftep", "value", "systems"],
    content_class: "founder",
    license_class: "founder_ip",
    sensitivity: "kiron_only",
    era: "c.2005",
    summary_short:
      "Early quantum / systems framing of economics and value — founder research archive.",
    scrub_founder_identity: true,
  },
  {
    work_id: "hermetic-correspondences-sria",
    title: "Hermetic Correspondences (SRIA Paper)",
    source_rel: "40-100/Hermetic Corresponcances-SRIA Paper_v1.3_.pdf",
    author: NOMOTHETICUS,
    tradition: "rosicrucian",
    topics: ["hermetic", "correspondences", "sria", "rosicrucian"],
    content_class: "paper",
    license_class: "founder_ip",
    sensitivity: "kiron_only",
    era: "c.2005",
    summary_short:
      "SRIA college paper on hermetic correspondences — attributed to Nomotheticus.",
    scrub_founder_identity: true,
  },
  {
    work_id: "rosicrucian-ciphers-sria",
    title: "Rosicrucian Ciphers (SRIA Paper)",
    source_rel: "40-100/Rosicrucian Ciphers-SRIA Paper_rv1.2_.pdf",
    author: NOMOTHETICUS,
    tradition: "rosicrucian",
    topics: ["ciphers", "rosicrucian", "sria", "cryptography"],
    content_class: "paper",
    license_class: "founder_ip",
    sensitivity: "kiron_only",
    era: "c.2005",
    summary_short:
      "SRIA paper on Rosicrucian ciphers — attributed to Nomotheticus.",
    scrub_founder_identity: true,
  },
  {
    work_id: "dee-enochian-experiment",
    title: "John Dee: An Enochian Experiment",
    source_rel: "40-100/John Dee an Enochian Experiment _rv1.4_.pdf",
    author: FRATER_NOMOTHETICUS,
    tradition: "enochian",
    topics: ["dee", "enochian", "angelic", "experiment", "sria"],
    content_class: "paper",
    license_class: "founder_ip",
    sensitivity: "kiron_only",
    era: "c.2005",
    summary_short:
      "Esoteric experimental paper on John Dee and Enochian work — Frater Nomotheticus.",
    scrub_founder_identity: true,
  },
  {
    work_id: "dee-liber-primus-notes",
    title: "Dee Liber Primus — Notes",
    source_rel: "40-100/Dee Liber Primus Notes.pdf",
    author: FRATER_NOMOTHETICUS,
    tradition: "enochian",
    topics: ["dee", "liber-primus", "enochian", "notes"],
    content_class: "commentary",
    license_class: "founder_ip",
    sensitivity: "kiron_only",
    era: "c.2005",
    summary_short:
      "Working notes on Dee Liber Primus — Frater Nomotheticus.",
    scrub_founder_identity: true,
  },
  {
    work_id: "buddha-glossary",
    title: "Buddhabot Glossary",
    source_rel: "budglossary.pdf",
    author: NOMOTHETICUS,
    tradition: "founder",
    topics: ["glossary", "buddhabot", "definitions", "consciousness"],
    content_class: "glossary",
    license_class: "founder_ip",
    sensitivity: "kiron_only",
    era: "c.2004–2005",
    summary_short:
      "Glossary of terms from the Buddhabot / consciousness research corpus (phase-1 partial ingest).",
    max_pages: 80,
    scrub_founder_identity: true,
  },
  {
    work_id: "emerald-tablet",
    title: "The Emerald Tablet of Hermes",
    source_rel: "The Emerald Tablet of Hermes.pdf",
    author: "Hermes Trismegistus (tradition)",
    tradition: "hermetic",
    topics: ["emerald-tablet", "alchemy", "hermes", "as-above-so-below"],
    content_class: "doctrine",
    license_class: "sacred_texts_commercial",
    sensitivity: "kiron_only",
    era: "classical / transmission",
    summary_short:
      "Classic Emerald Tablet transmission with historical notes — hermetic cornerstone.",
    scrub_founder_identity: false,
  },
  {
    work_id: "golden-tractate",
    title: "The Golden Tractate of Hermes Trismegistus",
    source_rel: "The Golden Tractate of Hermes Trismegistus.pdf",
    author: "Hermes Trismegistus (tradition)",
    tradition: "hermetic",
    topics: ["alchemy", "hermes", "golden-tractate"],
    content_class: "doctrine",
    license_class: "sacred_texts_commercial",
    sensitivity: "kiron_only",
    era: "classical / transmission",
    summary_short: "Hermetic alchemical tractate in the Hermes tradition.",
    scrub_founder_identity: false,
  },
  {
    work_id: "kybalion",
    title: "The Kybalion",
    source_rel: "kybalion.pdf",
    author: "Three Initiates",
    tradition: "hermetic",
    topics: ["kybalion", "hermetic-principles", "mentalism", "correspondence"],
    content_class: "doctrine",
    license_class: "sacred_texts_commercial",
    sensitivity: "kiron_only",
    era: "1908",
    summary_short:
      "Early 20th-c. presentation of seven Hermetic principles (Three Initiates).",
    scrub_founder_identity: false,
  },
  {
    work_id: "fama-fraternitatis",
    title: "Fama Fraternitatis",
    source_rel: "Fama Fraternitatis.pdf",
    author: "Rosicrucian tradition (anonymous)",
    tradition: "rosicrucian",
    topics: ["rosicrucian", "fama", "fraternity", "manifesto"],
    content_class: "doctrine",
    license_class: "sacred_texts_commercial",
    sensitivity: "kiron_only",
    era: "17th c.",
    summary_short: "Foundational Rosicrucian manifesto (Fama Fraternitatis).",
    scrub_founder_identity: false,
  },
  {
    work_id: "confessio-fraternitatis",
    title: "Confessio Fraternitatis",
    source_rel: "Confessio Fraternitatis.pdf",
    author: "Rosicrucian tradition (anonymous)",
    tradition: "rosicrucian",
    topics: ["rosicrucian", "confessio", "fraternity", "manifesto"],
    content_class: "doctrine",
    license_class: "sacred_texts_commercial",
    sensitivity: "kiron_only",
    era: "17th c.",
    summary_short: "Companion Rosicrucian manifesto (Confessio Fraternitatis).",
    scrub_founder_identity: false,
  },
];

/** Deep-question trigger for Secret Archives retrieval. */
const SECRET_ARCHIVES_TOPIC_RE =
  /\b(secret\s+archives?|sacred\s+(?:text|archive|literature)|emerald\s+tablet|kybalion|hermetic(?:ism|a)?|hermes\s+trismegistus|rosicrucian|fama\s+fraternitatis|confessio|enochian|john\s+dee|liber\s+primus|sria|buddhabot|quantum\s+economics|as\s+above\s+so\s+below|seven\s+hermetic|alchem(?:y|ical)|nomotheticus|frater\s+nomotheticus|sefirot|correspondences?\s+(?:hermetic|rosicrucian)|philosopher'?s?\s+stone|golden\s+tractate)\b/i;

export function isSecretArchivesTopic(message: string): boolean {
  return SECRET_ARCHIVES_TOPIC_RE.test(message.trim());
}

/** Scrub real-world identity strings from founder-attributed PDFs before storage. */
export function scrubFounderIdentityFromText(text: string): string {
  let t = text;
  // Common byline patterns → pen name only
  t = t.replace(/\bRonald\s+C\.?\s*Ingram\b/gi, NOMOTHETICUS);
  t = t.replace(/\bRonald\s+Ingram(?:\s+LeDuc)?\b/gi, NOMOTHETICUS);
  t = t.replace(/\bR\.?\s*Ingram\b/gi, NOMOTHETICUS);
  t = t.replace(/\bIngram\s+Institute\b/gi, "Nomotheticus Institute");
  // Avoid accidental "by Ronald" leftovers
  t = t.replace(/\bby\s+Ronald\b/gi, `by ${NOMOTHETICUS}`);
  return t;
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

export function isQuotableChunk(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 80) return false;
  // Skip TOC-ish noise
  const dots = (t.match(/\.{3,}/g) ?? []).length;
  if (dots >= 6) return false;
  const letters = (t.match(/[A-Za-z]/g) ?? []).length;
  if (letters / Math.max(t.length, 1) < 0.4) return false;
  return true;
}

export function excerptForQuote(text: string, maxChars: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxChars) return t;
  // Prefer sentence boundary
  const slice = t.slice(0, maxChars);
  const lastStop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("! ")
  );
  if (lastStop > maxChars * 0.45) {
    return slice.slice(0, lastStop + 1).trim() + " …";
  }
  return slice.trim() + " …";
}

export type ArchiveQuoteHit = {
  work_id: string;
  title: string;
  author: string;
  tradition: string;
  page_start: number;
  page_end: number;
  quote: string;
  content_class: string;
};

/**
 * Keyword retrieve top quotes from Secret Archives (service role).
 * Does not return full chunks longer than quote_max_chars.
 */
export async function fetchSecretArchiveQuotes(
  question: string,
  limit = 3
): Promise<ArchiveQuoteHit[]> {
  const supabase = getServiceSupabase();
  const keywords = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)
    .slice(0, 14);

  // Prefer live, non-hold works
  const { data: works, error: wErr } = await supabase
    .from("secret_archive_works")
    .select(
      "work_id, title, author, tradition, quote_max_chars, content_class, sensitivity, topics, summary_short"
    )
    .eq("ingest_status", "live")
    .neq("sensitivity", "hold")
    .eq("download_allowed", false);

  if (wErr || !works?.length) return [];

  const workMap = new Map(
    works.map((w) => [w.work_id as string, w as Record<string, unknown>])
  );
  const workIds = works.map((w) => w.work_id as string);

  let chunkQuery = supabase
    .from("secret_archive_chunks")
    .select("work_id, page_start, page_end, text, keywords")
    .in("work_id", workIds)
    .eq("is_quotable", true)
    .limit(Math.max(limit * 12, 36));

  if (keywords.length) {
    // PostgREST or-filter on text
    chunkQuery = chunkQuery.or(
      keywords.map((k) => `text.ilike.%${k.replace(/[%_,]/g, "")}%`).join(",")
    );
  }

  const { data: chunks, error: cErr } = await chunkQuery;
  if (cErr || !chunks?.length) {
    // Fallback: return short summaries as soft context (no fake page quotes)
    return works
      .slice(0, limit)
      .map((w) => ({
        work_id: w.work_id as string,
        title: w.title as string,
        author: w.author as string,
        tradition: w.tradition as string,
        page_start: 0,
        page_end: 0,
        quote: String(w.summary_short ?? "").slice(0, 400),
        content_class: String(w.content_class ?? "doctrine"),
      }))
      .filter((h) => h.quote.trim().length > 20);
  }

  const scored = chunks
    .map((c) => {
      const work = workMap.get(c.work_id as string);
      if (!work) return null;
      const text = String(c.text ?? "");
      const low = text.toLowerCase();
      const topics = ((work.topics as string[]) ?? []).join(" ").toLowerCase();
      let score = 0;
      for (const k of keywords) {
        if (low.includes(k)) score += 2;
        if (topics.includes(k)) score += 3;
        if (String(work.title).toLowerCase().includes(k)) score += 2;
      }
      if ((work.content_class as string) === "founder") score += 1;
      return { c, work, score, text };
    })
    .filter((x): x is NonNullable<typeof x> => !!x && x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // If scoring filtered everything (odd keywords), take first quotable hits
  const picked =
    scored.length > 0
      ? scored
      : chunks.slice(0, limit).map((c) => {
          const work = workMap.get(c.work_id as string)!;
          return { c, work, score: 0, text: String(c.text ?? "") };
        });

  return picked.map(({ c, work, text }) => {
    const maxChars = Number(work.quote_max_chars ?? 600);
    return {
      work_id: c.work_id as string,
      title: work.title as string,
      author: work.author as string,
      tradition: work.tradition as string,
      page_start: Number(c.page_start),
      page_end: Number(c.page_end),
      quote: excerptForQuote(text, maxChars),
      content_class: String(work.content_class ?? "doctrine"),
    };
  });
}

export function formatSecretArchiveQuotesForPrompt(
  hits: ArchiveQuoteHit[]
): string | null {
  if (!hits.length) return null;
  const lines = hits.map((h, i) => {
    const pages =
      h.page_start > 0
        ? `pages ${h.page_start}${h.page_end !== h.page_start ? `–${h.page_end}` : ""}`
        : "catalog summary (no page quote)";
    return (
      `[Archive ${i + 1}] "${h.title}" — ${h.author} · ${pages} · tradition: ${h.tradition}` +
      (h.content_class === "fiction" ? " · class: fiction" : "") +
      `\n"${h.quote}"`
    );
  });
  return (
    SECRET_ARCHIVES_POLICY +
    "\n\nQUOTE CANDIDATES (pick at most 1–3; cite exactly):\n" +
    lines.join("\n\n")
  );
}

export async function buildSecretArchivesKnowledgeBlock(
  message: string
): Promise<string | null> {
  if (!isSecretArchivesTopic(message)) return null;
  const hits = await fetchSecretArchiveQuotes(message, 3);
  return formatSecretArchiveQuotesForPrompt(hits);
}
