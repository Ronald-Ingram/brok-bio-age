-- Always leave ≥100 $POCK in Genius Wallet on external send/gift/custody release.
-- Stops trial-only farm siphon (100 trial → cannot transfer/withdraw any).

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
  bal integer;
  min_reserve constant integer := 100;
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

  select pock_balance into bal from public.brok_users where id = uid;
  if not found then raise exception 'user not found'; end if;

  -- External P2P: cannot drain below reserve (locks trial-only 100 fully)
  if p_kind in ('transfer_out', 'gift_sent') then
    if bal - p_amount < min_reserve then
      raise exception 'min_reserve_required';
    end if;
  end if;

  result := public._debit_pock_internal(uid, p_amount, p_kind, p_note);
  select * into u from public.brok_users where id = uid;
  return u;
end;
$$;

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
  min_reserve constant integer := 100;
  max_releasable integer;
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

  max_releasable := greatest(0, u.pock_balance - min_reserve);
  if max_releasable < 1 then
    raise exception 'min_reserve_required';
  end if;

  -- Never default to full balance; caller must pass amount. Cap at max_releasable.
  if p_amount is null then
    raise exception 'amount_required';
  end if;
  release_amount := p_amount;
  if release_amount < 1 then raise exception 'amount_invalid'; end if;
  if release_amount > max_releasable then
    raise exception 'min_reserve_required';
  end if;

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
      || left(dest, 8) || '… (min ' || min_reserve || ' reserved)',
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
    'status', 'pending',
    'reserved_remaining', u.pock_balance
  );
end;
$$;

grant execute on function public.request_custody_release(integer, text) to authenticated;
