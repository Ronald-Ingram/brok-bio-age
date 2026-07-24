-- Secret Archives: sacred / esoteric / founder literature (NOT Kiron Canon)
-- Quote-only delivery until subscription structure allows downloads.

create table if not exists public.secret_archive_works (
  id                uuid primary key default gen_random_uuid(),
  work_id           text not null unique,
  title             text not null,
  author            text not null,
  attributed_author text,
  tradition         text not null,
  topics            text[] not null default '{}',
  page_count        integer,
  pages_ingested    integer,
  language          text not null default 'en',
  era               text,
  source_file       text not null,
  source_sha256     text,
  license_class     text not null default 'unknown',
  sensitivity       text not null default 'kiron_only'
    check (sensitivity in ('public_quote', 'kiron_only', 'founder_only', 'hold')),
  content_class     text not null default 'doctrine'
    check (content_class in ('doctrine', 'commentary', 'fiction', 'founder', 'glossary', 'paper')),
  download_allowed  boolean not null default false,
  quote_max_chars   integer not null default 600,
  series_id         text,
  summary_short     text,
  summary_deep      text,
  ingest_status     text not null default 'pending',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists secret_archive_works_tradition_idx
  on public.secret_archive_works (tradition);
create index if not exists secret_archive_works_sensitivity_idx
  on public.secret_archive_works (sensitivity);
create index if not exists secret_archive_works_topics_idx
  on public.secret_archive_works using gin (topics);

create table if not exists public.secret_archive_chunks (
  id            uuid primary key default gen_random_uuid(),
  work_id       text not null references public.secret_archive_works(work_id) on delete cascade,
  chunk_index   integer not null,
  page_start    integer not null,
  page_end      integer not null,
  section_title text,
  text          text not null,
  text_hash     text not null,
  keywords      text[] not null default '{}',
  is_quotable   boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (work_id, chunk_index)
);

create index if not exists secret_archive_chunks_work_idx
  on public.secret_archive_chunks (work_id, page_start);
create index if not exists secret_archive_chunks_quotable_idx
  on public.secret_archive_chunks (is_quotable)
  where is_quotable = true;

-- Full-text search on chunk body (English config)
alter table public.secret_archive_chunks
  add column if not exists text_tsv tsvector
  generated always as (to_tsvector('english', coalesce(text, ''))) stored;

create index if not exists secret_archive_chunks_tsv_idx
  on public.secret_archive_chunks using gin (text_tsv);

alter table public.secret_archive_works enable row level security;
alter table public.secret_archive_chunks enable row level security;
-- Service role only (no public RLS policies) — mirrors other admin/knowledge tables

comment on table public.secret_archive_works is
  'Secret Archives catalog: literature for gated quote-only retrieval; never product Canon';
comment on table public.secret_archive_chunks is
  'Secret Archives page/section chunks for short quoted replies with page citations';
