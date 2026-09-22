-- Hot-path indexes for feed, scan, ingest, and marketing reads.
create extension if not exists pg_trgm;

create index if not exists legal_events_filing_date_idx
  on public.legal_events (filing_date desc nulls last);

create index if not exists legal_events_raw_record_id_idx
  on public.legal_events (raw_record_id);

create index if not exists legal_events_type_filing_date_idx
  on public.legal_events (event_type, filing_date desc nulls last);

create index if not exists raw_records_source_record_idx
  on public.raw_records (source_id, source_record_id);

create index if not exists entities_canonical_name_trgm_idx
  on public.entities using gin (canonical_name gin_trgm_ops);
