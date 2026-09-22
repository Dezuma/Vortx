-- Bounds/filter hot paths for 11,500+ map-eligible events.
create index if not exists map_signal_locations_type_bounds_idx
  on public.map_signal_locations (event_type, longitude, latitude)
  where geocoding_confidence <> 'unresolved'
    and longitude is not null
    and latitude is not null;

create index if not exists map_cross_signals_type_bounds_idx
  on public.map_cross_signals (
    trade_event_type,
    distress_event_type,
    longitude,
    latitude
  );

analyze public.map_signal_locations;
analyze public.map_cross_signals;
