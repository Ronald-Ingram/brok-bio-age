import { INGRAM_TYPES, type InneagramScoreResult } from "./ingramInneagram";
import { getServiceSupabase } from "./supabase/server";

export type UserGender = "male" | "female" | "other";

export type InneagramHypothesis = {
  dominant?: number;
  second?: number;
  third?: number;
  repressed?: number;
  confidence?: "low" | "medium" | "high";
  source?: "inferred" | "formal_test";
  updated_at?: string;
};

export type BrokUserFavorites = {
  music?: string[];
  movies?: string[];
  books?: string[];
};

export type BrokUserFacts = {
  name?: string;
  location?: string;
  gender?: UserGender;
  favorites?: BrokUserFavorites;
  inneagram?: InneagramHypothesis;
};

const FACTS_JSON_RE =
  /(?:^|\n)\s*BROK_FACTS_JSON:\s*(\{[\s\S]*?\})\s*$/m;

function normalizeGender(raw: unknown): UserGender | undefined {
  if (typeof raw !== "string") return undefined;
  const g = raw.trim().toLowerCase();
  if (g === "male" || g === "m" || g === "man") return "male";
  if (g === "female" || g === "f" || g === "woman") return "female";
  if (g === "other" || g === "nonbinary" || g === "non-binary") return "other";
  return undefined;
}

function normalizeStringList(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  return items.length ? items : undefined;
}

function mergeFavorites(
  base: BrokUserFavorites | undefined,
  patch: BrokUserFavorites | undefined
): BrokUserFavorites | undefined {
  if (!base && !patch) return undefined;
  const merged: BrokUserFavorites = { ...base, ...patch };
  for (const key of ["music", "movies", "books"] as const) {
    const prev = base?.[key];
    const next = patch?.[key];
    if (next?.length) {
      merged[key] = [...new Set([...(prev ?? []), ...next])].slice(0, 12);
    }
  }
  return Object.keys(merged).length ? merged : undefined;
}

function mergeInneagram(
  base: InneagramHypothesis | undefined,
  patch: InneagramHypothesis | undefined
): InneagramHypothesis | undefined {
  if (!patch) return base;
  if (!base) return patch;
  if (base.source === "formal_test" && patch.source === "inferred") {
    return base;
  }
  return { ...base, ...patch, updated_at: patch.updated_at ?? base.updated_at };
}

export function mergeUserFacts(
  base: BrokUserFacts,
  patch: Partial<BrokUserFacts>
): BrokUserFacts {
  const next: BrokUserFacts = { ...base };
  if (typeof patch.name === "string" && patch.name.trim()) {
    next.name = patch.name.trim();
  }
  if (typeof patch.location === "string" && patch.location.trim()) {
    next.location = patch.location.trim();
  }
  if (patch.gender) next.gender = patch.gender;
  const favorites = mergeFavorites(base.favorites, patch.favorites);
  if (favorites) next.favorites = favorites;
  const inneagram = mergeInneagram(base.inneagram, patch.inneagram);
  if (inneagram) next.inneagram = inneagram;
  return next;
}

export function parseFactsPatchFromJson(raw: unknown): Partial<BrokUserFacts> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const patch: Partial<BrokUserFacts> = {};

  if (typeof obj.name === "string" && obj.name.trim()) {
    patch.name = obj.name.trim();
  }
  if (typeof obj.location === "string" && obj.location.trim()) {
    patch.location = obj.location.trim();
  }
  const gender = normalizeGender(obj.gender);
  if (gender) patch.gender = gender;

  if (obj.favorites && typeof obj.favorites === "object") {
    const fav = obj.favorites as Record<string, unknown>;
    const favorites: BrokUserFavorites = {};
    const music = normalizeStringList(fav.music);
    const movies = normalizeStringList(fav.movies);
    const books = normalizeStringList(fav.books);
    if (music) favorites.music = music;
    if (movies) favorites.movies = movies;
    if (books) favorites.books = books;
    if (Object.keys(favorites).length) patch.favorites = favorites;
  }

  if (obj.inneagram && typeof obj.inneagram === "object") {
    const inn = obj.inneagram as Record<string, unknown>;
    const hypothesis: InneagramHypothesis = {};
    for (const key of ["dominant", "second", "third", "repressed"] as const) {
      const n = Number(inn[key]);
      if (n >= 1 && n <= 9) hypothesis[key] = n;
    }
    if (inn.confidence === "low" || inn.confidence === "medium" || inn.confidence === "high") {
      hypothesis.confidence = inn.confidence;
    }
    if (inn.source === "inferred" || inn.source === "formal_test") {
      hypothesis.source = inn.source;
    }
    if (Object.keys(hypothesis).length) {
      hypothesis.updated_at = new Date().toISOString();
      patch.inneagram = hypothesis;
    }
  }

  return Object.keys(patch).length ? patch : null;
}

