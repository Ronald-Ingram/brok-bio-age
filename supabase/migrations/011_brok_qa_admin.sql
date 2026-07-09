-- BROK Q&A logging, admin corrections, querent flags, short-term memory

create table if not exists public.brok_chat_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.brok_users(id) on delete set null,
  session_id      text,
  querent_label   text,
  question        text not null,
  answer          text,
  provider        text,
  page_pathname   text,
  high_iq_alerted boolean not null default false,
  corrected_answer text,
  correction_scope text check (correction_scope is null or correction_scope in ('short_term', 'canonical')),
  corrected_at    timestamptz,
  corrected_by    text default 'admin',
  created_at      timestamptz not null default now()
);

create index if not exists brok_chat_log_user_created_idx
  on public.brok_chat_log (user_id, created_at desc);

create index if not exists brok_chat_log_querent_idx
  on public.brok_chat_log (querent_label, created_at desc);

create index if not exists brok_chat_log_high_iq_pending_idx
  on public.brok_chat_log (created_at desc)
  where high_iq_alerted = false;

create table if not exists public.brok_querent_flags (
  user_id     uuid primary key references public.brok_users(id) on delete cascade,
  high_iq     boolean not null default false,
  admin_note  text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.brok_short_term_memory (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.brok_users(id) on delete cascade,
  question_pattern  text,
  content           text not null,
  source_chat_log_id uuid references public.brok_chat_log(id) on delete set null,
  expires_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists brok_short_term_memory_user_idx
  on public.brok_short_term_memory (user_id, created_at desc);

alter table public.brok_chat_log enable row level security;
alter table public.brok_querent_flags enable row level security;
alter table public.brok_short_term_memory enable row level security;

-- Service role only (admin APIs use getServiceSupabase)

comment on table public.brok_chat_log is 'BROK chat Q&A log for admin review and corrections';
comment on table public.brok_querent_flags is 'Admin flags per querent (e.g. high_iq for priority alerts)';
comment on table public.brok_short_term_memory is 'Short-term corrected answers injected into BROK chat context';