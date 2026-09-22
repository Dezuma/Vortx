#!/usr/bin/env node
/**
 * Insert event_evidence Archives URLs for Form 4 / 13F rows that already have
 * CIK + accession stored. Does not fetch SEC.gov.
 */
import { officialSecFilingUrl } from '../frontend/functions/lib/event-evidence.js'
import { connectSupabasePg } from './lib/supabase-pg.mjs'

const { sql } = await connectSupabasePg()
try {
  const rows = await sql`
    select
      e.id as event_id,
      e.event_type,
      e.title,
      e.summary,
      ent.cik as entity_cik,
      r.source_record_id,
      r.fetched_url,
      r.payload
    from legal_events e
    join entities ent on ent.id = e.entity_id
    left join raw_records r on r.id = e.raw_record_id
    where e.event_type in ('form_4', 'institutional_13f')
      and not exists (
        select 1
        from event_evidence ee
        where ee.event_id = e.id
          and ee.source_url ilike '%/Archives/edgar/data/%'
      )
  `
  let inserted = 0
  let skipped = 0
  for (const row of rows) {
    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {}
    const href = officialSecFilingUrl(
      {
        cik: row.entity_cik || payload.cik || payload.filerCik || payload.issuerCik,
        issuer_cik: payload.issuerCik || payload.issuer_cik || payload.cik,
        owner_cik: payload.ownerCik || payload.owner_cik,
        accession: payload.accession || payload.accessionNumber || row.source_record_id,
        source_record_id: row.source_record_id,
        title: row.title,
        summary: row.summary,
        link: payload.link || payload.url || row.fetched_url,
      },
      payload.link || row.fetched_url || '',
    )
    if (!href || !/\/Archives\/edgar\/data\/\d+\//i.test(href)) {
      skipped += 1
      continue
    }
    const result = await sql`
      insert into event_evidence (event_id, source_url, document_id, evidence_type, metadata)
      select
        ${row.event_id}::uuid,
        ${href},
        ${row.source_record_id || null},
        'source_link',
        jsonb_build_object('backfill', 'sec_archives_from_identifiers', 'event_type', ${row.event_type})
      where not exists (
        select 1 from event_evidence ee
        where ee.event_id = ${row.event_id}::uuid
          and ee.source_url = ${href}
      )
      returning id
    `
    if (result.length) inserted += 1
    else skipped += 1
  }
  console.log(
    JSON.stringify(
      {
        candidates: rows.length,
        inserted,
        skipped,
        by_type: rows.reduce((acc, row) => {
          acc[row.event_type] = (acc[row.event_type] || 0) + 1
          return acc
        }, {}),
      },
      null,
      2,
    ),
  )
} finally {
  await sql.end({ timeout: 2 })
}
