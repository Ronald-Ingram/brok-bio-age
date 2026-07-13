-- Durable BROK chat threads, message history, and per-user facts

create table if not exists public.brok_chat_threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.brok_users(id) on delete cascade,
  title           text,
  page_pathname   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists brok_chat_threads_user_updated_idx
  on public.brok_chat_threads (user_id, updated_at desc);

create table if not exists public.brok_chat_messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references public.brok_chat_threads(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  provider        text,
  file_meta       jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists brok_chat_messages_thread_created_idx
  on public.brok_chat_messages (thread_id, created_at asc);

create table if not exists public.brok_user_facts (
  user_id         uuid primary key references public.brok_users(id) on delete cascade,
  facts           jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);

alter table public.brok_chat_threads enable row level security;
alter table public.brok_chat_messages enable row level security;
alter table public.brok_user_facts enable row level security;

drop policy if exists "threads read own" on public.brok_chat_threads;
create policy "threads read own" on public.brok_chat_threads
  for select using (auth.uid() = user_id);

drop policy if exists "threads insert own" on public.brok_chat_threads;
create policy "threads insert own" on public.brok_chat_threads
  for insert with check (auth.uid() = user_id);

drop policy if exists "threads update own" on public.brok_chat_threads;
create policy "threads update own" on public.brok_chat_threads
  for update using (auth.uid() = user_id);

drop policy if exists "messages read own thread" on public.brok_chat_messages;
create policy "messages read own thread" on public.brok_chat_messages
  for select using (
    exists (
      select 1 from public.brok_chat_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "messages insert own thread" on public.brok_chat_messages;
create policy "messages insert own thread" on public.brok_chat_messages
  for insert with check (
    exists (
      select 1 from public.brok_chat_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "facts read own" on public.brok_user_facts;
create policy "facts read own" on public.brok_user_facts
  for select using (auth.uid() = user_id);

drop policy if exists "facts upsert own" on public.brok_user_facts;
create policy "facts insert own" on public.brok_user_facts
  for insert with check (auth.uid() = user_id);

drop policy if exists "facts update own" on public.brok_user_facts;
create policy "facts update own" on public.brok_user_facts
  for update using (auth.uid() = user_id);

comment on table public.brok_chat_threads is 'Durable BROK conversation threads per user';
comment on table public.brok_chat_messages is 'Messages within a BROK chat thread';
comment on table public.brok_user_facts is 'Known facts about the user (name, favorites, Inneagram hypothesis)';