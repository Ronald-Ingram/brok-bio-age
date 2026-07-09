-- Stripe top-up: idempotent credit + ledger entry

alter table public.pock_ledger drop constraint if exists pock_ledger_kind_check;
alter table public.pock_ledger add constraint pock_ledger_kind_check check (kind in (
  'trial_credit', 'calc_debit', 'subscription_debit', 'premium_spend',
  'transfer_out', 'transfer_in', 'withdrawal', 'gift_sent',
  'gift_received', 'impact_donation', 'admin_adjust', 'stripe_credit'
));

create table if not exists public.stripe_payments (
  id                  uuid primary key default gen_random_uuid(),
  stripe_session_id   text unique not null,
  user_id             uuid not null references public.brok_users(id) on delete cascade,
  pock_amount         integer not null check (pock_amount > 0),
  amount_cents        integer,
  created_at          timestamptz not null default now()
);

create index if not exists stripe_payments_user_idx
  on public.stripe_payments (user_id, created_at desc);

alter table public.stripe_payments enable row level security;

drop policy if exists "stripe payments read own" on public.stripe_payments;
create policy "stripe payments read own" on public.stripe_payments
  for select using (auth.uid() = user_id);

create or replace function public.credit_pock_from_stripe(
  p_user_id uuid,
  p_amount integer,
  p_stripe_session_id text,
  p_amount_cents integer default null,
  p_note text default 'Stripe top-up'
)
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare u public.brok_users;
begin
  if p_amount < 1 then raise exception 'amount_invalid'; end if;
  if p_stripe_session_id is null or length(trim(p_stripe_session_id)) < 8 then
    raise exception 'session_invalid';
  end if;

  if exists (select 1 from public.stripe_payments where stripe_session_id = p_stripe_session_id) then
    select * into u from public.brok_users where id = p_user_id;
    if not found then raise exception 'user not found'; end if;
    return u;
  end if;

  select * into u from public.brok_users where id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;

  insert into public.stripe_payments (stripe_session_id, user_id, pock_amount, amount_cents)
    values (p_stripe_session_id, p_user_id, p_amount, p_amount_cents);

  update public.brok_users set
    pock_balance = pock_balance + p_amount,
    updated_at = now()
  where id = p_user_id returning * into u;

  insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
    values (p_user_id, p_amount, u.pock_balance, 'stripe_credit', p_note);

  return u;
end; $$;

grant execute on function public.credit_pock_from_stripe(uuid, integer, text, integer, text) to service_role;-- Tiered USD subscriptions with monthly included $POCK pools + per-block metering

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
grant execute on function public.cancel_stripe_subscription(uuid, text, text) to service_role;-- POCK OG grandfather: 5550 held, wallet verify or discretionary VIP codes

alter table public.brok_users drop constraint if exists brok_users_subscription_tier_check;
alter table public.brok_users add constraint brok_users_subscription_tier_check
  check (subscription_tier is null or subscription_tier in (
    'essential', 'premium', 'bio_age', 'pock_og'
  ));

alter table public.brok_users
  add column if not exists pock_og_wallet text,
  add column if not exists pock_og_verified_at timestamptz,
  add column if not exists pock_og_source text
    check (pock_og_source is null or pock_og_source in ('wallet', 'vip_code')),
  add column if not exists pock_og_pool_reset_at timestamptz;

create table if not exists public.pock_og_wallets (
  wallet_address    text primary key,
  user_id           uuid not null unique references public.brok_users(id) on delete cascade,
  balance_snapshot  bigint not null,
  verified_at       timestamptz not null default now()
);

create table if not exists public.og_redeem_codes (
  code              text primary key,
  note              text,
  max_uses          integer not null default 1 check (max_uses > 0),
  use_count         integer not null default 0 check (use_count >= 0),
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now()
);

create table if not exists public.og_redeem_uses (
  id                uuid primary key default gen_random_uuid(),
  code              text not null references public.og_redeem_codes(code),
  user_id           uuid not null unique references public.brok_users(id) on delete cascade,
  redeemed_at       timestamptz not null default now()
);

create index if not exists og_redeem_uses_code_idx on public.og_redeem_uses (code);

alter table public.pock_og_wallets enable row level security;
alter table public.og_redeem_codes enable row level security;
alter table public.og_redeem_uses enable row level security;

