-- Ingram Inneagram assessment results (distinct from Riso-Hudson)
create table if not exists public.ingram_inneagram_results (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.brok_users(id) on delete set null,
  device_id     text,
  version       text not null default 'quick_v1',
  dominant_type smallint not null check (dominant_type between 1 and 9),
  second_type   smallint check (second_type between 1 and 9),
  third_type    smallint check (third_type between 1 and 9),
  repressed_type smallint check (repressed_type between 1 and 9),
  type_counts   jsonb not null,
  answers       jsonb not null,
  report_meta   jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists ingram_inneagram_user_created_idx
  on public.ingram_inneagram_results (user_id, created_at desc);

create index if not exists ingram_inneagram_device_created_idx
  on public.ingram_inneagram_results (device_id, created_at desc);

alter table public.ingram_inneagram_results enable row level security;

drop policy if exists "inneagram read own" on public.ingram_inneagram_results;
create policy "inneagram read own" on public.ingram_inneagram_results
  for select using (auth.uid() = user_id);

drop policy if exists "inneagram insert own" on public.ingram_inneagram_results;
create policy "inneagram insert own" on public.ingram_inneagram_results
  for insert with check (auth.uid() = user_id or user_id is null);