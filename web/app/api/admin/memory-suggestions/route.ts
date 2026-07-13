import { assertAdmin } from "@/lib/adminAuth";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function optionalGrokNewsCheck(content: string): Promise<string | null> {
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL?.trim() || "grok-3",
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "You are a careful fact-check assistant for Neobanx admin. Assess whether the proposed memory item is a verifiable public fact or news claim. Reply with: VERDICT: credible|uncertain|false; confidence; short rationale; what would need verification. Do not invent sources.",
          },
          { role: "user", content: content.slice(0, 4000) },
        ],
      }),
    });
    if (!res.ok) return `grok_check_http_${res.status}`;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    return e instanceof Error ? e.message : "grok_check_failed";
  }
}

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim() || "pending";

  const supabase = getServiceSupabase();
  let query = supabase
    .from("brok_memory_suggestions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    id?: string;
    action?: "approve" | "reject" | "verify_news";
    note?: string;
  };

  if (!body.id?.trim() || !body.action) {
    return NextResponse.json({ error: "id_and_action_required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: row, error: loadErr } = await supabase
    .from("brok_memory_suggestions")
    .select("*")
    .eq("id", body.id.trim())
    .single();

  if (loadErr || !row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (body.action === "verify_news") {
    const note = await optionalGrokNewsCheck(
      `Title: ${row.suggested_title}\n\n${row.suggested_content}`
    );
    await supabase
      .from("brok_memory_suggestions")
      .update({
        verification_note: note,
        verified_by: note ? "xai_grok" : "unavailable",
      })
      .eq("id", row.id);
    return NextResponse.json({ ok: true, verification_note: note });
  }

  if (body.action === "reject") {
    await supabase
      .from("brok_memory_suggestions")
      .update({
        status: "rejected",
        reviewed_at: now,
        reviewed_by: "admin",
        verification_note: body.note ?? row.verification_note,
      })
      .eq("id", row.id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // approve → write medium (default) or leave canon to admin medium/canon tools
  if (row.kind === "canon") {
    // Approve as medium first is safer; admin can promote to canon separately.
    // Still insert into medium as non-canonical unless explicitly news/medium.
  }

  const tags = Array.isArray(row.suggested_tags)
    ? (row.suggested_tags as string[])
    : [];
  const finalTags = tags.length
    ? tags
    : ["user_suggestion", row.kind === "news" ? "news" : "medium"];

  const { data: mem, error: memErr } = await supabase
    .from("brok_medium_term_memory")
    .insert({
      user_id: null, // approved suggestions are global after admin review
      title: row.suggested_title,
      content: row.suggested_content,
      tags: finalTags,
      question_patterns: row.question_patterns,
      source: `suggestion:${row.id}`,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  await supabase
    .from("brok_memory_suggestions")
    .update({
      status: "approved",
      reviewed_at: now,
      reviewed_by: "admin",
      resulting_memory_id: mem?.id ?? null,
      verification_note: body.note ?? row.verification_note,
    })
    .eq("id", row.id);

  return NextResponse.json({
    ok: true,
    status: "approved",
    medium_id: mem?.id,
  });
}
