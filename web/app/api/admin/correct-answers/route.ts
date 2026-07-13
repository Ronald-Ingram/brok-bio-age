import { canonTagsForFaq, formatFaqForCanon } from "@/lib/brokFaqCanon";
import { getServiceSupabase } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const querent = url.searchParams.get("querent")?.trim();
  const highIqOnly = url.searchParams.get("high_iq") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

  const supabase = getServiceSupabase();

  let query = supabase
    .from("brok_chat_log")
    .select(
      "id, user_id, session_id, querent_label, question, answer, corrected_answer, correction_scope, corrected_at, created_at, page_pathname, provider"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (querent) {
    query = query.or(
      `querent_label.ilike.%${querent}%,question.ilike.%${querent}%`
    );
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let items = rows ?? [];
  if (highIqOnly) {
    const { data: flags } = await supabase
      .from("brok_querent_flags")
      .select("user_id")
      .eq("high_iq", true);
    const ids = new Set((flags ?? []).map((f) => f.user_id));
    items = items.filter((r) => r.user_id && ids.has(r.user_id));
  }

  const userIds = [...new Set(items.map((r) => r.user_id).filter(Boolean))];
  const { data: flagRows } = userIds.length
    ? await supabase
        .from("brok_querent_flags")
        .select("user_id, high_iq, admin_note")
        .in("user_id", userIds)
    : { data: [] };

  const flagMap = new Map(
    (flagRows ?? []).map((f) => [f.user_id, { highIq: f.high_iq, note: f.admin_note }])
  );

  return NextResponse.json({
    items: items.map((r) => ({
      ...r,
      highIq: r.user_id ? flagMap.get(r.user_id)?.highIq ?? false : false,
      adminNote: r.user_id ? flagMap.get(r.user_id)?.note ?? null : null,
    })),
  });
}

export async function POST(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    chatLogId?: string;
    correctedAnswer?: string;
    scope?: "short_term" | "canonical";
    userId?: string;
    questionPattern?: string;
    highIq?: boolean;
    adminNote?: string;
  };

  if (!body.chatLogId?.trim() || !body.correctedAnswer?.trim() || !body.scope) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  const { data: logRow, error: logErr } = await supabase
    .from("brok_chat_log")
    .select("id, user_id, question, querent_label")
    .eq("id", body.chatLogId)
    .single();

  if (logErr || !logRow) {
    return NextResponse.json({ error: "chat_log_not_found" }, { status: 404 });
  }

  const userId = body.userId ?? logRow.user_id;

  if (body.scope === "short_term") {
    const { error: memErr } = await supabase.from("brok_short_term_memory").insert({
      user_id: userId ?? null,
      question_pattern: body.questionPattern ?? logRow.question.slice(0, 120),
      content: `Q: ${logRow.question}\nA: ${body.correctedAnswer.trim()}`,
      source_chat_log_id: logRow.id,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }
  }

  if (body.scope === "canonical") {
    const truthId = `faq_corrected_${logRow.id.slice(0, 8)}`;
    const content = formatFaqForCanon({
      id: truthId,
      question: logRow.question,
      answer: body.correctedAnswer.trim(),
    });
    const tags = canonTagsForFaq({
      id: truthId,
      question: logRow.question,
      answer: body.correctedAnswer.trim(),
      tags: ["admin_corrected"],
    });

    const { error: canonErr } = await supabase.from("core_knowledge").insert({
      tags,
      content,
      created_at: now,
    });
    if (canonErr) {
      return NextResponse.json({ error: canonErr.message }, { status: 500 });
    }
  }

  await supabase
    .from("brok_chat_log")
    .update({
      corrected_answer: body.correctedAnswer.trim(),
      correction_scope: body.scope,
      corrected_at: now,
    })
    .eq("id", body.chatLogId);

  if (userId && typeof body.highIq === "boolean") {
    await supabase.from("brok_querent_flags").upsert(
      {
        user_id: userId,
        high_iq: body.highIq,
        admin_note: body.adminNote ?? null,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );
  }

  return NextResponse.json({ ok: true, scope: body.scope });
}