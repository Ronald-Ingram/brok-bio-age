import { getServiceSupabase } from "./supabase/server";

export interface LogChatParams {
  userId?: string;
  sessionId?: string;
  question: string;
  answer: string;
  provider?: string;
  pagePathname?: string;
}

export async function resolveQuerentLabel(userId?: string): Promise<string | null> {
  if (!userId) return null;
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("brok_users")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.display_name?.trim() || userId.slice(0, 8);
}

export async function isHighIqQuerent(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("brok_querent_flags")
    .select("high_iq")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data?.high_iq);
}

export async function logBrokChat(params: LogChatParams): Promise<string | null> {
  try {
    const supabase = getServiceSupabase();
    const querentLabel = await resolveQuerentLabel(params.userId);
    const highIq = await isHighIqQuerent(params.userId);

    const { data, error } = await supabase
      .from("brok_chat_log")
      .insert({
        user_id: params.userId ?? null,
        session_id: params.sessionId ?? null,
        querent_label: querentLabel,
        question: params.question,
        answer: params.answer,
        provider: params.provider ?? null,
        page_pathname: params.pagePathname ?? null,
        high_iq_alerted: !highIq,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[brok_chat_log]", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error("[brok_chat_log]", e);
    return null;
  }
}