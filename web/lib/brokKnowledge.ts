import {
  BROK_FAQ_ITEMS,
  canonTagsForFaq,
  formatAllFaqForPrompt,
  formatFaqForCanon,
} from "./brokFaqCanon";
import { getServiceSupabase } from "./supabase/server";

export async function fetchCanonExcerpts(
  question: string,
  limit = 6
): Promise<string[]> {
  const supabase = getServiceSupabase();
  const keywords = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)
    .slice(0, 8);

  let query = supabase.from("core_knowledge").select("content, tags").limit(limit);
  if (keywords.length) {
    query = query.or(keywords.map((k) => `content.ilike.%${k}%`).join(","));
  } else {
    query = query.ilike("tags", "%faq%");
  }
  const { data } = await query;

  return (data ?? []).map((r) => r.content as string).filter(Boolean);
}

export async function fetchShortTermMemory(
  userId: string | undefined,
  question: string,
  limit = 5
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

export function formatKnowledgeBlock(opts: {
  canon?: string[];
  shortTerm?: string[];
  includeStaticFaq?: boolean;
}): string | undefined {
  const parts: string[] = [];
  if (opts.shortTerm?.length) {
    parts.push(
      "ADMIN-CORRECTED SHORT-TERM MEMORY (prefer over generic answers):",
      ...opts.shortTerm.map((c) => `• ${c}`)
    );
  }
  if (opts.canon?.length) {
    parts.push(
      "KIRON CANON EXCERPTS:",
      ...opts.canon.map((c) => `• ${c.slice(0, 1200)}`)
    );
  }
  if (opts.includeStaticFaq) {
    parts.push("GENIUS WALLET / $POCK FAQ (canonical product answers):", formatAllFaqForPrompt());
  }
  return parts.length ? parts.join("\n\n") : undefined;
}

export async function buildKnowledgeContext(
  question: string,
  userId?: string
): Promise<string | undefined> {
  const [canon, shortTerm] = await Promise.all([
    fetchCanonExcerpts(question).catch(() => [] as string[]),
    fetchShortTermMemory(userId, question).catch(() => [] as string[]),
  ]);

  return formatKnowledgeBlock({
    canon,
    shortTerm,
    includeStaticFaq: canon.length === 0 && shortTerm.length === 0,
  });
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

  return { inserted, skipped };
}