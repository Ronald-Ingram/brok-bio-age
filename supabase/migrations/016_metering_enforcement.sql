-- Server-side metering for BROK chat / voice / avatar (service role on API routes).
-- Rates aligned with web/lib/subscriptionConfig.ts METER_RATES.

create or replace function public.debit_metered_turn(
  p_voice_blocks integer default 0,
  p_avatar_blocks integer default 0,
  p_grok boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  base constant integer := 2;
  voice_add constant integer := 4;
  avatar_add constant integer := 10;
  total integer;
  result jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_voice_blocks < 0 or p_avatar_blocks < 0 then raise exception 'amount_invalid'; end if;

  total := base + (p_voice_blocks * voice_add) + (p_avatar_blocks * avatar_add);
  if p_grok then
    total := ceil(total * 1.3);
  end if;

  result := public._debit_pock_internal(
    uid, total, 'meter_debit',
    'Agent turn · voice×' || p_voice_blocks || ' avatar×' || p_avatar_blocks
      || case when p_grok then ' · Grok' else '' end
  );

  return result || jsonb_build_object('meter_cost', total);
end; $$;

create or replace function public.debit_metered_turn_for_user(
  p_user_id uuid,
  p_voice_blocks integer default 0,
  p_avatar_blocks integer default 0,
  p_grok boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  base constant integer := 2;
  voice_add constant integer := 4;
  avatar_add constant integer := 10;
  total integer;
  result jsonb;
begin
  if p_user_id is null then raise exception 'user_id_required'; end if;
  if p_voice_blocks < 0 or p_avatar_blocks < 0 then raise exception 'amount_invalid'; end if;

  total := base + (p_voice_blocks * voice_add) + (p_avatar_blocks * avatar_add);
  if p_grok then
    total := ceil(total * 1.3);
  end if;

  result := public._debit_pock_internal(
    p_user_id, total, 'meter_debit',
    'Agent turn · voice×' || p_voice_blocks || ' avatar×' || p_avatar_blocks
      || case when p_grok then ' · Grok' else '' end
  );

  return result || jsonb_build_object('meter_cost', total);
end; $$;

create or replace function public.debit_pock_for_user(
  p_user_id uuid,
  p_amount integer,
  p_kind text,
  p_note text
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_user_id is null then raise exception 'user_id_required'; end if;
  if p_amount < 1 then raise exception 'amount_invalid'; end if;
  return public._debit_pock_internal(p_user_id, p_amount, p_kind, p_note);
end; $$;

grant execute on function public.debit_metered_turn_for_user(uuid, integer, integer, boolean) to service_role;
grant execute on function public.debit_pock_for_user(uuid, integer, text, text) to service_role;