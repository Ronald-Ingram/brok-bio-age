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
    scope?: "short_term" | "medium_term" | "canonical";
    userId?: string;
    questionPattern?: string;
    highIq?: boolean;
    adminNote?: string;
    title?: string;
  };

  if (!body.chatLogId?.trim() || !body.correctedAnswer?.trim() || !body.scope) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (
    body.scope !== "short_term" &&
    body.scope !== "medium_term" &&
    body.scope !== "canonical"
  ) {
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
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
  const answer = body.correctedAnswer.trim();
  const pattern =
    body.questionPattern?.trim() || logRow.question.slice(0, 160);
  let memoryId: string | null = null;

  if (body.scope === "short_term") {
    const { data: memRow, error: memErr } = await supabase
      .from("brok_short_term_memory")
      .insert({
        // Global so all users get the correction (admin product truth fix)
        user_id: null,
        question_pattern: pattern,
        content: `Q: ${logRow.question}\nA: ${answer}`,
        source_chat_log_id: logRow.id,
        expires_at: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }
    memoryId = memRow?.id ?? null;
  }

  if (body.scope === "medium_term") {
    const title =
      body.title?.trim() ||
      `Corrected: ${logRow.question.slice(0, 80)}${logRow.question.length > 80 ? "…" : ""}`;
    const keywords = String(logRow.question ?? "")
      .toLowerCase()
      .split(/\W+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 8)
      .join(" ");
    const { data: memRow, error: memErr } = await supabase
      .from("brok_medium_term_memory")
      .insert({
        user_id: null,
        title,
        content: `Q: ${logRow.question}\n\nA: ${answer}`,
        tags: ["admin_corrected", "medium", "chat_log"],
        question_patterns: [pattern, keywords].filter(Boolean).join(" | "),
        source: `chat_log:${logRow.id}`,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        access_count: 0,
      })
      .select("id")
      .maybeSingle();
    if (memErr) {
      return NextResponse.json(
        {
          error: memErr.message,
          hint: "If column mismatch, check brok_medium_term_memory schema (title, content, tags, question_patterns, expires_at).",
        },
        { status: 500 }
      );
    }
    memoryId = memRow?.id ?? null;
  }

  if (body.scope === "canonical") {
    const truthId = `faq_corrected_${logRow.id.slice(0, 8)}`;
    const content = formatFaqForCanon({
      id: truthId,
      question: logRow.question,
      answer,
    });
    const tags = canonTagsForFaq({
      id: truthId,
      question: logRow.question,
      answer,
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
      corrected_answer: answer,
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

  return NextResponse.json({
    ok: true,
    scope: body.scope,
    memory_id: memoryId,
    message:
      body.scope === "short_term"
        ? "Saved to short-term memory (~90 days). Injected when similar questions match."
        : body.scope === "medium_term"
          ? "Saved to medium-term memory (~30 days). Visible in Medium Memory panel."
          : "Saved to Kiron Canon (core_knowledge). Permanent product truth.",
  });
}