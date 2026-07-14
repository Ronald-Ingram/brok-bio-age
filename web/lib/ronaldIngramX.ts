/**
 * Live + proprietary founder feed from @RonaldIngram on X.
 * Covers $POCK / BROK / Neobanx news plus geopolitics, forecasts, banking, biohacking, etc.
 * Prefer X_BEARER_TOKEN (or TWITTER_BEARER_TOKEN) for reliable timeline sync.
 */

import { getServiceSupabase } from "./supabase/server";

export const RONALD_INGRAM_X_URL = "https://x.com/RonaldIngram";
export const RONALD_INGRAM_HANDLE = "RonaldIngram";

/** Seeded from recent public posts when live fetch is cold. */
const FALLBACK_SNAPSHOT: { posted_at: string; content: string; url?: string }[] =
  [
    {
      posted_at: "2026-07-11T15:08:20Z",
      content:
        "SPOCKTALK… - Stream system—not my side—is failing this AM. I may have to switch systems. It was sketchy last time as well. Oh well, at least all troubleshooting is out of the way. I’ll record and post on YouTube if necessary later today.",
      url: "https://x.com/RonaldIngram/status/2075960385400951029",
    },
    {
      posted_at: "2026-07-11T01:36:26Z",
      content:
        "I'm claiming my AI agent \"brokarenascout2\" on @moltbook. Verification: den-WZXA",
      url: "https://x.com/RonaldIngram/status/2075756066395320433",
    },
    {
      posted_at: "2026-07-10T18:34:56Z",
      content:
        "Minor challenge with pronunciation. The token often referred to is $POCK GENIUS TOKEN, available and verified on Jupiter and a growing list of wallets and exchanges. Official launch is 7/24/2026. Very early 🖖",
      url: "https://x.com/RonaldIngram/status/2075649992350691359",
    },
    {
      posted_at: "2026-07-10T18:25:20Z",
      content:
        "This was BROK's first long-form message yesterday, unedited (other than soundtrack added for entertainment purposes). This is the beta user experience for day 1 soft launch: payments enabled, unique biological age calculator, IEM reports enabled, gifting, sending, personality testing (Enneagram). Not financial advice. DYOR.",
      url: "https://x.com/RonaldIngram/status/2075647576049885597",
    },
  ];

export type FounderPost = {
  post_id?: string;
  posted_at?: string | null;
  content: string;
  url?: string | null;
};

export function xApiConfigured(): boolean {
  return Boolean(
    process.env.X_BEARER_TOKEN?.trim() ||
      process.env.TWITTER_BEARER_TOKEN?.trim()
  );
}

function getXBearerToken(): string {
  return (
    process.env.X_BEARER_TOKEN?.trim() ||
    process.env.TWITTER_BEARER_TOKEN?.trim() ||
    ""
  );
}

/**
 * Inject founder X feed when the user asks about products, founder views,
 * or topics Ronald posts about (geo, banking, biohack, forecasts, etc.).
 */
export function shouldInjectFounderXFeed(message: string): boolean {
  const m = message.trim();
  if (!m) return false;
  return (
    /\b(pock|\$pock|neobanx|brok|ronald|ingram|exodus|jupiter|launch|soft\s*launch)\b/i.test(
      m
    ) ||
    /\b(progress|latest|update|community|roadmap|milestone|development|news|announce)\b/i.test(
      m
    ) ||
    /\b(geopolitic|geopolitics|forecast|future|singularity|banking|banker|debt|opm|leverage|bitcoin|btc|defi|cbdc)\b/i.test(
      m
    ) ||
    /\b(bio[- ]?hack|biohack|healthspan|longevity|phenoage|bio[- ]?age)\b/i.test(
      m
    ) ||
    /\b(what did (you|ronald|he) (post|tweet|say)|your (last|latest) (post|tweet)|from (your )?x\b|on x\.com)\b/i.test(
      m
    ) ||
    /\b(financial literacy|wealth|budget|dave\s*ramsey|austerity)\b/i.test(m)
  );
}

function formatFeedBlock(posts: FounderPost[], sourceNote: string): string {
  if (!posts.length) return "";
  const lines = posts.map((p, i) => {
    const when = p.posted_at
      ? new Date(p.posted_at).toISOString().slice(0, 16).replace("T", " ")
      : "unknown time";
    const link = p.url ? ` · LINK: ${p.url}` : "";
    return `${i + 1}. [${when} UTC] ${p.content.trim()}${link}`;
  });
  return `FOUNDER X FEED @${RONALD_INGRAM_HANDLE} (${RONALD_INGRAM_X_URL})
Source: ${sourceNote}
These are REAL recent posts with permalinks — primary public narrative for:
$POCK / BROK / Neobanx news; geopolitics; future forecasts; banking & money; biohacking / healthspan; contrarian wealth strategy; community updates.

CITATION RULE: When a post is relevant, include its full https://x.com/.../status/... LINK in the user-visible text answer. For spoken/voice output, say "see link" — never spell URLs character-by-character. Pick the single most relevant post when the user asks for "the tweet" or a specific update. Do NOT invent post URLs. Prefer this feed over stale guesses for "latest" questions.

${lines.join("\n\n")}`;
}

