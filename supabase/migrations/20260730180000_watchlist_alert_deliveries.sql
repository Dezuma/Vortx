-- Deduped delivery log for Watch → email on next trading filing.

create table if not exists public.watchlist_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entity_id uuid not null references public.entities(id) on delete cascade,
  event_id uuid not null references public.legal_events(id) on delete cascade,
  email text,
  plan text,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists watchlist_alert_deliveries_user_created_idx
  on public.watchlist_alert_deliveries (user_id, created_at desc);

create index if not exists watchlist_alert_deliveries_event_idx
  on public.watchlist_alert_deliveries (event_id);

alter table public.watchlist_alert_deliveries enable row level security;

drop policy if exists watchlist_alert_deliveries_owner_select on public.watchlist_alert_deliveries;
create policy watchlist_alert_deliveries_owner_select
  on public.watchlist_alert_deliveries
  for select
  using (user_id = auth.uid());

grant select on table public.watchlist_alert_deliveries to authenticated;
grant all on table public.watchlist_alert_deliveries to service_role;
