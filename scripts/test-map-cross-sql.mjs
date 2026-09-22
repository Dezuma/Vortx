#!/usr/bin/env node
import assert from 'node:assert/strict'
import { connectSupabasePg } from './lib/supabase-pg.mjs'

const ids = {
  company: '90000000-0000-4000-8000-000000000001',
  saleActor: '90000000-0000-4000-8000-000000000002',
  farActor: '90000000-0000-4000-8000-000000000003',
  otherActor: '90000000-0000-4000-8000-000000000004',
  purchaseActor: '90000000-0000-4000-8000-000000000005',
  congressActor: '90000000-0000-4000-8000-000000000006',
  distress: '91000000-0000-4000-8000-000000000001',
  sale: '91000000-0000-4000-8000-000000000002',
  farSale: '91000000-0000-4000-8000-000000000003',
  otherSale: '91000000-0000-4000-8000-000000000004',
  purchase: '91000000-0000-4000-8000-000000000005',
  congress: '91000000-0000-4000-8000-000000000006',
}

const { sql } = await connectSupabasePg()
try {
  await sql.unsafe('begin')
  await sql`
    insert into public.entities (id, canonical_name, entity_type, ticker)
    values
      (${ids.company}, 'Cross QA Company', 'company', 'TSTX'),
      (${ids.saleActor}, 'Cross QA Seller', 'person', null),
      (${ids.farActor}, 'Cross QA Far Seller', 'person', null),
      (${ids.otherActor}, 'Cross QA Other Seller', 'person', null),
      (${ids.purchaseActor}, 'Cross QA Buyer', 'person', null),
      (${ids.congressActor}, 'Cross QA Member', 'person', null)
  `
  await sql`
    insert into public.legal_events (
      id, entity_id, event_type, title, summary, jurisdiction, filing_date, trade_date
    )
    values
      (
        ${ids.distress}, ${ids.company}, 'warn_notice',
        'Cross QA Company WARN notice',
        'Reported affected employees: 100.',
        'Atlanta, Fulton County, GA', '2026-07-15', null
      ),
      (
        ${ids.sale}, ${ids.saleActor}, 'form_4',
        'Form 4 insider filing: Cross QA Seller (TSTX) sale',
        'Ticker on record: TSTX. Transaction code: S.',
        'US-SEC', '2026-07-02', '2026-07-01'
      ),
      (
        ${ids.farSale}, ${ids.farActor}, 'form_4',
        'Form 4 insider filing: Cross QA Far Seller (TSTX) sale',
        'Ticker on record: TSTX. Transaction code: S.',
        'US-SEC', '2026-06-15', '2026-06-14'
      ),
      (
        ${ids.otherSale}, ${ids.otherActor}, 'form_4',
        'Form 4 insider filing: Cross QA Other Seller (OTHR) sale',
        'Ticker on record: OTHR. Transaction code: S.',
        'US-SEC', '2026-07-03', '2026-07-02'
      ),
      (
        ${ids.purchase}, ${ids.purchaseActor}, 'form_4',
        'Form 4 insider filing: Cross QA Buyer (TSTX) purchase',
        'Ticker on record: TSTX. Transaction code: P.',
        'US-SEC', '2026-07-03', '2026-07-02'
      ),
      (
        ${ids.congress}, ${ids.congressActor}, 'congress_trade',
        'STOCK Act disclosure: Cross QA Member · TSTX',
        'Ticker on record: TSTX. Transaction on record.',
        'US-House', '2026-07-10', '2026-07-10'
      )
  `
  await sql`
    insert into public.map_signal_locations (
      event_id, entity_id, event_type, signal_group, filing_date,
      longitude, latitude, location_label, geocoding_confidence,
      location_precision, geocoder, source_fields, geocoded_at
    )
    values
      (
        ${ids.distress}, ${ids.company}, 'warn_notice', 'distress', '2026-07-15',
        -84.388, 33.749, 'Atlanta, GA', 'facility', 'city', 'manual',
        '{"city":"Atlanta","state":"GA","ticker":"TSTX"}'::jsonb, now()
      ),
      (
        ${ids.sale}, ${ids.saleActor}, 'form_4', 'trade', '2026-07-02',
        null, null, 'TSTX', 'unresolved', 'unknown', 'unresolved',
        '{"ticker":"TSTX"}'::jsonb, null
      ),
      (
        ${ids.farSale}, ${ids.farActor}, 'form_4', 'trade', '2026-06-15',
        null, null, 'TSTX', 'unresolved', 'unknown', 'unresolved',
        '{"ticker":"TSTX"}'::jsonb, null
      ),
      (
        ${ids.otherSale}, ${ids.otherActor}, 'form_4', 'trade', '2026-07-03',
        null, null, 'OTHR', 'unresolved', 'unknown', 'unresolved',
        '{"ticker":"OTHR"}'::jsonb, null
      ),
      (
        ${ids.purchase}, ${ids.purchaseActor}, 'form_4', 'trade', '2026-07-03',
        null, null, 'TSTX', 'unresolved', 'unknown', 'unresolved',
        '{"ticker":"TSTX"}'::jsonb, null
      ),
      (
        ${ids.congress}, ${ids.congressActor}, 'congress_trade', 'trade', '2026-07-10',
        null, null, 'TSTX', 'unresolved', 'unknown', 'unresolved',
        '{"ticker":"TSTX"}'::jsonb, null
      )
  `
  const refreshed = await sql`select public.refresh_map_cross_signals() as count`
  assert.equal(refreshed[0].count, 2)
  const rows = await sql`
    select trade_event_id, distress_event_id, trade_event_type, days_between, correlation_key_type
    from public.map_cross_signals
    order by trade_event_type
  `
  assert.equal(rows.length, 2)
  assert.ok(rows.every((row) => row.distress_event_id === ids.distress))
  assert.ok(rows.every((row) => row.correlation_key_type === 'entity'))
  assert.ok(rows.some((row) => row.trade_event_id === ids.sale && row.days_between === 14))
  assert.ok(
    rows.some((row) => row.trade_event_id === ids.congress && row.days_between === 5),
  )
  assert.ok(rows.every((row) => row.trade_event_id !== ids.farSale))
  assert.ok(rows.every((row) => row.trade_event_id !== ids.otherSale))
  assert.ok(rows.every((row) => row.trade_event_id !== ids.purchase))
  console.log(
    JSON.stringify(
      {
        refreshed_pairs: refreshed[0].count,
        unique_ticker_to_issuer_pairs: rows.length,
        far_31_day_sale_excluded: true,
        different_ticker_excluded: true,
        form4_purchase_excluded: true,
        form4_sale_included: true,
        congress_transaction_included: true,
      },
      null,
      2,
    ),
  )
  console.log('Map cross-signal SQL QA OK')
} finally {
  await sql.unsafe('rollback').catch(() => undefined)
  await sql.end({ timeout: 2 }).catch(() => undefined)
}
