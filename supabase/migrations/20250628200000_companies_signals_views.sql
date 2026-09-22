-- Read-only views for client queries (no new base tables).
-- `companies` maps to tracked entities; `signals` maps to legal_events.

create or replace view public.companies as
select
  e.id,
  e.canonical_name as name,
  e.entity_type,
  e.jurisdiction,
  e.ticker,
  e.status,
  e.created_at,
  e.updated_at
from public.entities e;

create or replace view public.signals as
select
  le.id,
  le.entity_id as company_id,
  le.source_id,
  le.event_type as record_type,
  le.title,
  le.summary,
  le.jurisdiction,
  le.filing_date,
  le.severity as score,
  le.confidence,
  le.status,
  le.created_at,
  le.updated_at
from public.legal_events le;

-- PostgREST embed: signals.company_id -> companies.id (same UUID as entities.id)
comment on view public.signals is 'Public legal-event signals; company_id references public.companies.id';
comment on view public.companies is 'Public company directory view over public.entities';

grant select on public.companies to anon, authenticated, service_role;
grant select on public.signals to anon, authenticated, service_role;

alter table public.entities enable row level security;
alter table public.legal_events enable row level security;

drop policy if exists companies_public_ticker_read on public.entities;
create policy companies_public_ticker_read
  on public.entities
  for select
  to anon, authenticated
  using (ticker is not null);

drop policy if exists signals_public_ticker_company_read on public.legal_events;
create policy signals_public_ticker_company_read
  on public.legal_events
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.entities e
      where e.id = legal_events.entity_id
        and e.ticker is not null
    )
  );
