-- Harden cross-signals: source ticker -> unique issuer UUID -> distress entity.
-- This prevents fuzzy/non-unique entity tickers from creating legal-sensitive
-- timing relationships.
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
  with unique_tickers as (
    select
      upper(trim(ticker)) as ticker,
      (min(id::text))::uuid as issuer_entity_id
    from public.entities
    where ticker is not null
      and trim(ticker) <> ''
      and upper(trim(ticker)) <> 'NONE'
      and upper(trim(ticker)) ~ '^[A-Z][A-Z0-9.-]{0,7}$'
    group by upper(trim(ticker))
    having count(*) = 1
  ),
  trade_rows as (
    select
      trade_event.id,
      trade_event.entity_id,
      trade_event.event_type,
      coalesce(trade_event.trade_date, trade_event.filing_date) as event_date,
      upper(nullif(trim(trade_location.source_fields ->> 'ticker'), '')) as ticker,
      issuer.issuer_entity_id
    from public.legal_events trade_event
    join public.map_signal_locations trade_location
      on trade_location.event_id = trade_event.id
    join unique_tickers issuer
      on issuer.ticker = upper(nullif(trim(trade_location.source_fields ->> 'ticker'), ''))
    where
      (
        trade_event.event_type = 'form_4'
        and (
          trade_event.summary ~* 'Transaction code:\s*S(\.|$)'
          or trade_event.title ~* '\m(sale|sold|sell)\M'
        )
      )
      or (
        trade_event.event_type = 'congress_trade'
        and trade_location.source_fields ->> 'ticker' is not null
      )
  ),
  distress_rows as (
    select
      distress_event.id,
      distress_event.entity_id,
      distress_event.event_type,
      distress_event.filing_date as event_date,
      issuer.ticker,
      distress_location.longitude,
      distress_location.latitude,
      distress_location.geocoding_confidence,
      distress_location.location_precision
    from public.legal_events distress_event
    join public.map_signal_locations distress_location
      on distress_location.event_id = distress_event.id
    join public.entities distress_entity
      on distress_entity.id = distress_event.entity_id
    join unique_tickers issuer
      on issuer.issuer_entity_id = distress_entity.id
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
      'entity'::text as correlation_key_type,
      trade.ticker,
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
      on trade.issuer_entity_id = distress.entity_id
      and trade.ticker = distress.ticker
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
