-- BROK medium-term memory: 30-day hot tier, keyword/tag retrieval, archive on expiry

create table if not exists public.brok_medium_term_memory (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.brok_users(id) on delete cascade,
  title             text not null,
  content           text not null,
  tags              text[] not null default '{}',
  question_patterns text,
  source            text,
  expires_at        timestamptz not null default (now() + interval '30 days'),
  last_accessed_at  timestamptz,
  access_count      int not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists brok_medium_term_memory_user_expires_idx
  on public.brok_medium_term_memory (user_id, expires_at desc);

create index if not exists brok_medium_term_memory_tags_gin_idx
  on public.brok_medium_term_memory using gin (tags);

create index if not exists brok_medium_term_memory_expires_idx
  on public.brok_medium_term_memory (expires_at desc);

create table if not exists public.brok_memory_archive (
  id                uuid primary key,
  user_id           uuid,
  title             text not null,
  content           text not null,
  tags              text[] not null default '{}',
  question_patterns text,
  source            text,
  expires_at        timestamptz,
  last_accessed_at  timestamptz,
  access_count      int not null default 0,
  created_at        timestamptz not null,
  archived_at       timestamptz not null default now()
);

alter table public.brok_medium_term_memory enable row level security;
alter table public.brok_memory_archive enable row level security;

comment on table public.brok_medium_term_memory is
  'Medium-term BROK memory (30d TTL, extend on access); global rows have user_id null';
comment on table public.brok_memory_archive is
  'Cold archive for expired medium-term memory rows';