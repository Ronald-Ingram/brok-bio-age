-- Corp-wallet-sourced grants: OG giveaways, trial credits, and included subscription
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