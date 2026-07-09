-- Bind a browser device_id to an existing brok_users row (account recovery across devices).

create table if not exists public.brok_device_bindings (
  device_id   text primary key,
  user_id     uuid not null references public.brok_users(id) on delete cascade,
  bound_at    timestamptz not null default now(),
  bound_via   text default 'reveal_password'
);

create index if not exists brok_device_bindings_user_idx
  on public.brok_device_bindings (user_id);

alter table public.brok_device_bindings enable row level security;

-- No client policies — service role only via API routes.