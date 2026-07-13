-- Public memory suggestions (pending admin review) + optional bookkeeping
-- Medium memory itself already exists (020). This is the intake queue only.

create table if not exists public.brok_memory_suggestions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.brok_users(id) on delete set null,
  suggested_title   text not null,
  suggested_content text not null,
  suggested_tags    text[] not null default '{}',
  question_patterns text,
  reason            text,
  kind              text not null default 'medium'
                    check (kind in ('medium', 'canon', 'news')),
  status            text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  verification_note text,
  verified_by       text,
  reviewed_at       timestamptz,
  reviewed_by       text,
  resulting_memory_id uuid,
  created_at        timestamptz not null default now()
);

create index if not exists brok_memory_suggestions_status_idx
  on public.brok_memory_suggestions (status, created_at desc);

create index if not exists brok_memory_suggestions_user_idx
  on public.brok_memory_suggestions (user_id, created_at desc);

alter table public.brok_memory_suggestions enable row level security;

comment on table public.brok_memory_suggestions is
  'User-proposed medium/canon/news memory; never applied until admin approves';