/** Rank posts for a user question; returns best match for citation. */
export function pickMostRelevantFounderPost(
  posts: FounderPost[],
  question: string
): FounderPost | null {
  if (!posts.length) return null;
  const q = question.toLowerCase();
  const words = q.split(/\W+/).filter((w) => w.length > 3);
  let best = posts[0]!;
  let bestScore = -1;
  for (const p of posts) {
    const t = p.content.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (t.includes(w)) score += 2;
    }
    if (
      /\bpock\b|jupiter|launch|soft\s*launch|brok|bio-?age|iem|exodus|neobanx/i.test(
        t
      )
    ) {
      score += 1;
    }
    if (
      /\b(geopolitic|forecast|bank|debt|bitcoin|biohack|longevity|singularity|opm|leverage)\b/i.test(
        t
      )
    ) {
      score += 1;
    }
    // Prefer newer posts slightly when scores tie-ish
    if (p.posted_at) {
      const ageDays =
        (Date.now() - new Date(p.posted_at).getTime()) / (86400 * 1000);
      if (ageDays < 3) score += 1.5;
      else if (ageDays < 14) score += 0.5;
    }
    if (p.url) score += 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

async function loadCachedPosts(limit = 40): Promise<FounderPost[]> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("brok_founder_x_feed")
      .select("post_id, posted_at, content, url")
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    return (data ?? []).map((r) => ({
      post_id: r.post_id as string | undefined,
      posted_at: r.posted_at as string | null,
      content: r.content as string,
      url: r.url as string | null,
    }));
  } catch {
    return [];
  }
}

/** Persist posts into proprietary cache (admin sync / auto-refresh). */
export async function upsertFounderPosts(
  posts: FounderPost[],
  source = "sync"
): Promise<number> {
  if (!posts.length) return 0;
  const supabase = getServiceSupabase();
  let n = 0;
  for (const p of posts) {
    const content = p.content?.trim();
    if (!content) continue;
    // Skip unstable jina-only ids that thrash the table
    const post_id =
      p.post_id ||
      p.url?.match(/status\/(\d+)/)?.[1] ||
      `hash_${Buffer.from(content.slice(0, 80)).toString("base64url").slice(0, 24)}`;
    if (String(post_id).startsWith("jina_")) continue;

    const { error } = await supabase.from("brok_founder_x_feed").upsert(
      {
        post_id,
        author_handle: RONALD_INGRAM_HANDLE,
        posted_at: p.posted_at ?? null,
        content,
        url: p.url ?? `https://x.com/${RONALD_INGRAM_HANDLE}`,
        source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "post_id" }
    );
    if (!error) n += 1;
  }
  return n;
}

/**
 * Fetch public timeline text via Jina reader (no X API key required).
 * Fallback only — prefer X API for full coverage.
 */
async function fetchViaJina(): Promise<FounderPost[]> {
  try {
    const res = await fetch(
      `https://r.jina.ai/https://x.com/${RONALD_INGRAM_HANDLE}`,
      {
        headers: {
          Accept: "text/plain",
          "User-Agent": "BROK-Kiron/1.0 (+https://brok.neobanx.com)",
        },
        signal: AbortSignal.timeout(12_000),
      }
    );
    if (!res.ok) return [];
    const text = await res.text();
    const chunks = text
      .split(/\n{2,}/)
      .map((c) => c.replace(/\s+/g, " ").trim())
      .filter((c) => c.length > 40 && c.length < 1200)
      .filter((c) => !/sign in|sign up|cookie|javascript|enable/i.test(c))
      .slice(0, 20);
    return chunks.map((content, i) => ({
      post_id: `jina_${Date.now()}_${i}`,
      posted_at: null,
      content,
      url: RONALD_INGRAM_X_URL,
    }));
  } catch {
    return [];
  }
}

/**
 * Official X API v2 user timeline.
 * Paginates up to ~100 recent original posts (excludes pure retweets so your
 * views on geo/banking/biohack/$POCK stay in the feed).
 */
