-- POCK OG grandfather: 5550 held, wallet verify or discretionary VIP codes

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
grant execute on function public.grant_pock_og(uuid, text, text, text, bigint, text) to service_role;