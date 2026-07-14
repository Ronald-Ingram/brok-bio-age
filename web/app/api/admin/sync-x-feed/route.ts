import { assertAdmin } from "@/lib/adminAuth";
import {
  buildRonaldIngramXKnowledgeBlock,
  syncFounderXFeed,
  xApiConfigured,
  type FounderPost,
} from "@/lib/ronaldIngramX";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("brok_founder_x_feed")
      .select("post_id, posted_at, content, url, source, updated_at")
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(40);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      count: data?.length ?? 0,
      posts: data ?? [],
      xApiConfigured: xApiConfigured(),
      hint: xApiConfigured()
        ? "X_BEARER_TOKEN present — Sync will pull up to ~100 recent @RonaldIngram posts"
        : "Set X_BEARER_TOKEN (or TWITTER_BEARER_TOKEN) on Vercel for full timeline sync",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "load_failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      posts?: FounderPost[];
    };
    const result = await syncFounderXFeed(body.posts);
    const preview = await buildRonaldIngramXKnowledgeBlock();
    return NextResponse.json({
      ok: true,
      ...result,
      previewChars: preview.length,
      hint:
        result.source === "x_api"
          ? "Synced from official X API"
          : result.source === "jina"
            ? "X API missed — used public scrape. Confirm X_BEARER_TOKEN on production."
            : "Fell back to snapshot — check token and X API access.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "sync_failed" },
      { status: 500 }
    );
  }
}
