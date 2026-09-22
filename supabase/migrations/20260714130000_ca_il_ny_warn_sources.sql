-- Register California, Illinois, and New York WARN ingest sources.

insert into public.source_catalog (
  slug,
  name,
  jurisdiction,
  record_type,
  access_method,
  terms_status,
  refresh_cadence,
  source_url,
  enabled,
  notes,
  adapter_kind,
  rate_limit_per_hour
) values
  (
    'california-warn-notices',
    'California WARN Notices',
    'CA',
    'warn_notice',
    'api',
    'approved',
    'daily',
    'https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report1.xlsx',
    true,
    'California EDD weekly WARN XLSX (warn_report1.xlsx, Tue/Thu updates). Falls back to warn_report.xlsx when the weekly file is empty.',
    'warn_ca_xlsx',
    60
  ),
  (
    'illinois-warn-notices',
    'Illinois WARN Notices',
    'IL',
    'warn_notice',
    'api',
    'approved',
    'daily',
    'https://apps.illinoisworknet.com/iebs/api/public/searchWarn',
    true,
    'Illinois WorkNet public searchWarn API. Ingest pulls the 250 most recent active layoff/WARN records per run.',
    'warn_il_api',
    60
  ),
  (
    'new-york-warn-notices',
    'New York WARN Notices',
    'NY',
    'warn_notice',
    'api',
    'approved',
    'daily',
    'https://public.tableau.com/views/WorkerAdjustmentRetrainingNotificationWARN/WARN?:showVizHome=no&:embed=y&:format=csv',
    true,
    'NY DOL Tableau Public WARN dashboard CSV export. Includes affected worker counts and site details.',
    'warn_ny_csv',
    60
  )
on conflict (slug) do update set
  name = excluded.name,
  jurisdiction = excluded.jurisdiction,
  record_type = excluded.record_type,
  access_method = excluded.access_method,
  terms_status = excluded.terms_status,
  refresh_cadence = excluded.refresh_cadence,
  source_url = excluded.source_url,
  enabled = excluded.enabled,
  notes = excluded.notes,
  adapter_kind = excluded.adapter_kind,
  rate_limit_per_hour = excluded.rate_limit_per_hour;

update public.source_catalog
set
  notes = 'Reserved for a future unified WARN aggregator. TX, OR, CA, IL, and NY feeds are live today.'
where slug = 'warn-firehose';
