-- Tiered USD subscriptions with monthly included $POCK pools + per-block metering

alter table public.brok_users
  add column if not exists subscription_tier text
    check (subscription_tier is null or subscription_tier in ('essential', 'premium', 'bio_age')),
  add column if not exists included_pock_remaining integer not null default 0
    check (included_pock_remaining >= 0),
  add column if not exists included_pock_allowance integer not null default 0
    check (included_pock_allowance >= 0),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

alter table public.pock_ledger drop constraint if exists pock_ledger_kind_check;
alter table public.pock_ledger add constraint pock_ledger_kind_check check (kind in (
  'trial_credit', 'calc_debit', 'subscription_debit', 'premium_spend',
  'transfer_out', 'transfer_in', 'withdrawal', 'gift_sent',
  'gift_received', 'impact_donation', 'admin_adjust', 'stripe_credit',
  'included_debit', 'subscription_credit', 'meter_debit'
));

create table if not exists public.stripe_subscription_events (
  stripe_event_id   text primary key,
  user_id           uuid not null references public.brok_users(id) on delete cascade,
  tier              text not null,
  event_kind        text not null check (event_kind in ('checkout', 'renewal', 'cancel')),
  created_at        timestamptz not null default now()
);

create index if not exists stripe_subscription_events_user_idx
  on public.stripe_subscription_events (user_id, created_at desc);

alter table public.stripe_subscription_events enable row level security;

drop policy if exists "subscription events read own" on public.stripe_subscription_events;
create policy "subscription events read own" on public.stripe_subscription_events
  for select using (auth.uid() = user_id);

