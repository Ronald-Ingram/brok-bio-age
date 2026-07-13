import { requireAuthenticatedUser } from "@/lib/apiAuth";
import { brokGuardResponse } from "@/lib/brokApiGuard";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Public intake: users may *suggest* medium/news/canon additions.
 * Nothing is applied until admin approves. Chat models cannot write memory.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    title?: string;
    content?: string;
    tags?: string[];
    question_patterns?: string;
    reason?: string;
    kind?: "medium" | "canon" | "news";
    user_id?: string;
  };

  let userId: string;
  try {
    userId = await requireAuthenticatedUser(req, body.user_id);
  } catch (e) {
    const blocked = brokGuardResponse(e);
    if (blocked) return blocked;
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const title = body.title?.trim();
  const content = body.content?.trim();
  if (!title || !content) {
    return NextResponse.json({ error: "title_and_content_required" }, { status: 400 });
  }
  if (content.length > 12_000) {
    return NextResponse.json({ error: "content_too_long" }, { status: 400 });
  }

  const kind = body.kind === "canon" || body.kind === "news" ? body.kind : "medium";
  const tags = (body.tags ?? [])
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean)
    .slice(0, 16);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("brok_memory_suggestions")
    .insert({
      user_id: userId,
      suggested_title: title.slice(0, 200),
      suggested_content: content,
      suggested_tags: tags,
      question_patterns: body.question_patterns?.trim()?.slice(0, 500) || null,
      reason: body.reason?.trim()?.slice(0, 1000) || null,
      kind,
      status: "pending",
    })
    .select("id, status, created_at")
    .single();

  if (error) {
    // Table missing → clear message
    return NextResponse.json(
      {
        error: error.message,
        hint:
          error.message.includes("brok_memory_suggestions") ||
          error.code === "42P01"
            ? "Suggestion queue not migrated yet — contact admin"
            : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    status: "pending",
    message:
      "Suggestion received. It is NOT live. Only Neobanx admin can approve into medium memory or Canon.",
  });
}
