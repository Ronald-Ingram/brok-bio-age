-- Hybrid custody for Genius Token ($POCK)
-- reserved: held in Neobanx ledger until user links a Solana wallet
-- self_custodial: user has linked (or been assigned) an on-chain wallet

alter table public.brok_users
  add column if not exists custody_status text not null default 'reserved'
    check (custody_status in ('reserved', 'self_custodial')),
  add column if not exists solana_wallet_address text,
  add column if not exists solana_wallet_connected_at timestamptz,
  add column if not exists on_chain_pock_balance integer not null default 0
    check (on_chain_pock_balance >= 0);

-- Backfill OG wallet holders as self-custodial
update public.brok_users
set
  custody_status = 'self_custodial',
  solana_wallet_address = coalesce(solana_wallet_address, pock_og_wallet),
  solana_wallet_connected_at = coalesce(solana_wallet_connected_at, pock_og_verified_at)
where pock_og_wallet is not null
  and custody_status = 'reserved';

alter table public.pock_ledger
  add column if not exists custody_state text not null default 'reserved'
    check (custody_state in ('reserved', 'on_chain')),
  add column if not exists solana_tx_signature text;

alter table public.pock_ledger drop constraint if exists pock_ledger_kind_check;
alter table public.pock_ledger add constraint pock_ledger_kind_check check (kind in (
  'trial_credit', 'calc_debit', 'subscription_debit', 'premium_spend',
  'transfer_out', 'transfer_in', 'withdrawal', 'gift_sent',
  'gift_received', 'impact_donation', 'admin_adjust', 'stripe_credit',
  'included_debit', 'subscription_credit', 'meter_debit',
  'reserve_credit', 'custody_connect', 'custody_release'
));

-- Credits always land in reserved ledger pool until on-chain release
create or replace function public._ledger_custody_for_user(p_user_id uuid)
returns text language sql stable as $$
  select case
    when custody_status = 'self_custodial' and solana_wallet_address is not null
      then 'reserved'
    else 'reserved'
  end
  from public.brok_users where id = p_user_id;
$$;

create or replace function public.credit_pock_reserved(
  p_user_id uuid,
  p_amount integer,
  p_kind text,
  p_note text,
  p_idempotency_key text default null
)
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare u public.brok_users;
  ledger_kind text;
begin
  if p_amount < 1 then raise exception 'amount_invalid'; end if;
  if p_kind not in (
    'trial_credit', 'stripe_credit', 'gift_received', 'transfer_in',
    'subscription_credit', 'admin_adjust', 'reserve_credit'
  ) then raise exception 'invalid_credit_kind'; end if;

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
end; $$;

-- Stripe credit wrapper (idempotent)
create or replace function public.credit_pock_from_stripe(
  p_user_id uuid,
  p_amount integer,
  p_stripe_session_id text,
  p_amount_cents integer default null,
  p_note text default 'Stripe top-up'
)
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare u public.brok_users;
  idem text;
begin
  if p_amount < 1 then raise exception 'amount_invalid'; end if;
  if p_stripe_session_id is null or length(trim(p_stripe_session_id)) < 8 then
    raise exception 'session_invalid';
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
end; $$;

-- Bootstrap: new users start reserved (corp-funded trial when available)
create or replace function public.bootstrap_user()
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); u public.brok_users;
  trial constant integer := 100;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.brok_users (id, custody_status)
    values (uid, 'reserved')
  on conflict (id) do nothing;
  select * into u from public.brok_users where id = uid;
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
end; $$;

-- Link Solana wallet → self-custodial (on-chain transfer queued separately)
create or replace function public.connect_solana_wallet(p_address text)
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); u public.brok_users;
  addr text := trim(p_address);
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if addr is null or length(addr) < 32 or length(addr) > 64 then
    raise exception 'wallet_address_invalid';
  end if;

  if exists (
    select 1 from public.brok_users
    where solana_wallet_address = addr and id <> uid
  ) then
    raise exception 'wallet_already_linked';
  end if;

  select * into u from public.brok_users where id = uid for update;
  if not found then raise exception 'user not found'; end if;

  update public.brok_users set
    custody_status = 'self_custodial',
    solana_wallet_address = addr,
    solana_wallet_connected_at = coalesce(solana_wallet_connected_at, now()),
    updated_at = now()
  where id = uid returning * into u;

  insert into public.pock_ledger (
    user_id, amount, balance_after, kind, note, custody_state
  ) values (
    uid,
    0,
    u.pock_balance,
    'custody_connect',
    'Solana wallet linked · ' || left(addr, 8) || '…' || right(addr, 6),
    'reserved'
  );

  return u;
end; $$;

-- Queue on-chain release (actual SPL transfer built later)
create or replace function public.request_custody_release()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); u public.brok_users;
  release_amount integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into u from public.brok_users where id = uid for update;
  if not found then raise exception 'user not found'; end if;

  if u.custody_status <> 'self_custodial' or u.solana_wallet_address is null then
    raise exception 'wallet_not_connected';
  end if;

  if u.pock_balance < 1 then raise exception 'nothing_to_release'; end if;

  release_amount := u.pock_balance;

  update public.brok_users set
    pock_balance = 0,
    on_chain_pock_balance = on_chain_pock_balance + release_amount,
    updated_at = now()
  where id = uid returning * into u;

  insert into public.pock_ledger (
    user_id, amount, balance_after, kind, note, custody_state
  ) values (
    uid,
    -release_amount,
    0,
    'custody_release',
    'Queued on-chain release of ' || release_amount || ' $POCK to '
      || left(u.solana_wallet_address, 8) || '…',
    'on_chain'
  );

  return jsonb_build_object(
    'released', release_amount,
    'wallet', u.solana_wallet_address,
    'on_chain_balance', u.on_chain_pock_balance,
    'status', 'queued'
  );
end; $$;

grant execute on function public.credit_pock_reserved(uuid, integer, text, text, text) to service_role;
grant execute on function public.connect_solana_wallet(text) to authenticated;
grant execute on function public.request_custody_release() to authenticated;