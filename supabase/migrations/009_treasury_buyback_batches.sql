-- Configurable treasury buyback batching + execution audit trail.

create table if not exists public.treasury_buyback_config (
  id                        text primary key default 'default',
  batch_threshold_usd_cents integer not null default 10000
    check (batch_threshold_usd_cents between 1000 and 10000000),
  auto_execute_enabled      boolean not null default true,
  slippage_bps              integer not null default 100
    check (slippage_bps between 10 and 2000),
  input_asset               text not null default 'usdc'
    check (input_asset in ('usdc', 'sol')),
  updated_at                timestamptz not null default now(),
  updated_by                text
);

insert into public.treasury_buyback_config (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.treasury_buyback_batches (
  id                      uuid primary key default gen_random_uuid(),
  accrual_ids             uuid[] not null default '{}',
  total_buyback_usd_cents integer not null check (total_buyback_usd_cents > 0),
  input_asset             text not null default 'usdc',
  input_amount_raw        bigint,
  pock_received_ui        numeric(24, 6),
  status                  text not null default 'pending' check (status in (
    'pending', 'executing', 'executed', 'failed'
  )),
  solana_tx_signature     text,
  jupiter_quote_id        text,
  error_message           text,
  created_at              timestamptz not null default now(),
  executed_at             timestamptz
);

create index if not exists treasury_buyback_batches_status_idx
  on public.treasury_buyback_batches (status, created_at desc);

alter table public.treasury_buyback_config enable row level security;
alter table public.treasury_buyback_batches enable row level security;

-- Link accruals to batches
alter table public.treasury_buyback_accruals
  add column if not exists batch_id uuid references public.treasury_buyback_batches(id) on delete set null;

create or replace function public.get_treasury_buyback_config()
returns public.treasury_buyback_config language sql security definer set search_path = public as $$
  select * from public.treasury_buyback_config where id = 'default';
$$;

create or replace function public.update_treasury_buyback_config(
  p_batch_threshold_usd_cents integer,
  p_auto_execute_enabled boolean,
  p_slippage_bps integer,
  p_input_asset text,
  p_updated_by text default null
)
returns public.treasury_buyback_config language plpgsql security definer set search_path = public as $$
declare cfg public.treasury_buyback_config;
begin
  if p_batch_threshold_usd_cents < 1000 or p_batch_threshold_usd_cents > 10000000 then
    raise exception 'threshold_out_of_range';
  end if;
  if p_slippage_bps < 10 or p_slippage_bps > 2000 then
    raise exception 'slippage_out_of_range';
  end if;
  if p_input_asset not in ('usdc', 'sol') then
    raise exception 'invalid_input_asset';
  end if;

  update public.treasury_buyback_config set
    batch_threshold_usd_cents = p_batch_threshold_usd_cents,
    auto_execute_enabled = p_auto_execute_enabled,
    slippage_bps = p_slippage_bps,
    input_asset = p_input_asset,
    updated_at = now(),
    updated_by = p_updated_by
  where id = 'default'
  returning * into cfg;

  return cfg;
end; $$;

create or replace function public.create_treasury_buyback_batch(
  p_accrual_ids uuid[],
  p_total_buyback_usd_cents integer,
  p_input_asset text default 'usdc'
)
returns public.treasury_buyback_batches language plpgsql security definer set search_path = public as $$
declare b public.treasury_buyback_batches;
  aid uuid;
begin
  if p_accrual_ids is null or array_length(p_accrual_ids, 1) < 1 then
    raise exception 'no_accruals';
  end if;
  if p_total_buyback_usd_cents < 1 then
    raise exception 'amount_invalid';
  end if;

  insert into public.treasury_buyback_batches (
    accrual_ids, total_buyback_usd_cents, input_asset, status
  ) values (
    p_accrual_ids, p_total_buyback_usd_cents, coalesce(p_input_asset, 'usdc'), 'executing'
  ) returning * into b;

  foreach aid in array p_accrual_ids loop
    update public.treasury_buyback_accruals set
      status = 'queued',
      batch_id = b.id
    where id = aid and status = 'accrued';
    if not found then
      raise exception 'accrual_not_available';
    end if;
  end loop;

  return b;
end; $$;

create or replace function public.complete_treasury_buyback_batch(
  p_batch_id uuid,
  p_status text,
  p_solana_tx_signature text default null,
  p_pock_received_ui numeric default null,
  p_input_amount_raw bigint default null,
  p_jupiter_quote_id text default null,
  p_error_message text default null
)
returns public.treasury_buyback_batches language plpgsql security definer set search_path = public as $$
declare b public.treasury_buyback_batches;
begin
  if p_status not in ('executed', 'failed') then
    raise exception 'invalid_status';
  end if;

  update public.treasury_buyback_batches set
    status = p_status,
    solana_tx_signature = p_solana_tx_signature,
    pock_received_ui = p_pock_received_ui,
    input_amount_raw = p_input_amount_raw,
    jupiter_quote_id = p_jupiter_quote_id,
    error_message = p_error_message,
    executed_at = now()
  where id = p_batch_id
  returning * into b;

  if not found then raise exception 'batch_not_found'; end if;

  if p_status = 'executed' then
    update public.treasury_buyback_accruals set status = 'executed'
    where batch_id = p_batch_id;
  else
    update public.treasury_buyback_accruals set
      status = 'accrued',
      batch_id = null
    where batch_id = p_batch_id;
  end if;

  return b;
end; $$;

grant execute on function public.get_treasury_buyback_config() to service_role;
grant execute on function public.update_treasury_buyback_config(integer, boolean, integer, text, text) to service_role;
grant execute on function public.create_treasury_buyback_batch(uuid[], integer, text) to service_role;
grant execute on function public.complete_treasury_buyback_batch(uuid, text, text, numeric, bigint, text, text) to service_role;