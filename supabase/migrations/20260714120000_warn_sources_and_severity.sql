-- Improve WARN source metadata and note multi-state expansion path.
update public.source_catalog
set
  enabled = true,
  refresh_cadence = 'daily',
  notes = 'Texas TWC open-data feed via data.austintexas.gov. Ingest pulls the 250 most recent notices per run.'
where slug = 'texas-warn-notices';

update public.source_catalog
set
  enabled = true,
  refresh_cadence = 'daily',
  notes = 'Oregon HECC WARN feed via data.oregon.gov. Ingest pulls the 250 most recent notices per run.'
where slug = 'oregon-warn-notices';

update public.source_catalog
set
  enabled = false,
  notes = 'Reserved for a future unified WARN aggregator. TX and OR Socrata feeds are live today.'
where slug = 'warn-firehose';