drop policy if exists "og wallets read own" on public.pock_og_wallets;
create policy "og wallets read own" on public.pock_og_wallets
  for select using (auth.uid() = user_id);

drop policy if exists "og redeem uses read own" on public.og_redeem_uses;
create policy "og redeem uses read own" on public.og_redeem_uses
  for select using (auth.uid() = user_id);

-- Refresh OG monthly calc pool (10/mo)
create or replace function public._refresh_pock_og_pool(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare u public.brok_users;
  month_start timestamptz := date_trunc('month', now());
begin
  select * into u from public.brok_users where id = p_user_id;
  if not found or u.subscription_tier <> 'pock_og' then return; end if;
  if u.pock_og_pool_reset_at is null or u.pock_og_pool_reset_at < month_start then
    update public.brok_users set
      included_pock_allowance = 10,
      included_pock_remaining = 10,
      pock_og_pool_reset_at = now(),
      updated_at = now()
    where id = p_user_id;
  end if;
end; $$;

-- Included pool: paid subs + POCK OG
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

  perform public._refresh_pock_og_pool(p_user_id);

  select * into u from public.brok_users where id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;

  remaining := p_amount;

  if u.included_pock_remaining > 0 and (
    (u.subscription_active and u.subscription_tier in ('essential', 'premium', 'bio_age'))
    or u.subscription_tier = 'pock_og'
  ) then
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
    'subscribed', u.subscription_active or u.subscription_tier = 'pock_og',
    'tier', u.subscription_tier
  );
end; $$;

create or replace function public.grant_pock_og(
  p_user_id uuid,
  p_source text,
  p_event_id text,
  p_wallet text default null,
  p_balance_snapshot bigint default null,
  p_note text default 'POCK OG grandfather'
)
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare u public.brok_users;
  monthly constant integer := 10;
begin
  if p_source not in ('wallet', 'vip_code') then raise exception 'invalid_source'; end if;
  if p_event_id is null or length(trim(p_event_id)) < 8 then
    raise exception 'event_invalid';
  end if;

  if exists (select 1 from public.stripe_subscription_events where stripe_event_id = p_event_id) then
    select * into u from public.brok_users where id = p_user_id;
    if not found then raise exception 'user not found'; end if;
    return u;
  end if;

  select * into u from public.brok_users where id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;

  if u.subscription_tier = 'pock_og' then return u; end if;

  if p_wallet is not null and exists (
    select 1 from public.pock_og_wallets where wallet_address = p_wallet and user_id <> p_user_id
  ) then
    raise exception 'wallet_already_claimed';
  end if;

  insert into public.stripe_subscription_events (stripe_event_id, user_id, tier, event_kind)
    values (p_event_id, p_user_id, 'pock_og', 'checkout');

  update public.brok_users set
    subscription_tier = 'pock_og',
    subscription_active = false,
    subscription_recurring = false,
    pock_og_wallet = p_wallet,
    pock_og_verified_at = now(),
    pock_og_source = p_source,
    included_pock_allowance = monthly,
    included_pock_remaining = monthly,
    pock_og_pool_reset_at = now(),
    updated_at = now()
  where id = p_user_id returning * into u;

  if p_wallet is not null then
    insert into public.pock_og_wallets (wallet_address, user_id, balance_snapshot)
      values (p_wallet, p_user_id, coalesce(p_balance_snapshot, 0))
    on conflict (wallet_address) do nothing;
  end if;

  insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
    values (p_user_id, monthly, u.pock_balance, 'subscription_credit', p_note);

  return u;
end; $$;

create or replace function public.redeem_og_vip_code(p_code text)
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  row_code public.og_redeem_codes;
  norm text;
  event_id text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  norm := upper(trim(p_code));
  if length(norm) < 6 then raise exception 'code_invalid'; end if;

  select * into row_code from public.og_redeem_codes where code = norm for update;
  if not found then raise exception 'code_invalid'; end if;
  if row_code.expires_at < now() then raise exception 'code_expired'; end if;
  if row_code.use_count >= row_code.max_uses then raise exception 'code_exhausted'; end if;

  if exists (select 1 from public.og_redeem_uses where user_id = uid) then
    raise exception 'og_already_claimed';
  end if;

  update public.og_redeem_codes set use_count = use_count + 1 where code = norm;
  insert into public.og_redeem_uses (code, user_id) values (norm, uid);

  event_id := 'ogvip_' || norm || '_' || uid::text;
  return public.grant_pock_og(uid, 'vip_code', event_id, null, null,
    'POCK OG · VIP code ' || norm);
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
      when subscription_tier = 'pock_og' then 'POCK OG'
      when subscription_tier = 'bio_age' then 'Bio-Age'
      when subscription_active then 'Pro'
      else 'Trial'
    end as tier,
    updated_at
  from public.brok_users
  order by calc_count desc, pock_balance desc
  limit 50;

