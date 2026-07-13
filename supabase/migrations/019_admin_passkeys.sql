-- WebAuthn passkeys for /admin (Touch ID / Face ID)

create table if not exists public.brok_admin_passkeys (
  id              uuid primary key default gen_random_uuid(),
  credential_id   text not null unique,
  public_key      bytea not null,
  counter         bigint not null default 0,
  device_label    text,
  transports      text[],
  created_at      timestamptz not null default now(),
  last_used_at    timestamptz
);

create table if not exists public.brok_admin_webauthn_challenges (
  id              uuid primary key default gen_random_uuid(),
  challenge       text not null unique,
  purpose         text not null check (purpose in ('register', 'login')),
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

create index if not exists brok_admin_passkeys_cred_idx
  on public.brok_admin_passkeys (credential_id);

create index if not exists brok_admin_webauthn_challenges_exp_idx
  on public.brok_admin_webauthn_challenges (expires_at);

alter table public.brok_admin_passkeys enable row level security;
alter table public.brok_admin_webauthn_challenges enable row level security;

comment on table public.brok_admin_passkeys is 'Platform passkeys for BROK admin (service role only)';
comment on table public.brok_admin_webauthn_challenges is 'Short-lived WebAuthn challenges for admin passkey flows';