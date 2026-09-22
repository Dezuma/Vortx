-- Audit trail for subscriber/admin API queries.
-- Production schema (verified 2026-06-24): id, subscriber_email, surface, query, result_count, created_at
create table if not exists public.query_audit_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_email text null,
  surface text not null,
  query text not null,
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists query_audit_events_created_at_idx
  on public.query_audit_events (created_at desc);

create index if not exists query_audit_events_query_idx
  on public.query_audit_events (query);

alter table public.query_audit_events enable row level security;
