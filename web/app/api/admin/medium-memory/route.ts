import { assertAdmin } from "@/lib/adminAuth";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_TTL_DAYS = 30;

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean)
      .slice(0, 24);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,|]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 24);
  }
  return [];
}

/** List medium-term memory + recent canon docs for admin. */
export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getServiceSupabase();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const { data: medium, error: mErr } = await supabase
    .from("brok_medium_term_memory")
    .select(
      "id, user_id, title, content, tags, question_patterns, source, expires_at, last_accessed_at, access_count, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  const { data: canon, error: cErr } = await supabase
    .from("core_knowledge")
    .select("tags, content, created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  let mediumItems = medium ?? [];
  let canonItems = canon ?? [];
  if (q) {
    mediumItems = mediumItems.filter(
      (r) =>
        (r.title as string).toLowerCase().includes(q) ||
        (r.content as string).toLowerCase().includes(q) ||
        String(r.tags ?? "")
          .toLowerCase()
          .includes(q)
    );
    canonItems = canonItems.filter(
      (r) =>
        String(r.tags ?? "")
          .toLowerCase()
          .includes(q) ||
        (r.content as string).toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    medium: mediumItems,
    canon: canonItems.map((r) => ({
      tags: r.tags,
      content: r.content,
      created_at: r.created_at,
      preview: String(r.content ?? "").slice(0, 280),
    })),
  });
}

/** Create or update medium-term (non-canonical) memory. */
export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    id?: string;
    title?: string;
    content?: string;
    tags?: string[] | string;
    question_patterns?: string;
    source?: string;
    /** null = global (all users); uuid = personal */
    user_id?: string | null;
    ttl_days?: number;
  };

  const title = body.title?.trim();
  const content = body.content?.trim();
  if (!title || !content) {
    return NextResponse.json({ error: "title_and_content_required" }, { status: 400 });
  }

  const tags = parseTags(body.tags);
  if (!tags.length) tags.push("admin_medium");

  const ttlDays =
    typeof body.ttl_days === "number" && body.ttl_days > 0
      ? Math.min(body.ttl_days, 365)
      : DEFAULT_TTL_DAYS;
  const expiresAt = new Date(
    Date.now() + ttlDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const supabase = getServiceSupabase();
  const row = {
    title,
    content,
    tags,
    question_patterns: body.question_patterns?.trim() || null,
    source: body.source?.trim() || "admin_panel",
    user_id: body.user_id ?? null,
    expires_at: expiresAt,
  };

  if (body.id?.trim()) {
    const { data, error } = await supabase
      .from("brok_medium_term_memory")
      .update(row)
      .eq("id", body.id.trim())
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, item: data, action: "updated" });
  }

  const { data, error } = await supabase
    .from("brok_medium_term_memory")
    .insert(row)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, item: data, action: "created" });
}

/** Delete medium memory by id, or a canon row by tags+created_at. */
export async function DELETE(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    kind?: "medium" | "canon";
    id?: string;
    tags?: string;
    created_at?: string;
  };

  const supabase = getServiceSupabase();
  const kind = body.kind ?? "medium";

  if (kind === "medium") {
    if (!body.id?.trim()) {
      return NextResponse.json({ error: "id_required" }, { status: 400 });
    }
    const { error } = await supabase
      .from("brok_medium_term_memory")
      .delete()
      .eq("id", body.id.trim());
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deleted: "medium" });
  }

  if (!body.tags?.trim() || !body.created_at?.trim()) {
    return NextResponse.json(
      { error: "tags_and_created_at_required_for_canon" },
      { status: 400 }
    );
  }
  const { error } = await supabase
    .from("core_knowledge")
    .delete()
    .eq("tags", body.tags.trim())
    .eq("created_at", body.created_at.trim());
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: "canon" });
}
