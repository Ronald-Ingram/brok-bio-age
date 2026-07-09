-- BROK Bio-Age $POCK system (shared BROK Supabase project)
-- Tables: brok_users, pock_ledger, bioage_history

create table if not exists public.brok_users (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  pock_balance  integer not null default 0 check (pock_balance >= 0),
  trial_credited boolean not null default false,
  subscription_active boolean not null default false,
  subscription_recurring boolean not null default false,
  subscription_started_at timestamptz,
  subscription_renews_at timestamptz,
  calc_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.pock_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.brok_users(id) on delete cascade,
  amount      integer not null,
  balance_after integer not null,
  kind        text not null check (kind in (
    'trial_credit', 'calc_debit', 'subscription_debit', 'premium_spend',
    'transfer_out', 'transfer_in', 'withdrawal', 'gift_sent',
    'gift_received', 'impact_donation', 'admin_adjust'
  )),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists pock_ledger_user_created_idx
  on public.pock_ledger (user_id, created_at desc);

create table if not exists public.bioage_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.brok_users(id) on delete cascade,
  test_date   date not null,
  request     jsonb not null,
  response    jsonb not null,
  saved_at    timestamptz not null default now(),
  unique (user_id, test_date)
);

create or replace view public.leaderboard_stub as
  select
    coalesce(display_name, 'Anonymous') as name,
    calc_count,
    pock_balance,
    case when subscription_active then 'Pro' else 'Trial' end as tier,
    updated_at
  from public.brok_users
  order by calc_count desc, pock_balance desc
  limit 50;

alter table public.brok_users enable row level security;
alter table public.pock_ledger enable row level security;
alter table public.bioage_history enable row level security;

drop policy if exists "users read own" on public.brok_users;
create policy "users read own" on public.brok_users
  for select using (auth.uid() = id);

drop policy if exists "ledger read own" on public.pock_ledger;
create policy "ledger read own" on public.pock_ledger
  for select using (auth.uid() = user_id);

drop policy if exists "history own" on public.bioage_history;
create policy "history own" on public.bioage_history
  for all using (auth.uid() = user_id);

-- RPC: bootstrap trial credit
create or replace function public.bootstrap_user()
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); u public.brok_users;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.brok_users (id) values (uid) on conflict (id) do nothing;
  select * into u from public.brok_users where id = uid;
  if not u.trial_credited then
    update public.brok_users set pock_balance = pock_balance + 100,
      trial_credited = true, updated_at = now() where id = uid returning * into u;
    insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
      values (uid, 100, u.pock_balance, 'trial_credit', 'Welcome trial');
  end if;
  return u;
end; $$;

create or replace function public.debit_for_calc()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); u public.brok_users;
begin
  select * into u from public.brok_users where id = uid for update;
  if not found then raise exception 'user not found'; end if;
  if u.subscription_active then
    update public.brok_users set calc_count = calc_count + 1, updated_at = now() where id = uid;
    return jsonb_build_object('debited', false, 'balance', u.pock_balance, 'subscribed', true);
  end if;
  if u.pock_balance < 1 then raise exception 'insufficient_pock'; end if;
  update public.brok_users set pock_balance = pock_balance - 1,
    calc_count = calc_count + 1, updated_at = now() where id = uid returning * into u;
  insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
    values (uid, -1, u.pock_balance, 'calc_debit', 'Bio-age calculation');
  return jsonb_build_object('debited', true, 'balance', u.pock_balance, 'subscribed', false);
end; $$;

create or replace function public.activate_subscription()
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); u public.brok_users; cost constant integer := 10;
begin
  select * into u from public.brok_users where id = uid for update;
  if not found then raise exception 'user not found'; end if;
  if u.pock_balance < cost then raise exception 'insufficient_pock'; end if;
  update public.brok_users set
    pock_balance = pock_balance - cost,
    subscription_active = true, subscription_recurring = true,
    subscription_started_at = coalesce(subscription_started_at, now()),
    subscription_renews_at = now() + interval '1 month',
    updated_at = now() where id = uid returning * into u;
  insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
    values (uid, -cost, u.pock_balance, 'subscription_debit', 'Unlimited History & Trends');
  return u;
end; $$;

create or replace function public.spend_pock(
  p_amount integer,
  p_kind text,
  p_note text,
  p_activate_subscription boolean default false
)
returns public.brok_users language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); u public.brok_users;
begin
  if p_amount < 1 then raise exception 'amount_invalid'; end if;
  select * into u from public.brok_users where id = uid for update;
  if not found then raise exception 'user not found'; end if;
  if u.pock_balance < p_amount then raise exception 'insufficient_pock'; end if;
  update public.brok_users set
    pock_balance = pock_balance - p_amount,
    updated_at = now(),
    subscription_active = case when p_activate_subscription then true else subscription_active end,
    subscription_recurring = case when p_activate_subscription then true else subscription_recurring end,
    subscription_started_at = case when p_activate_subscription then coalesce(subscription_started_at, now()) else subscription_started_at end,
    subscription_renews_at = case when p_activate_subscription then now() + interval '1 month' else subscription_renews_at end
  where id = uid returning * into u;
  insert into public.pock_ledger (user_id, amount, balance_after, kind, note)
    values (uid, -p_amount, u.pock_balance, p_kind, p_note);
  return u;
end; $$;

grant execute on function public.bootstrap_user() to authenticated;
grant execute on function public.debit_for_calc() to authenticated;
grant execute on function public.activate_subscription() to authenticated;
grant execute on function public.spend_pock(integer, text, text, boolean) to authenticated;

grant select on public.leaderboard_stub to authenticated, anon;