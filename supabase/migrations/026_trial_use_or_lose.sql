-- Welcome trial use-or-lose + corp reclaim helpers (2026-07-23)
-- Does NOT pause trial minting.
-- Policy:
--   • New welcome credits: expire 30 days after grant if unused.
--   • Existing unused welcome balances: expire 10 days from policy day (2026-08-02 America/Los_Angeles).
--   • "Used" = product engagement (calc / meter / paid credits / subscription), not mere existence.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.brok_users
  add column if not exists trial_credited_at timestamptz,
  add column if not exists trial_expires_at timestamptz,
  add column if not exists trial_reclaimed_at timestamptz;

comment on column public.brok_users.trial_expires_at is
  'When unused Welcome trial $POCK may be reclaimed to Neobanx treasury float';
comment on column public.brok_users.trial_reclaimed_at is
  'When unused Welcome trial was clawed back (use-or-lose or farm freeze)';

-- Backfill grant time from first trial_credit ledger (best effort)
update public.brok_users u
set trial_credited_at = sub.first_at
from (
  select user_id, min(created_at) as first_at
  from public.pock_ledger
  where kind = 'trial_credit'
  group by user_id
) sub
where u.id = sub.user_id
  and u.trial_credited = true
  and u.trial_credited_at is null;

update public.brok_users
set trial_credited_at = coalesce(trial_credited_at, created_at)
where trial_credited = true
  and trial_credited_at is null;

-- Existing unused trials: 10 days from policy announce (end of 2026-08-02 Pacific)
-- Used / paid / engaged accounts: leave trial_expires_at null (not subject to pure-trial reclaim)
update public.brok_users u
set trial_expires_at = timestamptz '2026-08-03 06:59:59+00'  -- 2026-08-02 23:59:59 PDT
where u.trial_credited = true
  and u.trial_reclaimed_at is null
  and u.trial_expires_at is null
  and coalesce(u.calc_count, 0) = 0
  and coalesce(u.subscription_active, false) = false
  and not exists (
    select 1 from public.pock_ledger pl
    where pl.user_id = u.id
      and pl.kind in (
        'meter_debit', 'calc_debit', 'subscription_debit', 'premium_spend',
        'included_debit', 'stripe_credit', 'subscription_credit',
        'gift_received', 'transfer_in'
      )
  );

create index if not exists brok_users_trial_expires_idx
  on public.brok_users (trial_expires_at)
  where trial_expires_at is not null and trial_reclaimed_at is null;

