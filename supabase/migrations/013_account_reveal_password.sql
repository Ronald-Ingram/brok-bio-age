-- Optional password to reveal full BROK user ID in the UI (hash only; never store plaintext).

alter table public.brok_users
  add column if not exists account_reveal_password_hash text;

comment on column public.brok_users.account_reveal_password_hash is
  'scrypt hash (salt:hex) for unlocking full user ID display; null = not set';