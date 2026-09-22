-- Regional mechanics lien search sources (CourtListener docket + RECAP ingest).
insert into public.source_catalog (
  slug, name, jurisdiction, record_type, access_method, terms_status,
  refresh_cadence, source_url, enabled, notes, adapter_kind, rate_limit_per_hour
)
values
  (
    'texas-liens',
    'Texas Mechanics Lien Search',
    'US-TX',
    'mechanics_lien',
    'api',
    'approved',
    'daily',
    'https://www.courtlistener.com/api/rest/v4/search/',
    true,
    'CourtListener docket + RECAP search for Texas mechanics/construction liens.',
    'courtlistener_search',
    60
  ),
  (
    'florida-liens',
    'Florida Mechanics Lien Search',
    'US-FL',
    'mechanics_lien',
    'api',
    'approved',
    'daily',
    'https://www.courtlistener.com/api/rest/v4/search/',
    true,
    'CourtListener docket + RECAP search for Florida mechanics/construction liens.',
    'courtlistener_search',
    60
  ),
  (
    'california-liens',
    'California Mechanics Lien Search',
    'US-CA',
    'mechanics_lien',
    'api',
    'approved',
    'daily',
    'https://www.courtlistener.com/api/rest/v4/search/',
    true,
    'CourtListener docket + RECAP search for California mechanics/construction liens.',
    'courtlistener_search',
    60
  )
on conflict (slug) do update set
  enabled = excluded.enabled,
  record_type = excluded.record_type,
  adapter_kind = excluded.adapter_kind,
  terms_status = excluded.terms_status,
  notes = excluded.notes,
  disabled_reason = null,
  updated_at = now();