export function parseFactsJsonFromResponse(text: string): {
  cleanText: string;
  factsPatch: Partial<BrokUserFacts> | null;
} {
  const match = text.match(FACTS_JSON_RE);
  if (!match) return { cleanText: text.trim(), factsPatch: null };

  let factsPatch: Partial<BrokUserFacts> | null = null;
  try {
    factsPatch = parseFactsPatchFromJson(JSON.parse(match[1]));
  } catch {
    factsPatch = null;
  }

  const cleanText = text.replace(FACTS_JSON_RE, "").trimEnd();
  return { cleanText, factsPatch };
}

export function formatUserFactsForPrompt(facts: BrokUserFacts): string | undefined {
  const lines: string[] = [];

  if (facts.name) lines.push(`Name: ${facts.name}`);
  if (facts.location) lines.push(`Location (user-shared): ${facts.location}`);
  if (facts.gender) lines.push(`Gender: ${facts.gender}`);

  const fav = facts.favorites;
  if (fav?.music?.length) lines.push(`Favorite music: ${fav.music.join(", ")}`);
  if (fav?.movies?.length) lines.push(`Favorite movies: ${fav.movies.join(", ")}`);
  if (fav?.books?.length) lines.push(`Favorite books: ${fav.books.join(", ")}`);

  const inn = facts.inneagram;
  if (inn?.dominant) {
    const typeInfo = INGRAM_TYPES[inn.dominant as keyof typeof INGRAM_TYPES];
    const label = typeInfo
      ? `Type ${inn.dominant} ${typeInfo.name}`
      : `Type ${inn.dominant}`;
    const src =
      inn.source === "formal_test"
        ? "formal Ingram Inneagram test"
        : `inferred (${inn.confidence ?? "low"} confidence)`;
    lines.push(`Ingram Inneagram: ${label} — ${src}`);
    if (inn.second) lines.push(`  Second: Type ${inn.second}`);
    if (inn.third) lines.push(`  Third: Type ${inn.third}`);
    if (inn.repressed) lines.push(`  Repressed: Type ${inn.repressed}`);
  }

  return lines.length ? lines.join("\n") : undefined;
}

export async function loadUserFacts(userId: string): Promise<BrokUserFacts> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("brok_user_facts")
      .select("facts")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data?.facts || typeof data.facts !== "object") return {};
    return data.facts as BrokUserFacts;
  } catch {
    return {};
  }
}

export async function upsertUserFacts(
  userId: string,
  patch: Partial<BrokUserFacts>
): Promise<BrokUserFacts> {
  const current = await loadUserFacts(userId);
  const merged = mergeUserFacts(current, patch);

  try {
    const supabase = getServiceSupabase();
    await supabase.from("brok_user_facts").upsert(
      {
        user_id: userId,
        facts: merged,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  } catch (e) {
    console.error("[brok_user_facts]", e);
  }

  return merged;
}

export async function syncInneagramFromFormalTest(
  userId: string,
  result: InneagramScoreResult
): Promise<void> {
  await upsertUserFacts(userId, {
    inneagram: {
      dominant: result.dominant,
      second: result.second ?? undefined,
      third: result.third ?? undefined,
      repressed: result.repressed ?? undefined,
      confidence: "high",
      source: "formal_test",
      updated_at: new Date().toISOString(),
    },
  });
}

export const USER_FACTS_DIALOGUE_HINT = `
USER FACTS — learn naturally over time. Store only what the user clearly shares or you infer with reasonable confidence.
Explicit fields: name, location (if volunteered), gender (male/female), favorites (music, movies, books).
Ingram Inneagram: when personality fits the dialogue, ask clarifying questions inspired by the Ingram Inneagram assessment (not a formal quiz). Update your hypothesis as answers arrive. Formal test at /avatar overrides inference.

PERSONALIZATION (sparing, natural — not every turn):
- When KNOWN USER FACTS are present below, use them lightly so replies feel alive and personal — address by first name occasionally, nod to a known interest or Inneagram type only when it fits the topic.
- Do NOT open every answer with the same greeting or restate the full profile. Avoid robotic templates and word-for-word repetition of prior answers.
- Prefer varied structure and phrasing while keeping facts stable. Never invent personal details.
- If no user facts are known, stay warm but general.

When you learn or update facts, append ONE line at the very end (hidden from user):
BROK_FACTS_JSON: {"name":"…","location":"…","gender":"male|female|other","favorites":{"music":["…"],"movies":["…"],"books":["…"]},"inneagram":{"dominant":N,"second":N,"confidence":"low|medium|high","source":"inferred"}}
Omit keys you did not learn or change. Never invent location or gender — only record if stated.`;