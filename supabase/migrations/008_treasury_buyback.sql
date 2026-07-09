-- Neobanx treasury buyback accruals — 20% of gross service revenue (model B71).
-- Accrues on Stripe payment; on-chain Jupiter execution is a separate worker phase.

create table if not exists public.treasury_buyback_accruals (
  id                  uuid primary key default gen_random_uuid(),
  stripe_event_id     text not null unique,
  stripe_session_id   text,
  stripe_invoice_id   text,
  user_id             uuid references public.brok_users(id) on delete set null,
  product_line        text not null check (product_line in (
    'brok_pock_topup', 'brok_subscription', 'iem', 'inneagram', 'other_neobanx_service'
  )),
  gross_usd_cents     integer not null check (gross_usd_cents > 0),
  buyback_usd_cents   integer not null check (buyback_usd_cents > 0),
  buyback_pct         numeric(5, 4) not null default 0.20,
  status              text not null default 'accrued' check (status in (
    'accrued', 'queued', 'executed', 'failed', 'waived'
  )),
  solana_tx_signature text,
  executed_at         timestamptz,
  note                text,
  created_at          timestamptz not null default now()
);

create index if not exists treasury_buyback_accruals_status_idx
  on public.treasury_buyback_accruals (status, created_at desc);

create index if not exists treasury_buyback_accruals_product_idx
  on public.treasury_buyback_accruals (product_line, created_at desc);

alter table public.treasury_buyback_accruals enable row level security;

create or replace function public.record_treasury_buyback_accrual(
  p_stripe_event_id text,
  p_gross_usd_cents integer,
  p_buyback_usd_cents integer,
  p_product_line text,
  p_user_id uuid default null,
  p_stripe_session_id text default null,
  p_stripe_invoice_id text default null,
  p_note text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare row_id uuid;
begin
  if p_stripe_event_id is null or length(trim(p_stripe_event_id)) < 8 then
    raise exception 'event_invalid';
  end if;
  if p_gross_usd_cents < 1 or p_buyback_usd_cents < 1 then
    raise exception 'amount_invalid';
  end if;
  if p_product_line not in (
    'brok_pock_topup', 'brok_subscription', 'iem', 'inneagram', 'other_neobanx_service'
  ) then
    raise exception 'invalid_product_line';
  end if;

  if exists (
    select 1 from public.treasury_buyback_accruals where stripe_event_id = p_stripe_event_id
  ) then
    return jsonb_build_object('recorded', false, 'buyback_usd_cents', p_buyback_usd_cents);
  end if;

  insert into public.treasury_buyback_accruals (
    stripe_event_id, stripe_session_id, stripe_invoice_id, user_id,
    product_line, gross_usd_cents, buyback_usd_cents, note
  ) values (
    p_stripe_event_id, p_stripe_session_id, p_stripe_invoice_id, p_user_id,
    p_product_line, p_gross_usd_cents, p_buyback_usd_cents, p_note
  ) returning id into row_id;

  return jsonb_build_object(
    'recorded', true,
    'id', row_id,
    'buyback_usd_cents', p_buyback_usd_cents
  );
end; $$;

grant execute on function public.record_treasury_buyback_accrual(
  text, integer, integer, text, uuid, text, text, text
) to service_role;