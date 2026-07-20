-- Gift activation outreach (first receive only) + onboarding feedback metrics.
-- Anonymous usage/feedback reporting (no real names required).

create table if not exists public.pock_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  kind text not null check (kind in ('gift', 'transfer')),
  sender_id uuid references public.brok_users(id) on delete set null,
  amount integer not null check (amount > 0),
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  recipient_user_id uuid references public.brok_users(id) on delete set null,
  claimed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pock_invites_unclaimed_idx
  on public.pock_invites (created_at desc)
  where claimed_at is null;

create index if not exists pock_invites_recipient_email_idx
  on public.pock_invites (recipient_email)
  where recipient_email is not null;

-- One outreach lifecycle per account (first gift/transfer receive only).
create table if not exists public.gift_outreach (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.brok_users(id) on delete cascade,
  invite_id uuid references public.pock_invites(id) on delete set null,
  amount integer,
  contact_email text,
  contact_phone text,
  first_claimed_at timestamptz not null default now(),
  day0_sent_at timestamptz,
  day0_channel text,
  day0_status text,
  day5_sent_at timestamptz,
  day5_channel text,
  day5_status text,
  engaged_at timestamptz,
  in_app_notice_pending boolean not null default true,
  in_app_notice_seen_at timestamptz,
  day5_in_app_pending boolean not null default false,
  day5_in_app_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gift_outreach_day5_due_idx
  on public.gift_outreach (first_claimed_at)
  where day5_sent_at is null and engaged_at is null;

create table if not exists public.brok_onboarding_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.brok_users(id) on delete set null,
  account_code text,
  source text not null check (source in ('day0', 'day5', 'in_app', 'chat', 'email_reply')),
  ease_score integer check (ease_score is null or (ease_score >= 1 and ease_score <= 10)),
  questions text,
  suggestions text,
  why_not_engaged text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists brok_onboarding_feedback_created_idx
  on public.brok_onboarding_feedback (created_at desc);

create index if not exists brok_onboarding_feedback_score_idx
  on public.brok_onboarding_feedback (ease_score)
  where ease_score is not null;

-- Service role only (no public RLS policies — accessed via service client).
alter table public.pock_invites enable row level security;
alter table public.gift_outreach enable row level security;
alter table public.brok_onboarding_feedback enable row level security;
