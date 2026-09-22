-- Supabase Advisor fixes (2026-07-03):
-- 1. RLS disabled on public.entity_watchlists
-- 2. SECURITY DEFINER views: public.companies, public.signals
--
-- Note: "Leaked Password Protection Disabled" is an Auth setting, not SQL.
-- Enable in Dashboard: Authentication -> Settings -> Password protection
-- (checks passwords against HaveIBeenPwned).

-- 1) entity_watchlists: enable RLS, owner-only access.
--    Server-side access (Cloudflare Functions) uses the service role key and
--    bypasses RLS, so scan-watchlist.js and the customer dashboard keep working.
alter table public.entity_watchlists enable row level security;

drop policy if exists entity_watchlists_owner_select on public.entity_watchlists;
create policy entity_watchlists_owner_select
  on public.entity_watchlists
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists entity_watchlists_owner_insert on public.entity_watchlists;
create policy entity_watchlists_owner_insert
  on public.entity_watchlists
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists entity_watchlists_owner_update on public.entity_watchlists;
create policy entity_watchlists_owner_update
  on public.entity_watchlists
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists entity_watchlists_owner_delete on public.entity_watchlists;
create policy entity_watchlists_owner_delete
  on public.entity_watchlists
  for delete
  to authenticated
  using (user_id = auth.uid());

-- 2) Views: run with the caller's permissions instead of the view owner's.
--    The existing RLS policies on public.entities / public.legal_events
--    (ticker-not-null public read) then apply to anon/authenticated queries,
--    which matches the intended public exposure. service_role bypasses RLS.
alter view public.companies set (security_invoker = true);
alter view public.signals set (security_invoker = true);