-- ---------------------------------------------------------------------------
-- Corp float return (reverse of _allocate_corp_pock for trial reclaim)
-- ---------------------------------------------------------------------------
create or replace function public._return_corp_pock(
  p_amount integer,
  p_user_id uuid default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.corp_pock_wallet;
  new_float bigint;
begin
  if p_amount < 1 then raise exception 'amount_invalid'; end if;

  select * into w from public.corp_pock_wallet where id = 'neobanx' for update;
  if not found then raise exception 'corp_wallet_not_configured'; end if;

  new_float := w.float_remaining + p_amount;

  update public.corp_pock_wallet set
    float_remaining = new_float,
    float_allocated = greatest(0, float_allocated - p_amount),
    updated_at = now()
  where id = 'neobanx';

  insert into public.corp_pock_ledger (amount, float_after, kind, user_id, note)
    values (p_amount, new_float, 'admin_adjust', p_user_id, p_note);
end;
$$;

-- Allow admin_adjust on corp ledger if constraint is strict (already includes admin_adjust in 005)

-- ---------------------------------------------------------------------------
-- Is trial considered "used" (product engagement)?
-- ---------------------------------------------------------------------------
create or replace function public.trial_is_used(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.brok_users u
    where u.id = p_user_id
      and (
        coalesce(u.calc_count, 0) > 0
        or coalesce(u.subscription_active, false) = true
      )
  )
  or exists (
    select 1 from public.pock_ledger pl
    where pl.user_id = p_user_id
      and pl.kind in (
        'meter_debit', 'calc_debit', 'subscription_debit', 'premium_spend',
        'included_debit', 'stripe_credit', 'subscription_credit',
        'gift_received', 'transfer_in'
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Reclaim one user's unused welcome trial (return to treasury float)
-- ---------------------------------------------------------------------------
create or replace function public.reclaim_unused_trial(
  p_user_id uuid,
  p_reason text default 'Welcome trial use-or-lose reclaim',
  p_freeze boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.brok_users;
  reclaim integer;
  trial_amt integer := 100;
begin
  select * into u from public.brok_users where id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if u.trial_reclaimed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_reclaimed', 'user_id', p_user_id);
  end if;

  if not u.trial_credited then
    if p_freeze then
      update public.brok_users set
        account_frozen_at = coalesce(account_frozen_at, now()),
        account_frozen_reason = coalesce(account_frozen_reason, p_reason),
        updated_at = now()
      where id = p_user_id;
    end if;
    return jsonb_build_object('ok', true, 'reclaimed', 0, 'reason', 'no_trial');
  end if;

  if public.trial_is_used(p_user_id) then
    -- Engaged users keep remaining $POCK; clear expiry so cron ignores them
    update public.brok_users set
      trial_expires_at = null,
      updated_at = now()
    where id = p_user_id;
    return jsonb_build_object('ok', true, 'reclaimed', 0, 'reason', 'trial_used_kept');
  end if;

  -- Pure unused trial: claw back min(balance, 100)
  reclaim := least(greatest(coalesce(u.pock_balance, 0), 0), trial_amt);
  if reclaim > 0 then
    update public.brok_users set
      pock_balance = pock_balance - reclaim,
      trial_reclaimed_at = now(),
      trial_expires_at = null,
      account_frozen_at = case when p_freeze then coalesce(account_frozen_at, now()) else account_frozen_at end,
      account_frozen_reason = case
        when p_freeze then coalesce(account_frozen_reason, p_reason)
        else account_frozen_reason
      end,
      updated_at = now()
    where id = p_user_id
    returning * into u;

    insert into public.pock_ledger (user_id, amount, balance_after, kind, note, custody_state)
      values (
        p_user_id,
        -reclaim,
        u.pock_balance,
        'admin_adjust',
        p_reason,
        'reserved'
      );

    perform public._return_corp_pock(
      reclaim,
      p_user_id,
      p_reason || ' · returned to corp float'
    );
  else
    update public.brok_users set
      trial_reclaimed_at = now(),
      trial_expires_at = null,
      account_frozen_at = case when p_freeze then coalesce(account_frozen_at, now()) else account_frozen_at end,
      account_frozen_reason = case
        when p_freeze then coalesce(account_frozen_reason, p_reason)
        else account_frozen_reason
      end,
      updated_at = now()
    where id = p_user_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'reclaimed', reclaim,
    'frozen', p_freeze,
    'balance_after', u.pock_balance
  );
end;
$$;

grant execute on function public.reclaim_unused_trial(uuid, text, boolean) to service_role;
grant execute on function public.trial_is_used(uuid) to service_role;
grant execute on function public._return_corp_pock(integer, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Batch: reclaim all expired unused trials
-- ---------------------------------------------------------------------------
create or replace function public.reclaim_expired_trials(p_limit integer default 500)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
  total integer := 0;
  res jsonb;
begin
  for r in
    select id from public.brok_users
    where trial_expires_at is not null
      and trial_expires_at <= now()
      and trial_reclaimed_at is null
      and trial_credited = true
    order by trial_expires_at asc
    limit greatest(1, least(coalesce(p_limit, 500), 2000))
    for update skip locked
  loop
    res := public.reclaim_unused_trial(
      r.id,
      'Welcome trial expired (use-or-lose) · returned to Neobanx treasury',
      false
    );
    n := n + 1;
    if (res->>'reclaimed')::integer > 0 then
      total := total + (res->>'reclaimed')::integer;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'processed', n, 'pock_returned', total);
end;
$$;

grant execute on function public.reclaim_expired_trials(integer) to service_role;

-- ---------------------------------------------------------------------------
-- bootstrap_user: set 30-day expiry on new welcome grants (mint still on unless kill)
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

  if public.kill_switch_enabled('trial_mint') then
    return u;
  end if;

  if not u.trial_credited then
    begin
      perform public._allocate_corp_pock(
        trial, 'trial_grant', uid,
        'Welcome trial · corp wallet ' || (select wallet_address from public.corp_pock_wallet where id = 'neobanx')
      );
    exception when others then
      -- corp float empty: still create user without trial
      return u;
    end;

    update public.brok_users set
      pock_balance = pock_balance + trial,
      trial_credited = true,
      trial_credited_at = now(),
      trial_expires_at = now() + interval '30 days',
      updated_at = now()
    where id = uid
    returning * into u;

    insert into public.pock_ledger (user_id, amount, balance_after, kind, note, custody_state)
      values (
        uid, trial, u.pock_balance, 'trial_credit',
        'Welcome trial (Neobanx corp-funded) · use within 30 days or return to treasury',
        'reserved'
      );
  end if;

  return u;
end;
$$;
