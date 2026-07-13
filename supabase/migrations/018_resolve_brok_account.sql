-- Resolve brok_users.id by last-4 hex suffix (device linking fallback)

create or replace function public.resolve_brok_user_by_suffix(p_suffix text)
returns uuid language sql stable security definer set search_path = public as $$
  select id
  from public.brok_users
  where right(replace(id::text, '-', ''), 4) = lower(trim(p_suffix))
  limit 1;
$$;

comment on function public.resolve_brok_user_by_suffix is
  'Lookup brok_users by last 4 hex chars of UUID (used when linking devices)';