-- Cached, reviewable geocoding for viewport-bounded map queries.
-- Source fields remain service-role-only; the public API emits coordinates and
-- filing metadata only.
create table if not exists public.map_signal_locations (
  event_id uuid primary key references public.legal_events (id) on delete cascade,
  entity_id uuid not null references public.entities (id) on delete cascade,
  event_type text not null,
  signal_group text not null check (signal_group in ('distress', 'trade')),
  filing_date date not null,
  longitude double precision null check (longitude is null or longitude between -180 and 180),
  latitude double precision null check (latitude is null or latitude between -90 and 90),
  location_label text not null default '',
  geocoding_confidence text not null default 'unresolved'
    check (geocoding_confidence in ('facility', 'hq', 'registered_agent', 'unresolved')),
  location_precision text not null default 'unknown'
    check (location_precision in ('address', 'city', 'county', 'state', 'unknown')),
  geocoder text not null default 'unresolved'
    check (geocoder in ('census', 'manual', 'unresolved')),
  matched_address text null,
  geocoder_match_type text null,
  review_reason text null,
  source_fields jsonb not null default '{}'::jsonb,
  attempted_at timestamp with time zone not null default now(),
  geocoded_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint map_signal_location_resolution_check check (
    (
      geocoding_confidence = 'unresolved'
      and longitude is null
      and latitude is null
    )
    or (
      geocoding_confidence <> 'unresolved'
      and longitude is not null
      and latitude is not null
    )
  )
);

create index if not exists map_signal_locations_bounds_idx
  on public.map_signal_locations (longitude, latitude)
  where geocoding_confidence <> 'unresolved';

create index if not exists map_signal_locations_type_date_idx
  on public.map_signal_locations (event_type, filing_date desc);

create index if not exists map_signal_locations_unresolved_idx
  on public.map_signal_locations (attempted_at desc)
  where geocoding_confidence = 'unresolved';

alter table public.map_signal_locations enable row level security;

revoke all on table public.map_signal_locations from anon;
revoke all on table public.map_signal_locations from authenticated;

comment on table public.map_signal_locations is
  'Service-role geocoding cache and unresolved manual-review queue for Vortx map signals.';
