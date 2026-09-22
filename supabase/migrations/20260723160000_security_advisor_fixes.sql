-- Clear Supabase Security Advisor findings introduced/flagged after DE cutover.
-- OWASP: A01 Broken Access Control, A05 Security Misconfiguration.

-- 1) friction_score_history: enable RLS, deny client roles (service_role bypasses RLS).
alter table public.friction_score_history enable row level security;
revoke all on table public.friction_score_history from anon, authenticated;
grant all on table public.friction_score_history to service_role;

drop policy if exists friction_score_history_deny_anon on public.friction_score_history;
create policy friction_score_history_deny_anon
  on public.friction_score_history
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists friction_score_history_deny_authenticated on public.friction_score_history;
create policy friction_score_history_deny_authenticated
  on public.friction_score_history
  for all
  to authenticated
  using (false)
  with check (false);

-- 2) case_stories: RLS was on with zero policies (secure deny-by-default, but advisor flags it).
--    Keep service-role-only access; add explicit deny policies for client roles.
revoke all on table public.case_stories from anon, authenticated;
grant all on table public.case_stories to service_role;

drop policy if exists case_stories_deny_anon on public.case_stories;
create policy case_stories_deny_anon
  on public.case_stories
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists case_stories_deny_authenticated on public.case_stories;
create policy case_stories_deny_authenticated
  on public.case_stories
  for all
  to authenticated
  using (false)
  with check (false);

-- 3) entity_aliases: same pattern if policies missing.
alter table public.entity_aliases enable row level security;
revoke all on table public.entity_aliases from anon, authenticated;
grant all on table public.entity_aliases to service_role;

drop policy if exists entity_aliases_deny_anon on public.entity_aliases;
create policy entity_aliases_deny_anon
  on public.entity_aliases
  for all
  to anon
  using (false)
  with check (false);

-- Keep any existing authenticated read policy; do not add a conflicting deny.

-- 4) Pin search_path on helper functions (search-path injection hardening).
create or replace function public.normalize_entity_name(input text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(lower(trim(regexp_replace(coalesce(input, ''), '\s+', ' ', 'g'))), '');
$$;

create or replace function public.json_text_as_int(input text, fallback integer)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  n numeric;
begin
  if input is null or btrim(input) = '' then
    return fallback;
  end if;
  begin
    n := input::numeric;
  exception when others then
    return fallback;
  end;
  if n is null then
    return fallback;
  end if;
  return round(n)::integer;
end;
$$;

revoke all on function public.normalize_entity_name(text) from public, anon, authenticated;
grant execute on function public.normalize_entity_name(text) to service_role;
revoke all on function public.json_text_as_int(text, integer) from public, anon, authenticated;
grant execute on function public.json_text_as_int(text, integer) to service_role;

-- 5) Move pg_trgm out of public when extensions schema exists.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'extensions')
     and exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_trgm' and n.nspname = 'public')
  then
    execute 'alter extension pg_trgm set schema extensions';
  end if;
exception when others then
  raise notice 'pg_trgm schema move skipped: %', SQLERRM;
end;
$$;