grant execute on function public.redeem_og_vip_code(text) to authenticated;
grant execute on function public.grant_pock_og(uuid, text, text, text, bigint, text) to service_role;-- Corp-wallet-sourced grants: OG giveaways, trial credits, and included subscription
-- pools debit Neobanx float — they do NOT mint new $POCK supply.
-- On-chain source: GDbcxPANGSaQbcu1xSufhM5rzsVkwQPSrLnLHfyjeJq7

create table if not exists public.corp_pock_wallet (
  id                text primary key default 'neobanx',
  wallet_address    text not null,
  float_remaining   bigint not null default 0 check (float_remaining >= 0),
  float_allocated   bigint not null default 0 check (float_allocated >= 0),
  updated_at        timestamptz not null default now()
);

insert into public.corp_pock_wallet (id, wallet_address, float_remaining, float_allocated)
values ('neobanx', 'GDbcxPANGSaQbcu1xSufhM5rzsVkwQPSrLnLHfyjeJq7', 0, 0)
on conflict (id) do update set wallet_address = excluded.wallet_address;

create table if not exists public.corp_pock_ledger (
  id              uuid primary key default gen_random_uuid(),
  amount          integer not null,
  float_after     bigint not null,
  kind            text not null check (kind in (
    'trial_grant', 'og_pool_grant', 'subscription_pool_grant',
    'admin_seed', 'admin_adjust'
  )),
  user_id         uuid references public.brok_users(id) on delete set null,
  note            text,
  created_at      timestamptz not null default now()
);

create index if not exists corp_pock_ledger_created_idx
  on public.corp_pock_ledger (created_at desc);

alter table public.corp_pock_wallet enable row level security;
alter table public.corp_pock_ledger enable row level security;

-- Reserve corp float for a user-facing grant (negative amount in ledger).
create or replace function public._allocate_corp_pock(
  p_amount integer,
  p_kind text,
  p_user_id uuid default null,
  p_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare w public.corp_pock_wallet;
  new_float bigint;
begin
  if p_amount < 1 then raise exception 'amount_invalid'; end if;
  if p_kind not in ('trial_grant', 'og_pool_grant', 'subscription_pool_grant') then
    raise exception 'invalid_corp_kind';
  end if;

  select * into w from public.corp_pock_wallet where id = 'neobanx' for update;
  if not found then raise exception 'corp_wallet_not_configured'; end if;
  if w.float_remaining < p_amount then raise exception 'corp_float_insufficient'; end if;

  new_float := w.float_remaining - p_amount;

  update public.corp_pock_wallet set
    float_remaining = new_float,
    float_allocated = float_allocated + p_amount,
    updated_at = now()
  where id = 'neobanx';

  insert into public.corp_pock_ledger (amount, float_after, kind, user_id, note)
    values (-p_amount, new_float, p_kind, p_user_id, p_note);
end; $$;

-- Ops: seed float after reconciling on-chain corp wallet balance (service_role only).
create or replace function public.seed_corp_pock_float(
  p_amount bigint,
  p_note text default 'Corp float seed'
)
returns public.corp_pock_wallet language plpgsql security definer set search_path = public as $$
declare w public.corp_pock_wallet;
begin
  if p_amount < 1 then raise exception 'amount_invalid'; end if;

  select * into w from public.corp_pock_wallet where id = 'neobanx' for update;
  if not found then raise exception 'corp_wallet_not_configured'; end if;

  update public.corp_pock_wallet set
    float_remaining = float_remaining + p_amount,
    updated_at = now()
  where id = 'neobanx' returning * into w;

  insert into public.corp_pock_ledger (amount, float_after, kind, note)
    values (p_amount::integer, w.float_remaining, 'admin_seed', p_note);

  return w;
end; $$;

create or replace function public.bootstrap_user()
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); u public.brok_users;
  trial constant integer := 100;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.brok_users (id) values (uid) on conflict (id) do nothing;
  select * into u from public.brok_users where id = uid;
  if not u.trial_credited then
    perform public._allocate_corp_pock(
      trial, 'trial_grant', uid,
      'Welcome trial · corp wallet ' || (select wallet_address from public.corp_pock_wallet where id = 'neobanx')
    );
    update public.brok_users set pock_balance = pock_balance + trial,
      trial_credited = true, updated_at = now() where id = uid returning * into u;
    insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
      values (uid, trial, u.pock_balance, 'trial_credit', 'Welcome trial (Neobanx corp-funded)');
  end if;
  return u;
