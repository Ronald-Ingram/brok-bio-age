-- Genius Wallet secondary sub-wallets (parent-controlled, e.g. kids' allowances)

create table if not exists public.genius_sub_wallets (
  id                uuid primary key default gen_random_uuid(),
  parent_user_id    uuid not null references public.brok_users(id) on delete cascade,
  nickname          text not null check (char_length(trim(nickname)) between 1 and 40),
  note              text,
  pock_balance      integer not null default 0 check (pock_balance >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (parent_user_id, nickname)
);

create index if not exists genius_sub_wallets_parent_idx
  on public.genius_sub_wallets (parent_user_id, created_at desc);

create table if not exists public.genius_sub_wallet_ledger (
  id              uuid primary key default gen_random_uuid(),
  sub_wallet_id   uuid not null references public.genius_sub_wallets(id) on delete cascade,
  parent_user_id  uuid not null references public.brok_users(id) on delete cascade,
  amount          integer not null,
  balance_after   integer not null,
  kind            text not null check (kind in ('fund_in', 'fund_out', 'reclaim_out', 'reclaim_in', 'spend')),
  note            text,
  created_at      timestamptz not null default now()
);

create index if not exists genius_sub_wallet_ledger_sub_idx
  on public.genius_sub_wallet_ledger (sub_wallet_id, created_at desc);

alter table public.genius_sub_wallets enable row level security;
alter table public.genius_sub_wallet_ledger enable row level security;

create policy genius_sub_wallets_parent_select on public.genius_sub_wallets
  for select using (parent_user_id = auth.uid());

create policy genius_sub_wallet_ledger_parent_select on public.genius_sub_wallet_ledger
  for select using (parent_user_id = auth.uid());

-- Create a named sub-wallet under the signed-in parent account
create or replace function public.create_genius_sub_wallet(
  p_nickname text,
  p_note text default null
)
returns public.genius_sub_wallets language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  nick text := trim(p_nickname);
  w public.genius_sub_wallets;
  cnt integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if nick is null or char_length(nick) < 1 or char_length(nick) > 40 then
    raise exception 'nickname_invalid';
  end if;

  select count(*) into cnt from public.genius_sub_wallets where parent_user_id = uid;
  if cnt >= 20 then raise exception 'sub_wallet_limit'; end if;

  insert into public.genius_sub_wallets (parent_user_id, nickname, note)
    values (uid, nick, nullif(trim(p_note), ''))
  returning * into w;

  return w;
exception
  when unique_violation then raise exception 'nickname_taken';
end; $$;

-- Move $POCK from parent Genius Wallet → sub-wallet (parent-controlled)
create or replace function public.fund_genius_sub_wallet(
  p_sub_wallet_id uuid,
  p_amount integer,
  p_note text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  w public.genius_sub_wallets;
  u public.brok_users;
  new_parent_bal integer;
  new_sub_bal integer;
  lbl text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_amount < 1 then raise exception 'amount_invalid'; end if;

  select * into w from public.genius_sub_wallets
  where id = p_sub_wallet_id and parent_user_id = uid for update;
  if not found then raise exception 'sub_wallet_not_found'; end if;

  select * into u from public.brok_users where id = uid for update;
  if not found then raise exception 'user not found'; end if;
  if u.pock_balance < p_amount then raise exception 'insufficient_balance'; end if;

  lbl := w.nickname;
  new_parent_bal := u.pock_balance - p_amount;
  new_sub_bal := w.pock_balance + p_amount;

  update public.brok_users set
    pock_balance = new_parent_bal,
    updated_at = now()
  where id = uid;

  update public.genius_sub_wallets set
    pock_balance = new_sub_bal,
    updated_at = now()
  where id = w.id;

  insert into public.pock_ledger (user_id, amount, balance_after, kind, note, custody_state)
    values (
      uid,
      -p_amount,
      new_parent_bal,
      'transfer_out',
      coalesce(nullif(trim(p_note), ''), 'Allocated to sub-wallet · ' || lbl),
      'reserved'
    );

  insert into public.genius_sub_wallet_ledger (
    sub_wallet_id, parent_user_id, amount, balance_after, kind, note
  ) values (
    w.id,
    uid,
    p_amount,
    new_sub_bal,
    'fund_in',
    coalesce(nullif(trim(p_note), ''), 'Funded from parent Genius Wallet')
  );

  return jsonb_build_object(
    'sub_wallet_id', w.id,
    'nickname', lbl,
    'sub_balance', new_sub_bal,
    'parent_balance', new_parent_bal,
    'amount', p_amount
  );
end; $$;

-- Reclaim $POCK from sub-wallet back to parent
create or replace function public.reclaim_genius_sub_wallet(
  p_sub_wallet_id uuid,
  p_amount integer,
  p_note text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  w public.genius_sub_wallets;
  u public.brok_users;
  new_parent_bal integer;
  new_sub_bal integer;
  lbl text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_amount < 1 then raise exception 'amount_invalid'; end if;

  select * into w from public.genius_sub_wallets
  where id = p_sub_wallet_id and parent_user_id = uid for update;
  if not found then raise exception 'sub_wallet_not_found'; end if;
  if w.pock_balance < p_amount then raise exception 'insufficient_sub_balance'; end if;

  select * into u from public.brok_users where id = uid for update;
  if not found then raise exception 'user not found'; end if;

  lbl := w.nickname;
  new_parent_bal := u.pock_balance + p_amount;
  new_sub_bal := w.pock_balance - p_amount;

  update public.brok_users set
    pock_balance = new_parent_bal,
    updated_at = now()
  where id = uid;

  update public.genius_sub_wallets set
    pock_balance = new_sub_bal,
    updated_at = now()
  where id = w.id;

  insert into public.pock_ledger (user_id, amount, balance_after, kind, note, custody_state)
    values (
      uid,
      p_amount,
      new_parent_bal,
      'transfer_in',
      coalesce(nullif(trim(p_note), ''), 'Reclaimed from sub-wallet · ' || lbl),
      'reserved'
    );

  insert into public.genius_sub_wallet_ledger (
    sub_wallet_id, parent_user_id, amount, balance_after, kind, note
  ) values (
    w.id,
    uid,
    -p_amount,
    new_sub_bal,
    'reclaim_out',
    coalesce(nullif(trim(p_note), ''), 'Returned to parent Genius Wallet')
  );

  return jsonb_build_object(
    'sub_wallet_id', w.id,
    'nickname', lbl,
    'sub_balance', new_sub_bal,
    'parent_balance', new_parent_bal,
    'amount', p_amount
  );
end; $$;

grant execute on function public.create_genius_sub_wallet(text, text) to authenticated;
grant execute on function public.fund_genius_sub_wallet(uuid, integer, text) to authenticated;
grant execute on function public.reclaim_genius_sub_wallet(uuid, integer, text) to authenticated;