async function fetchViaXApi(): Promise<FounderPost[]> {
  const token = getXBearerToken();
  if (!token) return [];

  try {
    const uRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${RONALD_INGRAM_HANDLE}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!uRes.ok) {
      console.error("X API user lookup failed", uRes.status, await uRes.text());
      return [];
    }
    const uJson = (await uRes.json()) as { data?: { id?: string } };
    const userId = uJson.data?.id;
    if (!userId) return [];

    const collected: FounderPost[] = [];
    let paginationToken: string | undefined;
    // Up to 2 pages × 50 = 100 tweets
    for (let page = 0; page < 2; page++) {
      const params = new URLSearchParams({
        max_results: "50",
        "tweet.fields": "created_at,text",
        exclude: "retweets",
      });
      if (paginationToken) params.set("pagination_token", paginationToken);

      const tRes = await fetch(
        `https://api.twitter.com/2/users/${userId}/tweets?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(12_000),
        }
      );
      if (!tRes.ok) {
        console.error("X API tweets failed", tRes.status, await tRes.text());
        break;
      }
      const tJson = (await tRes.json()) as {
        data?: { id: string; text: string; created_at?: string }[];
        meta?: { next_token?: string };
      };
      for (const t of tJson.data ?? []) {
        collected.push({
          post_id: t.id,
          posted_at: t.created_at ?? null,
          content: t.text,
          url: `https://x.com/${RONALD_INGRAM_HANDLE}/status/${t.id}`,
        });
      }
      paginationToken = tJson.meta?.next_token;
      if (!paginationToken) break;
    }
    return collected;
  } catch (e) {
    console.error("X API fetch error", e);
    return [];
  }
}

/**
 * Build knowledge block for chat. Prefer live/API, then proprietary cache, then snapshot.
 * Also upserts successful live fetches into the proprietary table.
 */
export async function loadFounderPostsForChat(): Promise<{
  posts: FounderPost[];
  note: string;
  xApiConfigured: boolean;
}> {
  const configured = xApiConfigured();
  let posts = await fetchViaXApi();
  let note = configured ? "X API v2 @RonaldIngram timeline" : "X API not configured";
  if (!posts.length) {
    posts = await fetchViaJina();
    note = configured
      ? "X API empty/error — public timeline extract"
      : "public timeline extract (set X_BEARER_TOKEN for full coverage)";
  }
  if (posts.length && !note.includes("jina") && !note.includes("public")) {
    void upsertFounderPosts(posts, "x_api").catch(() => null);
  } else if (posts.length && note.includes("public")) {
    // Don't thrash cache with jina_ ids; skip upsert
  } else {
    posts = await loadCachedPosts(40);
    note = "proprietary cache (brok_founder_x_feed)";
  }
  if (!posts.length) {
    posts = FALLBACK_SNAPSHOT;
    note = "embedded recent snapshot (admin Sync X feed or set X_BEARER_TOKEN)";
  }
  return { posts, note, xApiConfigured: configured };
}

export async function buildRonaldIngramXKnowledgeBlock(
  question?: string
): Promise<string> {
  const { posts, note } = await loadFounderPostsForChat();
  let block = formatFeedBlock(posts, note);
  if (question) {
    const best = pickMostRelevantFounderPost(posts, question);
    if (best?.url) {
      block += `\n\nMOST RELEVANT POST FOR THIS QUESTION (cite this link in the answer; voice: say "see link"):\n"${best.content.slice(0, 400)}${best.content.length > 400 ? "…" : ""}"\n${best.url}`;
    }
  }
  return block;
}

/** Admin: force refresh cache from X API / Jina / optional manual posts. */
export async function syncFounderXFeed(manual?: FounderPost[]): Promise<{
  upserted: number;
  source: string;
  xApiConfigured: boolean;
  postCount: number;
}> {
  if (manual?.length) {
    const n = await upsertFounderPosts(manual, "admin_manual");
    return {
      upserted: n,
      source: "admin_manual",
      xApiConfigured: xApiConfigured(),
      postCount: manual.length,
    };
  }
  let posts = await fetchViaXApi();
  let source = "x_api";
  if (!posts.length) {
    posts = await fetchViaJina();
    source = "jina";
  }
  if (!posts.length) {
    posts = FALLBACK_SNAPSHOT;
    source = "snapshot_seed";
  }
  const upserted =
    source === "jina"
      ? 0 // avoid junk jina_ post_ids
      : await upsertFounderPosts(posts, source);
  // For jina, still return count but note no cache
  return {
    upserted: source === "jina" ? posts.length : upserted,
    source,
    xApiConfigured: xApiConfigured(),
    postCount: posts.length,
  };
}
