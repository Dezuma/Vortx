-- Ingest stored bankruptcy, receivership, and creditor-dispute filings as
-- civil_docket. Titles are written by financialLabel() before that collapse,
-- so the prefix identifies rows that should use the specific event type.
-- Map geocoding and cross-signal refresh only match those specific types.

update public.legal_events
set
  event_type = case
    when title like 'Chapter 11 business bankruptcy record:%' then 'bankruptcy_chapter_11'
    when title like 'Chapter 7 business bankruptcy record:%' then 'bankruptcy_chapter_7'
    when title like 'Business bankruptcy docket:%' then 'bankruptcy_docket'
    when title like 'Receivership record:%' then 'receivership'
    when title like 'Bankruptcy adversary proceeding:%' then 'bankruptcy_adversary'
    when title like 'Secured-creditor dispute:%' then 'creditor_dispute'
    else event_type
  end,
  updated_at = now()
where event_type = 'civil_docket'
  and (
    title like 'Chapter 11 business bankruptcy record:%'
    or title like 'Chapter 7 business bankruptcy record:%'
    or title like 'Business bankruptcy docket:%'
    or title like 'Receivership record:%'
    or title like 'Bankruptcy adversary proceeding:%'
    or title like 'Secured-creditor dispute:%'
  );
