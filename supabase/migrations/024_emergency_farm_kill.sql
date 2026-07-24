-- Emergency kill: device-wallet trial farm (2026-07-22)
-- Stops free trial mint, freezes siphon accounts, blocks transfers/custody for frozen users.

-- ---------------------------------------------------------------------------
-- Kill switches (global)
-- ---------------------------------------------------------------------------
create table if not exists public.brok_kill_switches (
  key text primary key,
  enabled boolean not null default false,
  reason text,
  updated_at timestamptz not null default now()
);

insert into public.brok_kill_switches (key, enabled, reason) values
  ('trial_mint', true, '2026-07-22 farm: disable Welcome trial +100'),
  ('p2p_transfers', true, '2026-07-22 farm: block gift/send transfer_out'),
  ('new_device_auth', true, '2026-07-22 farm: block new device→auth user mint'),
  ('custody_release_frozen_only', true, 'Frozen accounts cannot release on-chain')
on conflict (key) do update set
  enabled = excluded.enabled,
  reason = excluded.reason,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Per-account freeze
-- ---------------------------------------------------------------------------
alter table public.brok_users
  add column if not exists account_frozen_at timestamptz,
  add column if not exists account_frozen_reason text;

-- Known siphon from 2026-07-22 farm
update public.brok_users set
  account_frozen_at = coalesce(account_frozen_at, now()),
  account_frozen_reason = coalesce(
    account_frozen_reason,
    '2026-07-22 emergency: trial farm sink 1cdaee38'
  ),
  updated_at = now()
where id = '1cdaee38-4f20-4688-be70-0cc250c3cf88';

create index if not exists brok_users_frozen_idx
  on public.brok_users (account_frozen_at)
  where account_frozen_at is not null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.kill_switch_enabled(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select enabled from public.brok_kill_switches where key = p_key),
    false
  );
$$;

create or replace function public.is_account_frozen(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.brok_users
    where id = p_user_id and account_frozen_at is not null
  );
$$;

