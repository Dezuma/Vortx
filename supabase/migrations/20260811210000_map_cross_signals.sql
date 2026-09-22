-- Deterministic, timing-only cross-signals for the geographic map.
-- Matches require the same entity UUID or an exact ticker; time proximity alone
-- can never create a row.
create table if not exists public.map_cross_signals (
  id uuid primary key,
  trade_event_id uuid not null references public.legal_events (id) on delete cascade,
  distress_event_id uuid not null references public.legal_events (id) on delete cascade,
  trade_entity_id uuid not null references public.entities (id) on delete cascade,
  distress_entity_id uuid not null references public.entities (id) on delete cascade,
  correlation_key_type text not null check (correlation_key_type in ('entity', 'ticker')),
  ticker text null,
  trade_event_type text not null check (trade_event_type in ('form_4', 'congress_trade')),
  distress_event_type text not null check (
    distress_event_type in (
      'warn_notice',
      'bankruptcy_chapter_11',
      'bankruptcy_chapter_7',
      'bankruptcy_docket',
      'bankruptcy_adversary'
    )
  ),
  trade_date date not null,
  distress_date date not null,
  days_between integer not null check (days_between between -30 and 30),
  longitude double precision not null check (longitude between -180 and 180),
  latitude double precision not null check (latitude between -90 and 90),
  location_confidence text not null check (
    location_confidence in ('facility', 'hq', 'registered_agent')
  ),
  location_precision text not null check (
    location_precision in ('address', 'city', 'county', 'state')
  ),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (trade_event_id, distress_event_id)
);

create index if not exists map_cross_signals_bounds_idx
  on public.map_cross_signals (longitude, latitude);

create index if not exists map_cross_signals_dates_idx
  on public.map_cross_signals (distress_date desc, trade_date desc);

alter table public.map_cross_signals enable row level security;
revoke all on table public.map_cross_signals from anon;
revoke all on table public.map_cross_signals from authenticated;

create or replace function public.refresh_map_cross_signals()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  refreshed_count integer := 0;
begin
  delete from public.map_cross_signals;

  insert into public.map_cross_signals (
    id,
    trade_event_id,
    distress_event_id,
    trade_entity_id,
    distress_entity_id,
    correlation_key_type,
    ticker,
    trade_event_type,
    distress_event_type,
    trade_date,
    distress_date,
    days_between,
    longitude,
    latitude,
    location_confidence,
    location_precision,
    updated_at
  )
  with trade_rows as (
    select
      trade_event.id,
      trade_event.entity_id,
      trade_event.event_type,
      coalesce(trade_event.trade_date, trade_event.filing_date) as event_date,
      upper(
        nullif(
          coalesce(
            trade_location.source_fields ->> 'ticker',
            trade_entity.ticker,
            ''
          ),
          ''
        )
      ) as ticker
    from public.legal_events trade_event
    join public.map_signal_locations trade_location
      on trade_location.event_id = trade_event.id
    join public.entities trade_entity
      on trade_entity.id = trade_event.entity_id
    where
      (
        trade_event.event_type = 'form_4'
        and (
          trade_event.summary ~* 'Transaction code:\s*S(\.|$)'
          or trade_event.title ~* '\m(sale|sold|sell)\M'
        )
      )
      or trade_event.event_type = 'congress_trade'
  ),
  distress_rows as (
    select
      distress_event.id,
      distress_event.entity_id,
      distress_event.event_type,
      distress_event.filing_date as event_date,
      upper(
        nullif(
          coalesce(
            distress_location.source_fields ->> 'ticker',
            distress_entity.ticker,
            ''
          ),
          ''
        )
      ) as ticker,
      distress_location.longitude,
      distress_location.latitude,
      distress_location.geocoding_confidence,
      distress_location.location_precision
    from public.legal_events distress_event
    join public.map_signal_locations distress_location
      on distress_location.event_id = distress_event.id
    join public.entities distress_entity
      on distress_entity.id = distress_event.entity_id
    where distress_event.event_type in (
      'warn_notice',
      'bankruptcy_chapter_11',
      'bankruptcy_chapter_7',
      'bankruptcy_docket',
      'bankruptcy_adversary'
    )
      and distress_location.geocoding_confidence <> 'unresolved'
      and distress_location.longitude is not null
      and distress_location.latitude is not null
  ),
  matched as (
    select
      trade.id as trade_event_id,
      distress.id as distress_event_id,
      trade.entity_id as trade_entity_id,
      distress.entity_id as distress_entity_id,
      case
        when trade.entity_id = distress.entity_id then 'entity'
        else 'ticker'
      end as correlation_key_type,
      coalesce(trade.ticker, distress.ticker) as ticker,
      trade.event_type as trade_event_type,
      distress.event_type as distress_event_type,
      trade.event_date as trade_date,
      distress.event_date as distress_date,
      (distress.event_date - trade.event_date)::integer as days_between,
      distress.longitude,
      distress.latitude,
      distress.geocoding_confidence as location_confidence,
      distress.location_precision
    from trade_rows trade
    join distress_rows distress
      on (
        trade.entity_id = distress.entity_id
        or (
          trade.ticker is not null
          and distress.ticker is not null
          and trade.ticker = distress.ticker
          and trade.ticker ~ '^[A-Z][A-Z0-9.-]{0,7}$'
          and trade.ticker <> 'NONE'
        )
      )
      and abs(distress.event_date - trade.event_date) <= 30
  )
  select
    (
      substr(md5(trade_event_id::text || ':' || distress_event_id::text), 1, 8)
      || '-' || substr(md5(trade_event_id::text || ':' || distress_event_id::text), 9, 4)
      || '-4' || substr(md5(trade_event_id::text || ':' || distress_event_id::text), 14, 3)
      || '-8' || substr(md5(trade_event_id::text || ':' || distress_event_id::text), 18, 3)
      || '-' || substr(md5(trade_event_id::text || ':' || distress_event_id::text), 21, 12)
    )::uuid,
    trade_event_id,
    distress_event_id,
    trade_entity_id,
    distress_entity_id,
    correlation_key_type,
    ticker,
    trade_event_type,
    distress_event_type,
    trade_date,
    distress_date,
    days_between,
    longitude,
    latitude,
    location_confidence,
    location_precision,
    now()
  from matched;

  get diagnostics refreshed_count = row_count;
  return refreshed_count;
end;
$$;

revoke all on function public.refresh_map_cross_signals() from public;
revoke all on function public.refresh_map_cross_signals() from anon;
revoke all on function public.refresh_map_cross_signals() from authenticated;
grant execute on function public.refresh_map_cross_signals() to service_role;

comment on table public.map_cross_signals is
  'Timing-only links between exact-entity/ticker trade and distress filings. Not evidence of wrongdoing.';
