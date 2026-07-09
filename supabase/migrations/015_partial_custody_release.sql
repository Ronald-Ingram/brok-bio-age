-- Partial on-chain release + optional destination wallet (linked or external).

drop function if exists public.request_custody_release();

create or replace function public.request_custody_release(
  p_amount integer default null,
  p_dest_wallet text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
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
end; $$;

grant execute on function public.request_custody_release(integer, text) to authenticated;