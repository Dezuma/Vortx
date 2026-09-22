-- Retention helpers (audit + score history only; never mass-delete events/raw).

create or replace function public.prune_query_audit_events(retention_days integer default 180)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if retention_days is null or retention_days < 30 then
    retention_days := 30;
  end if;
  delete from public.query_audit_events
  where created_at < now() - make_interval(days => retention_days);
  get diagnostics deleted_count = row_count;
  return jsonb_build_object('table', 'query_audit_events', 'deleted', deleted_count, 'retention_days', retention_days);
end;
$$;

create or replace function public.prune_friction_score_history(retention_days integer default 365)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if retention_days is null or retention_days < 30 then
    retention_days := 30;
  end if;
  delete from public.friction_score_history
  where recorded_at < now() - make_interval(days => retention_days);
  get diagnostics deleted_count = row_count;
  return jsonb_build_object('table', 'friction_score_history', 'deleted', deleted_count, 'retention_days', retention_days);
end;
$$;

create or replace function public.run_data_retention()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'ok', true,
    'audit', public.prune_query_audit_events(180),
    'score_history', public.prune_friction_score_history(365),
    'ran_at', now()
  );
end;
$$;

revoke all on function public.prune_query_audit_events(integer) from public, anon, authenticated;
revoke all on function public.prune_friction_score_history(integer) from public, anon, authenticated;
revoke all on function public.run_data_retention() from public, anon, authenticated;
grant execute on function public.prune_query_audit_events(integer) to service_role;
grant execute on function public.prune_friction_score_history(integer) to service_role;
grant execute on function public.run_data_retention() to service_role;
