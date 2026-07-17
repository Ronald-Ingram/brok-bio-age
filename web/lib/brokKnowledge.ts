import {
  BROK_FAQ_ITEMS,
  canonTagsForFaq,
  formatFaqForCanon,
  formatMatchedFaqForPrompt,
} from "./brokFaqCanon";
import {
  formatUserFactsForPrompt,
  loadUserFacts,
} from "./brokUserFacts";
import {
  KIRON_CANON_FIVE_CORE_VALUES,
  KIRON_CANON_FOUNDER_VALUES,
  KIRON_CANON_FOUNDER_VALUES_TAGS,
} from "./kironCanonFounderValues";
import { getServiceSupabase } from "./supabase/server";

/**
 * Prefer the densest paragraph around query keywords so long Canon PDFs
 * (e.g. Seven Secrets) do not yield only the table of contents.
 */
export function extractRelevantCanonSlice(
  content: string,
  question: string,
  maxChars = 2800
): string {
  const text = content.trim();
  if (!text) return "";
  if (text.length <= maxChars) return text;

  const keywords = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)
    .slice(0, 12);
  const lower = text.toLowerCase();

  let bestIdx = 0;
  let bestScore = -1;
  // Slide a window looking for keyword density
  const step = Math.max(200, Math.floor(maxChars / 4));
  for (let i = 0; i < text.length; i += step) {
    const window = lower.slice(i, i + maxChars);
    let score = 0;
    for (const k of keywords) {
      if (window.includes(k)) score += 2;
    }
    // Prefer body text over pure TOC (many dots / page numbers)
    const dotHeavy = (window.match(/\.{3,}/g) ?? []).length;
    score -= Math.min(dotHeavy, 8);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  // Snap back to a paragraph/line boundary when possible
  const start = Math.max(0, text.lastIndexOf("\n", bestIdx));
  let slice = text.slice(start, start + maxChars).trim();
  if (start > 0) slice = `…${slice}`;
  if (start + maxChars < text.length) slice = `${slice}…`;
  return slice;
}

export async function fetchCanonExcerpts(
  question: string,
  limit = 4
): Promise<string[]> {
  const supabase = getServiceSupabase();
  const keywords = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)
    .slice(0, 12);

  // Fetch extra rows then re-rank so keyword-rich Canon wins over weak matches.
  const fetchLimit = Math.max(limit * 3, 12);
  let query = supabase
    .from("core_knowledge")
    .select("content, tags")
    .limit(fetchLimit);
  if (keywords.length) {
    query = query.or(keywords.map((k) => `content.ilike.%${k}%`).join(","));
  } else {
    query = query.ilike("tags", "%faq%");
  }
  const { data } = await query;
  if (!data?.length) return [];

  const scored = data
    .map((r) => {
      const content = (r.content as string) ?? "";
      const tags = String(r.tags ?? "").toLowerCase();
      const low = content.toLowerCase();
      let score = 0;
      for (const k of keywords) {
        if (tags.includes(k)) score += 4;
        if (low.includes(k)) score += 2;
      }
      // Prefer documents tagged as Kiron Canon / truth hierarchy
      if (tags.includes("kiron") || tags.includes("canon") || tags.includes("truth")) {
        score += 3;
      }
      return { content, score };
    })
    .filter((r) => r.content.trim())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((r) => r.content);
}

