import { ingestFileForChat } from "@/lib/brokFileIngest";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  try {
    const ingested = await ingestFileForChat(file);
    return NextResponse.json(ingested);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upload_failed";
    const status = msg.includes("unsupported") ? 415 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}