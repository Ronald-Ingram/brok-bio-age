-- On-chain custody release settlement queue + completion RPCs

create table if not exists public.custody_release_queue (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.brok_users(id) on delete cascade,
  ledger_id           uuid references public.pock_ledger(id) on delete set null,
  dest_wallet         text not null,
  amount_pock         integer not null check (amount_pock > 0),
  status              text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  solana_tx_signature text,
  error_message       text,
  attempts            integer not null default 0,
  created_at          timestamptz not null default now(),
  settled_at          timestamptz
);

create index if not exists custody_release_queue_pending_idx
  on public.custody_release_queue (created_at asc)
  where status in ('pending', 'failed');

alter table public.custody_release_queue enable row level security;

-- Replace release RPC: enqueue + link ledger row
create or replace function public.request_custody_release()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  u public.brok_users;
  release_amount integer;
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
    'On-chain release of ' || release_amount || ' $POCK to '
      || left(u.solana_wallet_address, 8) || '…',
    'on_chain'
  ) returning id into ledger_id;

  insert into public.custody_release_queue (
    user_id, ledger_id, dest_wallet, amount_pock, status
  ) values (
    uid, ledger_id, u.solana_wallet_address, release_amount, 'pending'
  ) returning id into queue_id;

  return jsonb_build_object(
    'released', release_amount,
    'wallet', u.solana_wallet_address,
    'on_chain_balance', u.on_chain_pock_balance,
    'release_id', queue_id,
    'status', 'pending'
  );
end; $$;

-- Mark release sent after SPL transfer confirms
create or replace function public.complete_custody_release(
  p_queue_id uuid,
  p_tx_signature text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.custody_release_queue;
begin
  select * into q from public.custody_release_queue where id = p_queue_id for update;
  if not found then raise exception 'queue_not_found'; end if;
  if q.status = 'sent' then
    return jsonb_build_object('ok', true, 'already_sent', true, 'tx', q.solana_tx_signature);
  end if;

  update public.custody_release_queue set
    status = 'sent',
    solana_tx_signature = p_tx_signature,
    settled_at = now(),
    error_message = null
  where id = p_queue_id;

  if q.ledger_id is not null then
    update public.pock_ledger set
      solana_tx_signature = p_tx_signature,
      note = note || ' · settled on-chain'
    where id = q.ledger_id;
  end if;

  update public.brok_users set
    on_chain_pock_balance = greatest(0, on_chain_pock_balance - q.amount_pock),
    updated_at = now()
  where id = q.user_id;

  return jsonb_build_object('ok', true, 'tx', p_tx_signature, 'amount', q.amount_pock);
end; $$;

-- Restore reserved balance if SPL transfer fails
create or replace function public.fail_custody_release(
  p_queue_id uuid,
  p_error text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.custody_release_queue;
begin
  select * into q from public.custody_release_queue where id = p_queue_id for update;
  if not found then raise exception 'queue_not_found'; end if;
  if q.status = 'sent' then raise exception 'already_sent'; end if;

  update public.custody_release_queue set
    status = 'failed',
    error_message = left(p_error, 500),
    attempts = attempts + 1
  where id = p_queue_id;

  update public.brok_users set
    pock_balance = pock_balance + q.amount_pock,
    on_chain_pock_balance = greatest(0, on_chain_pock_balance - q.amount_pock),
    updated_at = now()
  where id = q.user_id;

  if q.ledger_id is not null then
    update public.pock_ledger set
      note = note || ' · settlement failed — restored to reserved'
    where id = q.ledger_id;
  end if;

  return jsonb_build_object('ok', true, 'restored', q.amount_pock);
end; $$;

-- Re-queue a failed release after fixing infra (re-reserves user balance)
create or replace function public.reprepare_failed_release(p_queue_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.custody_release_queue;
  u public.brok_users;
begin
  select * into q from public.custody_release_queue where id = p_queue_id for update;
  if not found then raise exception 'queue_not_found'; end if;
  if q.status <> 'failed' then
    return jsonb_build_object('ok', false, 'reason', 'not_failed');
  end if;

  select * into u from public.brok_users where id = q.user_id for update;
  if u.pock_balance < q.amount_pock then
    raise exception 'insufficient_reserved_for_retry';
  end if;

  update public.brok_users set
    pock_balance = pock_balance - q.amount_pock,
    on_chain_pock_balance = on_chain_pock_balance + q.amount_pock,
    updated_at = now()
  where id = q.user_id;

  update public.custody_release_queue set
    status = 'pending',
    error_message = null
  where id = p_queue_id;

  return jsonb_build_object('ok', true, 'amount', q.amount_pock);
end; $$;

grant execute on function public.complete_custody_release(uuid, text) to service_role;
grant execute on function public.fail_custody_release(uuid, text) to service_role;
grant execute on function public.reprepare_failed_release(uuid) to service_role;

comment on table public.custody_release_queue is
  'Pending SPL transfers from corp wallet to user Solana ATAs';

-- Backfill queue rows for legacy releases (pre-worker)
insert into public.custody_release_queue (
  user_id, ledger_id, dest_wallet, amount_pock, status
)
select
  l.user_id,
  l.id,
  u.solana_wallet_address,
  abs(l.amount),
  'pending'
from public.pock_ledger l
join public.brok_users u on u.id = l.user_id
where l.kind = 'custody_release'
  and l.solana_tx_signature is null
  and u.solana_wallet_address is not null
  and not exists (
    select 1 from public.custody_release_queue q where q.ledger_id = l.id
  );