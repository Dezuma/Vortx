-- Enable county lien sources for contractor-check (CourtListener docket search adapters).
update public.source_catalog
set
  enabled = true,
  disabled_reason = null,
  adapter_kind = 'courtlistener_search',
  record_type = 'mechanics_lien',
  terms_status = 'approved',
  notes = 'Ingest via CourtListener docket search (mechanics/construction liens). County portal API pending.',
  updated_at = now()
where slug in ('cook-county-liens', 'ok-county-records');

update public.source_catalog
set
  record_type = 'mechanics_lien',
  updated_at = now()
where slug = 'courtlistener-liens';
