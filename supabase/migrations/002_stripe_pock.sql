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

grant execute on function public.credit_pock_from_stripe(uuid, integer, text, integer, text) to service_role;