end; $$;

create or replace function public._refresh_pock_og_pool(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare u public.brok_users;
  month_start timestamptz := date_trunc('month', now());
  monthly constant integer := 10;
begin
  select * into u from public.brok_users where id = p_user_id;
  if not found or u.subscription_tier <> 'pock_og' then return; end if;
  if u.pock_og_pool_reset_at is null or u.pock_og_pool_reset_at < month_start then
    perform public._allocate_corp_pock(
      monthly, 'og_pool_grant', p_user_id,
      'POCK OG monthly pool refresh'
    );
    update public.brok_users set
      included_pock_allowance = monthly,
      included_pock_remaining = monthly,
      pock_og_pool_reset_at = now(),
      updated_at = now()
    where id = p_user_id returning * into u;
    insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
      values (p_user_id, monthly, u.pock_balance, 'subscription_credit',
        'POCK OG monthly pool (Neobanx corp-funded)');
  end if;
end; $$;

create or replace function public.grant_pock_og(
  p_user_id uuid,
  p_source text,
  p_event_id text,
  p_wallet text default null,
  p_balance_snapshot bigint default null,
  p_note text default 'POCK OG grandfather'
)
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare u public.brok_users;
  monthly constant integer := 10;
begin
  if p_source not in ('wallet', 'vip_code') then raise exception 'invalid_source'; end if;
  if p_event_id is null or length(trim(p_event_id)) < 8 then
    raise exception 'event_invalid';
  end if;

  if exists (select 1 from public.stripe_subscription_events where stripe_event_id = p_event_id) then
    select * into u from public.brok_users where id = p_user_id;
    if not found then raise exception 'user not found'; end if;
    return u;
  end if;

  select * into u from public.brok_users where id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;

  if u.subscription_tier = 'pock_og' then return u; end if;

  if p_wallet is not null and exists (
    select 1 from public.pock_og_wallets where wallet_address = p_wallet and user_id <> p_user_id
  ) then
    raise exception 'wallet_already_claimed';
  end if;

  perform public._allocate_corp_pock(
    monthly, 'og_pool_grant', p_user_id,
    p_note || ' · initial pool'
  );

  insert into public.stripe_subscription_events (stripe_event_id, user_id, tier, event_kind)
    values (p_event_id, p_user_id, 'pock_og', 'checkout');

  update public.brok_users set
    subscription_tier = 'pock_og',
    subscription_active = false,
    subscription_recurring = false,
    pock_og_wallet = p_wallet,
    pock_og_verified_at = now(),
    pock_og_source = p_source,
    included_pock_allowance = monthly,
    included_pock_remaining = monthly,
    pock_og_pool_reset_at = now(),
    updated_at = now()
  where id = p_user_id returning * into u;

  if p_wallet is not null then
    insert into public.pock_og_wallets (wallet_address, user_id, balance_snapshot)
      values (p_wallet, p_user_id, coalesce(p_balance_snapshot, 0))
    on conflict (wallet_address) do nothing;
  end if;

  insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
    values (p_user_id, monthly, u.pock_balance, 'subscription_credit',
      p_note || ' (Neobanx corp-funded)');

  return u;
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

  perform public._allocate_corp_pock(
    p_included_allowance, 'subscription_pool_grant', p_user_id,
    p_note || ' · ' || p_included_allowance || ' $POCK included pool'
  );

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
      p_note || ' · ' || p_included_allowance || ' $POCK included pool (Neobanx corp-funded)');

  return u;
end; $$;

grant execute on function public.seed_corp_pock_float(bigint, text) to service_role;