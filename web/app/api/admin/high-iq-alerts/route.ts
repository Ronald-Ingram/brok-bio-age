import { getServiceSupabase } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getServiceSupabase();

  const { data: flags } = await supabase
    .from("brok_querent_flags")
    .select("user_id, high_iq, admin_note")
    .eq("high_iq", true);

  const userIds = (flags ?? []).map((f) => f.user_id);
  if (!userIds.length) {
    return NextResponse.json({ alerts: [], count: 0 });
  }

  const { data: logs } = await supabase
    .from("brok_chat_log")
    .select(
      "id, user_id, querent_label, question, answer, created_at, high_iq_alerted, corrected_answer"
    )
    .in("user_id", userIds)
    .eq("high_iq_alerted", false)
    .order("created_at", { ascending: false })
    .limit(30);

  const noteMap = new Map(
    (flags ?? []).map((f) => [f.user_id, f.admin_note])
  );

  return NextResponse.json({
    count: logs?.length ?? 0,
    alerts: (logs ?? []).map((l) => ({
      ...l,
      adminNote: noteMap.get(l.user_id) ?? null,
    })),
  });
}

export async function PATCH(req: Request) {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { chatLogIds?: string[] };
  if (!body.chatLogIds?.length) {
    return NextResponse.json({ error: "ids_required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  await supabase
    .from("brok_chat_log")
    .update({ high_iq_alerted: true })
    .in("id", body.chatLogIds);

  return NextResponse.json({ ok: true });
}