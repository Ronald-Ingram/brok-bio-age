/**
 * Live + proprietary founder feed from @RonaldIngram on X.
 * Used for $POCK progress/community so BROK is not trapped in static Canon.
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
These are REAL recent posts with permalinks — primary public narrative for $POCK progress, community, soft launch, Neobanx updates.

CITATION RULE: When a post is relevant, include its full https://x.com/.../status/... LINK in the user-visible answer (markdown or plain URL). Pick the single most relevant post when the user asks for "the tweet" or a specific update. Do NOT invent post URLs.

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
    if (/\bpock\b|jupiter|launch|soft\s*launch|brok|bio-?age|iem/i.test(t)) {
      score += 1;
    }
    if (p.url) score += 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

async function loadCachedPosts(limit = 20): Promise<FounderPost[]> {
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
    const post_id =
      p.post_id ||
      p.url?.match(/status\/(\d+)/)?.[1] ||
      `hash_${Buffer.from(content.slice(0, 80)).toString("base64url").slice(0, 24)}`;
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
 * Falls back silently.
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
    // Split into rough tweet-sized chunks from the plain text dump.
    const chunks = text
      .split(/\n{2,}/)
      .map((c) => c.replace(/\s+/g, " ").trim())
      .filter((c) => c.length > 40 && c.length < 800)
      .filter(
        (c) =>
          !/sign in|sign up|cookie|javascript|enable/i.test(c) &&
          (c.includes("$POCK") ||
            c.includes("POCK") ||
            c.includes("BROK") ||
            c.includes("Neobanx") ||
            c.includes("launch") ||
            c.includes("Jupiter") ||
            c.length > 80)
      )
      .slice(0, 12);
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

/** Official X API v2 if bearer token present. */
async function fetchViaXApi(): Promise<FounderPost[]> {
  const token =
    process.env.X_BEARER_TOKEN?.trim() ||
    process.env.TWITTER_BEARER_TOKEN?.trim() ||
    "";
  if (!token) return [];

  try {
    // Resolve user id
    const uRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${RONALD_INGRAM_HANDLE}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!uRes.ok) return [];
    const uJson = (await uRes.json()) as { data?: { id?: string } };
    const userId = uJson.data?.id;
    if (!userId) return [];

    const tRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=15&tweet.fields=created_at,text&exclude=retweets,replies`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!tRes.ok) return [];
    const tJson = (await tRes.json()) as {
      data?: { id: string; text: string; created_at?: string }[];
    };
    return (tJson.data ?? []).map((t) => ({
      post_id: t.id,
      posted_at: t.created_at ?? null,
      content: t.text,
      url: `https://x.com/${RONALD_INGRAM_HANDLE}/status/${t.id}`,
    }));
  } catch {
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
}> {
  let posts = await fetchViaXApi();
  let note = "X API v2";
  if (!posts.length) {
    posts = await fetchViaJina();
    note = "public timeline extract";
  }
  if (posts.length) {
    void upsertFounderPosts(posts, note).catch(() => null);
  } else {
    posts = await loadCachedPosts(20);
    note = "proprietary cache (brok_founder_x_feed)";
  }
  if (!posts.length) {
    posts = FALLBACK_SNAPSHOT;
    note = "embedded recent snapshot (refresh via admin Sync X feed)";
  }
  return { posts, note };
}

export async function buildRonaldIngramXKnowledgeBlock(
  question?: string
): Promise<string> {
  const { posts, note } = await loadFounderPostsForChat();
  let block = formatFeedBlock(posts, note);
  if (question) {
    const best = pickMostRelevantFounderPost(posts, question);
    if (best?.url) {
      block += `\n\nMOST RELEVANT POST FOR THIS QUESTION (cite this link in the answer):\n"${best.content.slice(0, 280)}${best.content.length > 280 ? "…" : ""}"\n${best.url}`;
    }
  }
  return block;
}

/** Admin: force refresh cache from X API / Jina / optional manual posts. */
export async function syncFounderXFeed(manual?: FounderPost[]): Promise<{
  upserted: number;
  source: string;
}> {
  if (manual?.length) {
    const n = await upsertFounderPosts(manual, "admin_manual");
    return { upserted: n, source: "admin_manual" };
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
  const upserted = await upsertFounderPosts(posts, source);
  return { upserted, source };
}
