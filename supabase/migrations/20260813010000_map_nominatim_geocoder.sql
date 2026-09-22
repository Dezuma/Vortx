-- Allow Nominatim for foreign SEC issuer HQs, and country-level precision
-- when only a country centroid/match is available.
alter table public.map_signal_locations
  drop constraint if exists map_signal_locations_geocoder_check;

alter table public.map_signal_locations
  add constraint map_signal_locations_geocoder_check
  check (geocoder in ('census', 'nominatim', 'manual', 'unresolved'));

alter table public.map_signal_locations
  drop constraint if exists map_signal_locations_location_precision_check;

alter table public.map_signal_locations
  add constraint map_signal_locations_location_precision_check
  check (
    location_precision in (
      'address',
      'city',
      'county',
      'state',
      'country',
      'unknown'
    )
  );