export async function fetchShortTermMemory(
  userId: string | undefined,
  question: string,
  limit = 3
): Promise<string[]> {
  if (!userId) return [];
  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  const { data: globalRows } = await supabase
    .from("brok_short_term_memory")
    .select("content, question_pattern")
    .is("user_id", null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data: userRows } = await supabase
    .from("brok_short_term_memory")
    .select("content, question_pattern")
    .eq("user_id", userId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  const qLower = question.toLowerCase();
  const merged = [...(userRows ?? []), ...(globalRows ?? [])];
  const scored = merged
    .map((row) => {
      const pattern = (row.question_pattern as string | null)?.toLowerCase();
      const match = pattern
        ? qLower.includes(pattern) || pattern.split(/\s+/).some((w) => qLower.includes(w))
        : true;
      return { content: row.content as string, match };
    })
    .filter((r) => r.match);

  return [...new Set(scored.map((r) => r.content))].slice(0, limit);
}

const MEDIUM_TERM_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function scoreMediumTermMatch(
  question: string,
  row: {
    title: string;
    content: string;
    tags: string[] | null;
    question_patterns: string | null;
  }
): number {
  const qLower = question.toLowerCase();
  const qWords = qLower.split(/\W+/).filter((w) => w.length > 3);
  let score = 0;

  const patterns = (row.question_patterns ?? "")
    .toLowerCase()
    .split(/[\s,|]+/)
    .filter(Boolean);
  for (const p of patterns) {
    if (qLower.includes(p)) score += 3;
    else if (qWords.some((w) => p.includes(w) || w.includes(p))) score += 1;
  }

  for (const tag of row.tags ?? []) {
    const t = tag.toLowerCase();
    if (qLower.includes(t.replace(/_/g, " ")) || qWords.some((w) => t.includes(w))) {
      score += 2;
    }
  }

  const titleWords = row.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  score += titleWords.filter((w) => qLower.includes(w)).length;

  if (score === 0 && qWords.length) {
    const contentLower = row.content.toLowerCase();
    score += qWords.filter((w) => contentLower.includes(w)).length * 0.5;
  }

  return score;
}

export async function fetchMediumTermMemory(
  userId: string | undefined,
  question: string,
  limit = 2
): Promise<string[]> {
  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  let query = supabase
    .from("brok_medium_term_memory")
    .select("id, title, content, tags, question_patterns")
    .gt("expires_at", now)
    .order("last_accessed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (userId) {
    query = query.or(`user_id.is.null,user_id.eq.${userId}`);
  } else {
    query = query.is("user_id", null);
  }

  const { data } = await query;
  if (!data?.length) return [];

  const scored = data
    .map((row) => ({
      id: row.id as string,
      title: row.title as string,
      content: row.content as string,
      score: scoreMediumTermMatch(question, {
        title: row.title as string,
        content: row.content as string,
        tags: row.tags as string[] | null,
        question_patterns: row.question_patterns as string | null,
      }),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!scored.length) return [];

  const extendUntil = new Date(Date.now() + MEDIUM_TERM_TTL_MS).toISOString();
  const touchedAt = new Date().toISOString();
  void Promise.all(
    scored.map((r) =>
      supabase
        .from("brok_medium_term_memory")
        .update({ last_accessed_at: touchedAt, expires_at: extendUntil })
        .eq("id", r.id)
    )
  ).catch(() => {});

  return scored.map((r) => `${r.title}: ${r.content.slice(0, 1600)}`);
}

export function formatKnowledgeBlock(opts: {
  canon?: string[];
  shortTerm?: string[];
  mediumTerm?: string[];
  userFacts?: string;
  includeStaticFaq?: string;
  /** Longer Canon slices for detailed / long-answer requests */
  detailed?: boolean;
}): string | undefined {
  const canonCap = opts.detailed ? 2800 : 600;
  const parts: string[] = [];
  if (opts.userFacts?.trim()) {
    parts.push("USER PROFILE (known facts):", opts.userFacts.trim());
  }
  if (opts.shortTerm?.length) {
    parts.push(
      "ADMIN-CORRECTED SHORT-TERM MEMORY (prefer over generic answers):",
      ...opts.shortTerm.map((c) => `• ${c}`)
    );
  }
  if (opts.mediumTerm?.length) {
    parts.push(
      "MEDIUM-TERM MEMORY (market intel, 30-day hot — prefer when relevant):",
      ...opts.mediumTerm.map((c) => `• ${c}`)
    );
  }
  if (opts.canon?.length) {
    parts.push(
      opts.detailed
        ? "KIRON CANON EXCERPTS (use thoroughly for this detailed answer — prefer these over generic knowledge):"
        : "KIRON CANON EXCERPTS (prefer these facts when they apply):",
      ...opts.canon.map((c) => `• ${c.slice(0, canonCap)}`)
    );
  }
  if (opts.includeStaticFaq?.trim()) {
    parts.push("GENIUS WALLET / $POCK FAQ (canonical product answers):", opts.includeStaticFaq);
  }
  return parts.length ? parts.join("\n\n") : undefined;
}

export async function buildKnowledgeContext(
  question: string,
  userId?: string,
  opts?: { detailed?: boolean }
): Promise<{ knowledgeBlock?: string; userFactsBlock?: string }> {
  const detailed = Boolean(opts?.detailed);
  // Casual turns: fewer/shorter retrievals → lower prompt tokens & shorter answers.
  const canonLimit = detailed ? 8 : 3;
  const mediumLimit = detailed ? 4 : 1;

  const [canon, shortTerm, mediumTerm, facts] = await Promise.all([
    fetchCanonExcerpts(question, canonLimit).catch(() => [] as string[]),
    fetchShortTermMemory(userId, question, detailed ? 5 : 2).catch(
      () => [] as string[]
    ),
    fetchMediumTermMemory(userId, question, mediumLimit).catch(
      () => [] as string[]
    ),
    userId ? loadUserFacts(userId).catch(() => ({})) : Promise.resolve({}),
  ]);

  const userFactsBlock = formatUserFactsForPrompt(facts);

  const matchedFaq =
    canon.length === 0 && shortTerm.length === 0 && mediumTerm.length === 0
      ? formatMatchedFaqForPrompt(question)
      : formatMatchedFaqForPrompt(question, detailed ? 4 : 1);

  // Slice long Canon docs around the question (avoids TOC-only prefixes).
  const canonSliced = canon.map((c) =>
    extractRelevantCanonSlice(c, question, detailed ? 3200 : 900)
  );

  const knowledgeBlock = formatKnowledgeBlock({
    canon: canonSliced,
    shortTerm,
    mediumTerm,
    includeStaticFaq: matchedFaq,
    detailed,
  });

  return { knowledgeBlock, userFactsBlock };
}

/** Upsert FAQ items into core_knowledge (admin / deploy seed). */
export async function seedFaqToCanon(): Promise<{ inserted: number; skipped: number }> {
  const supabase = getServiceSupabase();
  let inserted = 0;
  let skipped = 0;

  for (const item of BROK_FAQ_ITEMS) {
    const tags = canonTagsForFaq(item);
    const content = formatFaqForCanon(item);
    const { data: existing } = await supabase
      .from("core_knowledge")
      .select("tags")
      .eq("tags", tags)
      .maybeSingle();

    if (existing) {
      await supabase.from("core_knowledge").update({ content }).eq("tags", tags);
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from("core_knowledge").insert({
      tags,
      content,
    });
    if (!error) inserted += 1;
    else skipped += 1;
  }

  // Always refresh founder ethics/values Canon (highest tier)
  const founderSeed = await seedFounderValuesToCanon();
  inserted += founderSeed.inserted;
  skipped += founderSeed.updated;

  return { inserted, skipped };
}
/** Upsert founder ethics / values / history Canon into core_knowledge. */
export async function seedFounderValuesToCanon(): Promise<{
  inserted: number;
  updated: number;
}> {
  const supabase = getServiceSupabase();
  const docs = [
    {
      tags: KIRON_CANON_FOUNDER_VALUES_TAGS,
      content: KIRON_CANON_FOUNDER_VALUES,
    },
    {
      tags:
        "Kiron Canon|tier:highest|truth|values|privacy|security|sovereignty|innovation|community|ingram",
      content: KIRON_CANON_FIVE_CORE_VALUES,
    },
  ];

  let inserted = 0;
  let updated = 0;
  for (const doc of docs) {
    const { data: existing } = await supabase
      .from("core_knowledge")
      .select("tags")
      .eq("tags", doc.tags)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("core_knowledge")
        .update({ content: doc.content })
        .eq("tags", doc.tags);
      updated += 1;
    } else {
      const { error } = await supabase.from("core_knowledge").insert(doc);
      if (!error) inserted += 1;
    }
  }
  return { inserted, updated };
}

/**
 * Always-available founder Canon for ethics/values/history questions
 * (works even before DB seed; also lives in core_knowledge after seed).
 */
export function getFounderValuesCanonBlock(): string {
  return KIRON_CANON_FOUNDER_VALUES + "\n\n" + KIRON_CANON_FIVE_CORE_VALUES;
}
