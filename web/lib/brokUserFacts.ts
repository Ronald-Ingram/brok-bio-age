import { INGRAM_TYPES, type InneagramScoreResult } from "./ingramInneagram";
import { getServiceSupabase } from "./supabase/server";
import {
  resolveSignFromUserFacts,
  tropicalSunSignFromDate,
  parseBirthDate,
} from "./westernAstrology";

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
  /** Free-form colors, e.g. ["deep blue", "gold"] */
  colors?: string[];
};

export type BrokUserFacts = {
  name?: string;
  location?: string;
  /** Current place / city (alias of location if only one shared). */
  place?: string;
  gender?: UserGender;
  /** Self-described race/ethnicity — only if volunteered. */
  race?: string;
  favorites?: BrokUserFavorites;
  inneagram?: InneagramHypothesis;

  /** Faith / spiritual leanings (self-described). */
  religion?: string;
  dietary_constraints?: string[];
  dietary_preferences?: string[];
  hopes?: string[];
  fears?: string[];
  relationship_status?: string;
  employment?: string;
  occupation?: string;
  aspirations?: string[];
  education?: string;
  school_affiliations?: string[];
  children?: string;
  pets?: string;
  /** Pet names (e.g. "Luna the dog") — distinct from freeform pets note. */
  pet_names?: string[];
  /** Family member names (partner, kids, parents, etc.). */
  family_members?: string[];
  /** Frequently mentioned friends. */
  friends?: string[];
  /** Frequently mentioned coworkers / colleagues. */
  coworkers?: string[];
  favorite_color?: string;
  health_conditions?: string[];
  fitness?: string;

  /** ISO or loose date string YYYY-MM-DD preferred. */
  date_of_birth?: string;
  birth_time?: string;
  birth_place?: string;
  /** Western sun sign name if known or derived. */
  sun_sign?: string;
  /** Supplement / protocol notes the user wants remembered. */
  health_stack?: string[];
  goals?: string[];
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

function normalizeString(raw: unknown, max = 200): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().slice(0, max);
  return t || undefined;
}

function normalizeStringList(raw: unknown, maxItems = 16): string[] | undefined {
  if (typeof raw === "string" && raw.trim()) {
    return [raw.trim().slice(0, 120)];
  }
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map((v) => (typeof v === "string" ? v.trim().slice(0, 120) : ""))
    .filter(Boolean);
  return items.length ? [...new Set(items)].slice(0, maxItems) : undefined;
}

function mergeStringLists(
  base?: string[],
  patch?: string[],
  max = 16
): string[] | undefined {
  if (!base?.length && !patch?.length) return undefined;
  return [...new Set([...(base ?? []), ...(patch ?? [])])].slice(0, max);
}

