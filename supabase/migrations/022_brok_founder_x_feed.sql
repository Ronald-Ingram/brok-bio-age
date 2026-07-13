-- Proprietary cache of founder X posts for BROK (admin-controlled knowledge base layer)
create table if not exists public.brok_founder_x_feed (
  id              uuid primary key default gen_random_uuid(),
  post_id         text unique,
  author_handle   text not null default 'RonaldIngram',
  posted_at       timestamptz,
  content         text not null,
  url             text,
  source          text not null default 'sync',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists brok_founder_x_feed_posted_idx
  on public.brok_founder_x_feed (posted_at desc nulls last);

alter table public.brok_founder_x_feed enable row level security;

comment on table public.brok_founder_x_feed is
  'Proprietary cache of @RonaldIngram X posts for BROK live community layer; admin-synced';
