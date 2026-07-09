import { inneagramReportHtml, inneagramReportMarkdown } from "@/lib/ingramInneagramReport";
import { scoreQuickInneagram, type InneagramScoreResult } from "@/lib/ingramInneagram";
import { getServiceSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    answers?: Record<number, string>;
    result?: InneagramScoreResult;
    user_id?: string;
    device_id?: string;
    save?: boolean;
  };

  let result: InneagramScoreResult;
  if (body.result) {
    result = body.result;
  } else if (body.answers && Object.keys(body.answers).length >= 8) {
    result = scoreQuickInneagram(body.answers);
  } else {
    return NextResponse.json({ error: "answers_required" }, { status: 400 });
  }

  const generated_at = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dom = result.dominant;
  const html = inneagramReportHtml(result, {
    generated_at,
    subject: `Ingram Inneagram — Type ${dom}`,
  });
  const markdown = inneagramReportMarkdown(result, { generated_at });

  let stored_id: string | null = null;
  if (body.save !== false) {
    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from("ingram_inneagram_results")
        .insert({
          user_id: body.user_id ?? null,
          device_id: body.device_id ?? null,
          version: result.version,
          dominant_type: result.dominant,
          second_type: result.second,
          third_type: result.third,
          repressed_type: result.repressed,
          type_counts: result.typeCounts,
          answers: result.answers,
          report_meta: { generated_at },
        })
        .select("id")
        .single();
      if (!error && data) stored_id = data.id as string;
    } catch {
      /* table may not exist yet — client still has localStorage */
    }
  }

  return NextResponse.json({
    result,
    html,
    markdown,
    generated_at,
    stored_id,
    provider: "ingram_inneagram_quick_v1",
  });
}