-- Debit helper: included pool first, then wallet balance
create or replace function public._debit_pock_internal(
  p_user_id uuid,
  p_amount integer,
  p_kind text,
  p_note text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u public.brok_users;
  from_included integer := 0;
  from_balance integer := 0;
  remaining integer;
begin
  if p_amount < 1 then raise exception 'amount_invalid'; end if;

  select * into u from public.brok_users where id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;

  remaining := p_amount;

  if u.subscription_active and u.included_pock_remaining > 0 then
    from_included := least(u.included_pock_remaining, remaining);
    remaining := remaining - from_included;
  end if;

  if remaining > 0 then
    if u.pock_balance < remaining then raise exception 'insufficient_pock'; end if;
    from_balance := remaining;
  end if;

  update public.brok_users set
    included_pock_remaining = included_pock_remaining - from_included,
    pock_balance = pock_balance - from_balance,
    updated_at = now()
  where id = p_user_id returning * into u;

  if from_included > 0 then
    insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
      values (p_user_id, -from_included, u.pock_balance, 'included_debit',
        p_note || ' · included ' || u.included_pock_remaining || ' left');
  end if;

  if from_balance > 0 then
    insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
      values (p_user_id, -from_balance, u.pock_balance, p_kind, p_note);
  end if;

  return jsonb_build_object(
    'debited', true,
    'amount', p_amount,
    'from_included', from_included,
    'from_balance', from_balance,
    'balance', u.pock_balance,
    'included_remaining', u.included_pock_remaining,
    'subscribed', u.subscription_active
  );
end; $$;

create or replace function public.debit_for_calc()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  result := public._debit_pock_internal(uid, 1, 'calc_debit', 'Bio-age calculation');

  update public.brok_users set calc_count = calc_count + 1, updated_at = now()
    where id = uid;

  return result;
end; $$;

-- Per-block agent metering (voice/avatar while speaking)
create or replace function public.debit_metered_turn(
  p_voice_blocks integer default 0,
  p_avatar_blocks integer default 0,
  p_grok boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  base constant integer := 2;
  voice_add constant integer := 3;
  avatar_add constant integer := 8;
  total integer;
  result jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_voice_blocks < 0 or p_avatar_blocks < 0 then raise exception 'amount_invalid'; end if;

  total := base + (p_voice_blocks * voice_add) + (p_avatar_blocks * avatar_add);
  if p_grok then
    total := ceil(total * 1.3);
  end if;

  result := public._debit_pock_internal(
    uid, total, 'meter_debit',
    'Agent turn · voice×' || p_voice_blocks || ' avatar×' || p_avatar_blocks
      || case when p_grok then ' · Grok' else '' end
  );

  return result || jsonb_build_object('meter_cost', total);
end; $$;

create or replace function public.apply_stripe_subscription(
  p_user_id uuid,
  p_tier text,
  p_included_allowance integer,
  p_stripe_event_id text,
  p_stripe_subscription_id text default null,
  p_stripe_customer_id text default null,
  p_renews_at timestamptz default null,
  p_event_kind text default 'checkout',
  p_note text default 'Stripe subscription'
)
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare u public.brok_users;
begin
  if p_tier not in ('essential', 'premium', 'bio_age') then
    raise exception 'invalid_tier';
  end if;
  if p_included_allowance < 1 then raise exception 'allowance_invalid'; end if;
  if p_stripe_event_id is null or length(trim(p_stripe_event_id)) < 8 then
    raise exception 'event_invalid';
  end if;

  if exists (select 1 from public.stripe_subscription_events where stripe_event_id = p_stripe_event_id) then
    select * into u from public.brok_users where id = p_user_id;
    if not found then raise exception 'user not found'; end if;
    return u;
  end if;

  select * into u from public.brok_users where id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;

  insert into public.stripe_subscription_events (stripe_event_id, user_id, tier, event_kind)
    values (p_stripe_event_id, p_user_id, p_tier, coalesce(p_event_kind, 'checkout'));

  update public.brok_users set
    subscription_active = true,
    subscription_recurring = true,
    subscription_tier = p_tier,
    subscription_started_at = coalesce(subscription_started_at, now()),
    subscription_renews_at = coalesce(p_renews_at, now() + interval '1 month'),
    included_pock_allowance = p_included_allowance,
    included_pock_remaining = p_included_allowance,
    stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id),
    stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
    updated_at = now()
  where id = p_user_id returning * into u;

  insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
    values (p_user_id, p_included_allowance, u.pock_balance, 'subscription_credit',
      p_note || ' · ' || p_included_allowance || ' $POCK included pool');

  return u;
end; $$;

create or replace function public.cancel_stripe_subscription(
  p_user_id uuid,
  p_stripe_event_id text,
  p_note text default 'Subscription canceled'
)
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare u public.brok_users;
begin
  if p_stripe_event_id is null or length(trim(p_stripe_event_id)) < 8 then
    raise exception 'event_invalid';
  end if;

  if exists (select 1 from public.stripe_subscription_events where stripe_event_id = p_stripe_event_id) then
    select * into u from public.brok_users where id = p_user_id;
    if not found then raise exception 'user not found'; end if;
    return u;
  end if;

  select * into u from public.brok_users where id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;

  insert into public.stripe_subscription_events (stripe_event_id, user_id, tier, event_kind)
    values (p_stripe_event_id, p_user_id, coalesce(u.subscription_tier, 'essential'), 'cancel');

  update public.brok_users set
    subscription_active = false,
    subscription_recurring = false,
    subscription_tier = null,
    included_pock_remaining = 0,
    included_pock_allowance = 0,
    stripe_subscription_id = null,
    updated_at = now()
  where id = p_user_id returning * into u;

  insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
    values (p_user_id, 0, u.pock_balance, 'subscription_debit', p_note);

  return u;
end; $$;

-- Deprecate POCK-denominated unlimited subscription
create or replace function public.activate_subscription()
returns public.brok_users language plpgsql security definer set search_path = public as $$
begin
  raise exception 'use_stripe_subscription';
end; $$;

create or replace function public.spend_pock(
  p_amount integer,
  p_kind text,
  p_note text,
  p_activate_subscription boolean default false
)
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  result jsonb;
  u public.brok_users;
begin
  if p_activate_subscription then
    raise exception 'use_stripe_subscription';
  end if;
  if p_amount < 1 then raise exception 'amount_invalid'; end if;

  result := public._debit_pock_internal(uid, p_amount, p_kind, p_note);
  select * into u from public.brok_users where id = uid;
  return u;
end; $$;

drop view if exists public.leaderboard_stub;
create view public.leaderboard_stub as
  select
    coalesce(display_name, 'Anonymous') as name,
    calc_count,
    pock_balance,
    case
      when subscription_tier = 'premium' then 'Premium'
      when subscription_tier = 'essential' then 'Essential'
      when subscription_active then 'Pro'
      else 'Trial'
    end as tier,
    updated_at
  from public.brok_users
  order by calc_count desc, pock_balance desc
  limit 50;

grant execute on function public.debit_metered_turn(integer, integer, boolean) to authenticated;
grant execute on function public.apply_stripe_subscription(uuid, text, integer, text, text, text, timestamptz, text, text) to service_role;
grant execute on function public.cancel_stripe_subscription(uuid, text, text) to service_role;