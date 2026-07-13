import { getServiceSupabase } from "./supabase/server";

export type ChatMessageRole = "user" | "assistant";

export type ThreadMessage = {
  role: ChatMessageRole;
  content: string;
};

/** Max user+assistant pairs loaded into Groq context (~12 turns). */
export const MAX_HISTORY_TURNS = 12;

export async function getOrCreateThread(
  userId: string,
  threadId?: string | null,
  opts?: { pagePathname?: string; titleSeed?: string }
): Promise<string> {
  const supabase = getServiceSupabase();

  if (threadId) {
    const { data } = await supabase
      .from("brok_chat_threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  const title =
    opts?.titleSeed?.trim().slice(0, 80) ||
    "BROK conversation";

  const { data, error } = await supabase
    .from("brok_chat_threads")
    .insert({
      user_id: userId,
      title,
      page_pathname: opts?.pagePathname ?? null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "thread_create_failed");
  }
  return data.id as string;
}

export async function loadThreadHistory(
  threadId: string,
  maxTurns = MAX_HISTORY_TURNS
): Promise<ThreadMessage[]> {
  const supabase = getServiceSupabase();
  const limit = maxTurns * 2;

  const { data } = await supabase
    .from("brok_chat_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  return [...data]
    .reverse()
    .map((row) => ({
      role: row.role as ChatMessageRole,
      content: String(row.content),
    }))
    .filter((m) => m.content.trim());
}

export async function appendThreadMessage(
  threadId: string,
  role: ChatMessageRole,
  content: string,
  opts?: { provider?: string; fileMeta?: unknown }
): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("brok_chat_messages").insert({
    thread_id: threadId,
    role,
    content,
    provider: opts?.provider ?? null,
    file_meta: opts?.fileMeta ?? null,
  });
  if (error) console.error("[brok_chat_messages]", error.message);

  await supabase
    .from("brok_chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
}

export async function getActiveThreadForUser(
  userId: string,
  threadId?: string | null
): Promise<{
  thread_id: string;
  title: string | null;
  messages: Array<{
    id: string;
    role: ChatMessageRole;
    content: string;
    created_at: string;
  }>;
} | null> {
  const supabase = getServiceSupabase();
  let resolvedId = threadId ?? null;

  if (resolvedId) {
    const { data: owned } = await supabase
      .from("brok_chat_threads")
      .select("id")
      .eq("id", resolvedId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!owned?.id) resolvedId = null;
  }

  if (!resolvedId) {
    const { data: latest } = await supabase
      .from("brok_chat_threads")
      .select("id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    resolvedId = (latest?.id as string | undefined) ?? null;
  }

  if (!resolvedId) return null;

  const { data: thread } = await supabase
    .from("brok_chat_threads")
    .select("id, title")
    .eq("id", resolvedId)
    .single();

  const { data: messages } = await supabase
    .from("brok_chat_messages")
    .select("id, role, content, created_at")
    .eq("thread_id", resolvedId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY_TURNS * 4);

  return {
    thread_id: resolvedId,
    title: (thread?.title as string | null) ?? null,
    messages: (messages ?? []).map((m) => ({
      id: m.id as string,
      role: m.role as ChatMessageRole,
      content: String(m.content),
      created_at: m.created_at as string,
    })),
  };
}

export async function startNewThread(
  userId: string,
  opts?: { pagePathname?: string }
): Promise<string> {
  return getOrCreateThread(userId, null, {
    pagePathname: opts?.pagePathname,
    titleSeed: "New conversation",
  });
}