#!/usr/bin/env node
/**
 * Lock the ingest rule: the current friction score is the entity's peak
 * stored severity, not whichever filing was written last.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function read(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function ingestFunction(sql) {
  const start = sql.search(/create or replace function public\.ingest_legal_records/i)
  assert.ok(start >= 0, 'ingest_legal_records missing')
  const rest = sql.slice(start + 1)
  const next = rest.search(/create or replace function /i)
  return next >= 0 ? sql.slice(start, start + 1 + next) : sql.slice(start)
}

function assertPeakScore(sql, label) {
  const fn = ingestFunction(sql)
  const eventWrite = fn.indexOf('insert into public.legal_events')
  const peak = fn.indexOf('order by le.severity desc nulls last')
  const scoreWrite = fn.indexOf('insert into public.friction_scores')
  assert.ok(eventWrite > 0, `${label}: legal_events insert missing`)
  assert.ok(peak > eventWrite, `${label}: peak severity is chosen after the filing is stored`)
  assert.ok(scoreWrite > peak, `${label}: friction score is written from the peak filing`)
  assert.match(fn, /winning_title/, `${label}: score reason follows the peak filing`)
  assert.doesNotMatch(
    fn.slice(peak),
    /jsonb_build_object\('label', event_payload->>'title'/,
    `${label}: score reason must not follow the filing ingested last`,
  )
}

assertPeakScore(read('supabase/ingest_rpc.sql'), 'ingest_rpc.sql')
assertPeakScore(read('supabase/schema.sql'), 'schema.sql')
assertPeakScore(
  read('supabase/migrations/20261118120000_friction_score_keeps_peak_severity.sql'),
  'migration',
)

/**
 * Same ordering the SQL uses: highest severity, then newest filing date.
 * @param {{severity:number, filing_date?:string, title:string, event_type:string}[]} events
 */
export function pickPeakFiling(events) {
  const ranked = [...events].sort((a, b) => {
    const bySeverity = (Number(b.severity) || 0) - (Number(a.severity) || 0)
    if (bySeverity) return bySeverity
    return String(b.filing_date || '').localeCompare(String(a.filing_date || ''))
  })
  const top = ranked[0]
  return {
    score: Math.min(100, Math.max(0, Number(top.severity) || 0)),
    title: top.title,
    event_type: top.event_type,
  }
}

const afterMilderReingest = pickPeakFiling([
  {
    severity: 88,
    filing_date: '2026-02-01',
    title: 'Chapter 11 business bankruptcy record: Northwind',
    event_type: 'bankruptcy_chapter_11',
  },
  {
    severity: 52,
    filing_date: '2026-11-17',
    title: '13F-HR institutional filing: Northwind',
    event_type: 'institutional_13f',
  },
])
assert.equal(afterMilderReingest.score, 88)
assert.equal(afterMilderReingest.event_type, 'bankruptcy_chapter_11')

const newerHigher = pickPeakFiling([
  { severity: 58, filing_date: '2026-03-01', title: 'Court record', event_type: 'civil_docket' },
  { severity: 90, filing_date: '2026-11-01', title: 'WARN notice', event_type: 'warn_notice' },
])
assert.equal(newerHigher.score, 90)
assert.equal(newerHigher.title, 'WARN notice')

console.log('friction score peak severity: ok')