grant execute on function public.kill_switch_enabled(text) to authenticated, service_role;
grant execute on function public.is_account_frozen(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- bootstrap_user: no trial while trial_mint kill is on
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_user()
returns public.brok_users
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  u public.brok_users;
  trial constant integer := 100;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  insert into public.brok_users (id, custody_status)
    values (uid, 'reserved')
  on conflict (id) do nothing;

  select * into u from public.brok_users where id = uid;
  if not found then raise exception 'user not found'; end if;

  if u.account_frozen_at is not null then
    raise exception 'account_frozen';
  end if;

  -- Emergency: skip free trial mint (farm vector)
  if public.kill_switch_enabled('trial_mint') then
    if not u.trial_credited then
      -- Mark trial path consumed without granting POCK so re-bootstrap cannot mint later
      -- only if we want permanent skip; safer: leave trial_credited false so ops can re-enable.
      null;
    end if;
    return u;
  end if;

  if not u.trial_credited then
    begin
      perform public._allocate_corp_pock(
        trial, 'trial_grant', uid,
        'Welcome trial · corp wallet ' || (select wallet_address from public.corp_pock_wallet where id = 'neobanx')
      );
    exception when others then
      null;
    end;
    update public.brok_users set
      pock_balance = pock_balance + trial,
      trial_credited = true,
      updated_at = now()
    where id = uid returning * into u;
    insert into public.pock_ledger (user_id, amount, balance_after, kind, note, custody_state)
      values (uid, trial, u.pock_balance, 'trial_credit',
        'Welcome trial (reserved in Genius Wallet)', 'reserved');
  end if;
  return u;
end;
$$;

-- ---------------------------------------------------------------------------
-- Debit path: frozen senders blocked; P2P kinds blocked under kill switch
-- ---------------------------------------------------------------------------
create or replace function public.spend_pock(
  p_amount integer,
  p_kind text,
  p_note text,
  p_activate_subscription boolean default false
)
returns public.brok_users
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
  u public.brok_users;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_activate_subscription then
    raise exception 'use_stripe_subscription';
  end if;
  if p_amount < 1 then raise exception 'amount_invalid'; end if;

  if public.is_account_frozen(uid) then
    raise exception 'account_frozen';
  end if;

  if p_kind in ('transfer_out', 'gift_sent')
     and public.kill_switch_enabled('p2p_transfers') then
    raise exception 'transfers_disabled';
  end if;

  result := public._debit_pock_internal(uid, p_amount, p_kind, p_note);
  select * into u from public.brok_users where id = uid;
  return u;
end;
$$;

-- ---------------------------------------------------------------------------
-- Credits: frozen accounts cannot receive invite/stripe farm credits
-- ---------------------------------------------------------------------------
create or replace function public.credit_pock_reserved(
  p_user_id uuid,
  p_amount integer,
  p_kind text,
  p_note text,
  p_idempotency_key text default null
)
returns public.brok_users
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.brok_users;
  ledger_kind text;
begin
  if p_amount < 1 then raise exception 'amount_invalid'; end if;
  if p_kind not in (
    'trial_credit', 'stripe_credit', 'gift_received', 'transfer_in',
    'subscription_credit', 'admin_adjust', 'reserve_credit'
  ) then raise exception 'invalid_credit_kind'; end if;

  if public.is_account_frozen(p_user_id) then
    raise exception 'account_frozen';
  end if;

  if p_idempotency_key is not null and exists (
    select 1 from public.pock_ledger
    where user_id = p_user_id and note like p_idempotency_key || '%'
    limit 1
  ) then
    select * into u from public.brok_users where id = p_user_id;
    if not found then raise exception 'user not found'; end if;
    return u;
  end if;

  insert into public.brok_users (id, custody_status)
    values (p_user_id, 'reserved')
  on conflict (id) do nothing;

  select * into u from public.brok_users where id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;

  if u.account_frozen_at is not null then
    raise exception 'account_frozen';
  end if;

  ledger_kind := case
    when p_kind = 'stripe_credit' then 'stripe_credit'
    when p_kind = 'gift_received' then 'gift_received'
    else coalesce(nullif(p_kind, 'reserve_credit'), 'reserve_credit')
  end;

  update public.brok_users set
    pock_balance = pock_balance + p_amount,
    updated_at = now()
  where id = p_user_id returning * into u;

  insert into public.pock_ledger (
    user_id, amount, balance_after, kind, note, custody_state
  ) values (
    p_user_id,
    p_amount,
    u.pock_balance,
    ledger_kind,
    coalesce(p_idempotency_key || ' · ', '') || p_note || ' · reserved custody',
    'reserved'
  );

  return u;
end;
$$;

create or replace function public.credit_pock_from_stripe(
  p_user_id uuid,
  p_amount integer,
  p_stripe_session_id text,
  p_amount_cents integer default null,
  p_note text default 'Stripe top-up'
)
returns public.brok_users
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.brok_users;
  idem text;
begin
  if p_amount < 1 then raise exception 'amount_invalid'; end if;
  if p_stripe_session_id is null or length(trim(p_stripe_session_id)) < 8 then
    raise exception 'session_invalid';
  end if;

  if public.is_account_frozen(p_user_id) then
    raise exception 'account_frozen';
  end if;

  idem := 'stripe_session:' || p_stripe_session_id;

  if exists (select 1 from public.stripe_payments where stripe_session_id = p_stripe_session_id) then
    select * into u from public.brok_users where id = p_user_id;
    if not found then raise exception 'user not found'; end if;
    return u;
  end if;

  insert into public.stripe_payments (stripe_session_id, user_id, pock_amount, amount_cents)
    values (p_stripe_session_id, p_user_id, p_amount, p_amount_cents);

  return public.credit_pock_reserved(
    p_user_id,
    p_amount,
    'stripe_credit',
    coalesce(p_note, 'Stripe top-up'),
    idem
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Custody release: frozen accounts cannot move $POCK on-chain
-- ---------------------------------------------------------------------------
create or replace function public.request_custody_release(
  p_amount integer default null,
  p_dest_wallet text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  u public.brok_users;
  release_amount integer;
  dest text;
  ledger_id uuid;
  queue_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into u from public.brok_users where id = uid for update;
  if not found then raise exception 'user not found'; end if;

  if u.account_frozen_at is not null then
    raise exception 'account_frozen';
  end if;

  if u.custody_status <> 'self_custodial' or u.solana_wallet_address is null then
    raise exception 'wallet_not_connected';
  end if;

  if u.pock_balance < 1 then raise exception 'nothing_to_release'; end if;

  release_amount := coalesce(p_amount, u.pock_balance);
  if release_amount < 1 then raise exception 'amount_invalid'; end if;
  if release_amount > u.pock_balance then raise exception 'insufficient_pock'; end if;

  dest := coalesce(nullif(trim(p_dest_wallet), ''), u.solana_wallet_address);
  if dest is null or length(dest) < 32 or length(dest) > 64 then
    raise exception 'wallet_address_invalid';
  end if;

  update public.brok_users set
    pock_balance = pock_balance - release_amount,
    on_chain_pock_balance = on_chain_pock_balance + release_amount,
    updated_at = now()
  where id = uid returning * into u;

  insert into public.pock_ledger (
    user_id, amount, balance_after, kind, note, custody_state
  ) values (
    uid,
    -release_amount,
    u.pock_balance,
    'custody_release',
    'On-chain release of ' || release_amount || ' $POCK to '
      || left(dest, 8) || '…',
    'on_chain'
  ) returning id into ledger_id;

  insert into public.custody_release_queue (
    user_id, ledger_id, dest_wallet, amount_pock, status
  ) values (
    uid, ledger_id, dest, release_amount, 'pending'
  ) returning id into queue_id;

  return jsonb_build_object(
    'released', release_amount,
    'wallet', dest,
    'on_chain_balance', u.on_chain_pock_balance,
    'release_id', queue_id,
    'status', 'pending'
  );
end;
$$;

grant execute on function public.request_custody_release(integer, text) to authenticated;