function mergeFavorites(
  base: BrokUserFavorites | undefined,
  patch: BrokUserFavorites | undefined
): BrokUserFavorites | undefined {
  if (!base && !patch) return undefined;
  const merged: BrokUserFavorites = { ...base, ...patch };
  for (const key of ["music", "movies", "books", "colors"] as const) {
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

  const name = normalizeString(patch.name, 80);
  if (name) next.name = name;

  for (const key of [
    "location",
    "place",
    "race",
    "religion",
    "relationship_status",
    "employment",
    "occupation",
    "education",
    "children",
    "pets",
    "favorite_color",
    "fitness",
    "date_of_birth",
    "birth_time",
    "birth_place",
    "sun_sign",
  ] as const) {
    const v = normalizeString(patch[key], key === "date_of_birth" ? 32 : 240);
    if (v) next[key] = v;
  }

  if (patch.gender) next.gender = patch.gender;

  const favorites = mergeFavorites(base.favorites, patch.favorites);
  if (favorites) next.favorites = favorites;
  const inneagram = mergeInneagram(base.inneagram, patch.inneagram);
  if (inneagram) next.inneagram = inneagram;

  for (const key of [
    "dietary_constraints",
    "dietary_preferences",
    "hopes",
    "fears",
    "aspirations",
    "school_affiliations",
    "health_conditions",
    "health_stack",
    "goals",
    "pet_names",
    "family_members",
    "friends",
    "coworkers",
  ] as const) {
    const merged = mergeStringLists(base[key], patch[key], 24);
    if (merged) next[key] = merged;
  }

  // Derive sun sign from DOB when missing
  if (next.date_of_birth && !next.sun_sign) {
    const d = parseBirthDate(next.date_of_birth);
    if (d) {
      const sign = tropicalSunSignFromDate(d.month, d.day);
      if (sign) next.sun_sign = sign.name;
    }
  }

  // Sync place ↔ location lightly
  if (next.place && !next.location) next.location = next.place;
  if (next.location && !next.place) next.place = next.location;
  if (next.favorite_color && next.favorites) {
    next.favorites.colors = mergeStringLists(next.favorites.colors, [
      next.favorite_color,
    ]);
  }

  return next;
}

export function parseFactsPatchFromJson(
  raw: unknown
): Partial<BrokUserFacts> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const patch: Partial<BrokUserFacts> = {};

  for (const key of [
    "name",
    "location",
    "place",
    "race",
    "religion",
    "relationship_status",
    "employment",
    "occupation",
    "education",
    "children",
    "pets",
    "favorite_color",
    "fitness",
    "date_of_birth",
    "birth_time",
    "birth_place",
    "sun_sign",
  ] as const) {
    const v = normalizeString(obj[key], key === "date_of_birth" ? 32 : 240);
    if (v) patch[key] = v;
  }

  const gender = normalizeGender(obj.gender);
  if (gender) patch.gender = gender;

  if (obj.favorites && typeof obj.favorites === "object") {
    const fav = obj.favorites as Record<string, unknown>;
    const favorites: BrokUserFavorites = {};
    for (const k of ["music", "movies", "books", "colors"] as const) {
      const list = normalizeStringList(fav[k], 12);
      if (list) favorites[k] = list;
    }
    if (Object.keys(favorites).length) patch.favorites = favorites;
  }

  for (const key of [
    "dietary_constraints",
    "dietary_preferences",
    "hopes",
    "fears",
    "aspirations",
    "school_affiliations",
    "health_conditions",
    "health_stack",
    "goals",
    "pet_names",
    "family_members",
    "friends",
    "coworkers",
  ] as const) {
    const list = normalizeStringList(obj[key], 24);
    if (list) patch[key] = list;
  }

  if (obj.inneagram && typeof obj.inneagram === "object") {
    const inn = obj.inneagram as Record<string, unknown>;
    const hypothesis: InneagramHypothesis = {};
    for (const key of ["dominant", "second", "third", "repressed"] as const) {
      const n = Number(inn[key]);
      if (n >= 1 && n <= 9) hypothesis[key] = n;
    }
    if (
      inn.confidence === "low" ||
      inn.confidence === "medium" ||
      inn.confidence === "high"
    ) {
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

export function formatUserFactsForPrompt(
  facts: BrokUserFacts
): string | undefined {
  const lines: string[] = [];

  if (facts.name) lines.push(`Name: ${facts.name}`);
  if (facts.location || facts.place) {
    lines.push(`Place / location (user-shared): ${facts.place ?? facts.location}`);
  }
  if (facts.gender) lines.push(`Gender: ${facts.gender}`);
  if (facts.race) lines.push(`Race/ethnicity (self-described): ${facts.race}`);
  if (facts.religion) lines.push(`Religion / spiritual lean: ${facts.religion}`);
  if (facts.relationship_status) {
    lines.push(`Relationship status: ${facts.relationship_status}`);
  }
  if (facts.employment) lines.push(`Employment: ${facts.employment}`);
  if (facts.occupation) lines.push(`Occupation: ${facts.occupation}`);
  if (facts.education) lines.push(`Education: ${facts.education}`);
  if (facts.school_affiliations?.length) {
    lines.push(`Schools / affiliations: ${facts.school_affiliations.join(", ")}`);
  }
  if (facts.children) lines.push(`Children: ${facts.children}`);
  if (facts.pets) lines.push(`Pets (note): ${facts.pets}`);
  if (facts.pet_names?.length) {
    lines.push(`Pet names: ${facts.pet_names.join(", ")}`);
  }
  if (facts.family_members?.length) {
    lines.push(`Family members: ${facts.family_members.join(", ")}`);
  }
  if (facts.friends?.length) {
    lines.push(`Friends (often mentioned): ${facts.friends.join(", ")}`);
  }
  if (facts.coworkers?.length) {
    lines.push(`Coworkers (often mentioned): ${facts.coworkers.join(", ")}`);
  }
  if (facts.favorite_color) lines.push(`Favorite color: ${facts.favorite_color}`);
  if (facts.fitness) lines.push(`Fitness: ${facts.fitness}`);
  if (facts.dietary_constraints?.length) {
    lines.push(`Dietary constraints: ${facts.dietary_constraints.join(", ")}`);
  }
  if (facts.dietary_preferences?.length) {
    lines.push(`Dietary preferences: ${facts.dietary_preferences.join(", ")}`);
  }
  if (facts.health_conditions?.length) {
    lines.push(
      `Health conditions (user-shared, non-clinical use): ${facts.health_conditions.join(", ")}`
    );
  }
  if (facts.health_stack?.length) {
    lines.push(`Health / supplement stack notes: ${facts.health_stack.join("; ")}`);
  }
  if (facts.hopes?.length) lines.push(`Hopes: ${facts.hopes.join("; ")}`);
  if (facts.fears?.length) lines.push(`Fears: ${facts.fears.join("; ")}`);
  if (facts.aspirations?.length) {
    lines.push(`Aspirations: ${facts.aspirations.join("; ")}`);
  }
  if (facts.goals?.length) lines.push(`Goals: ${facts.goals.join("; ")}`);

  if (facts.date_of_birth) {
    lines.push(`Date of birth: ${facts.date_of_birth}`);
  }
  if (facts.birth_time) lines.push(`Birth time: ${facts.birth_time}`);
  if (facts.birth_place) lines.push(`Birth place: ${facts.birth_place}`);

  const sign =
    facts.sun_sign ||
    resolveSignFromUserFacts({
      sun_sign: facts.sun_sign,
      date_of_birth: facts.date_of_birth,
    })?.name;
  if (sign) lines.push(`Western sun sign: ${sign}`);

  const fav = facts.favorites;
  if (fav?.music?.length) lines.push(`Favorite music: ${fav.music.join(", ")}`);
  if (fav?.movies?.length) {
    lines.push(`Favorite movies: ${fav.movies.join(", ")}`);
  }
  if (fav?.books?.length) lines.push(`Favorite books: ${fav.books.join(", ")}`);
  if (fav?.colors?.length) {
    lines.push(`Favorite colors: ${fav.colors.join(", ")}`);
  }

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
USER FACTS — passive, non-invasive. NEVER run an onboarding interview or quiz. Store ONLY what the user clearly shares in conversation. Never invent sensitive fields.

FIELDS (record when volunteered — do not probe for these):
- Identity: name, gender, race/ethnicity (self-described only), location/place
- Life: relationship_status, employment, occupation, education, school_affiliations, children
- People names (important for continuity): family_members, friends, coworkers, pet_names — when they mention someone often or by name in a personal context
- Pets freeform note: pets
- Inner: religion, hopes, fears, aspirations, goals
- Body: dietary_constraints, dietary_preferences, health_conditions, fitness, health_stack
- Taste: favorites music/movies/books, favorite_color
- Birth / astrology: date_of_birth, birth_time, birth_place, sun_sign — only if they offer
- Ingram Inneagram: light inference only; formal test at /avatar overrides

SENSITIVE RULES:
- Race, health, religion, DOB, relationship, people names: ONLY if stated. Never guess.
- Personalize sparingly; never recite the full profile. No interrogation.
- Health talk is educational only — not medical advice.

When you learn or update facts, append ONE line at the very end (hidden from user), omit unchanged keys:
BROK_FACTS_JSON: {"name":"…","family_members":["…"],"friends":["…"],"coworkers":["…"],"pet_names":["…"],"pets":"…","gender":"male|female|other","location":"…","occupation":"…","goals":["…"],"dietary_constraints":["…"],"date_of_birth":"YYYY-MM-DD","sun_sign":"…","favorites":{"music":["…"],"books":["…"]},"inneagram":{"dominant":N,"confidence":"low","source":"inferred"}}
`;
