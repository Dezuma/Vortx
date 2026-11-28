#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  eventsMissingLocations,
  mapEventCandidatePath,
  runMapGeocodingJob,
} from '../frontend/functions/lib/map-geocoding-job.js'

const candidatePath = mapEventCandidatePath(0, 200)
assert.match(candidatePath, /order=created_at\.desc,id\.desc/)
assert.doesNotMatch(candidatePath, /order=filing_date/)
assert.match(candidatePath, /limit=200/)
assert.match(candidatePath, /offset=0/)
assert.equal(mapEventCandidatePath(200, 500).includes('limit=200'), true)
assert.match(mapEventCandidatePath(200, 50), /limit=50&offset=200/)

const located = new Set(['a', 'b'])
assert.deepEqual(
  eventsMissingLocations(
    [
      { id: 'a' },
      { id: 'b' },
      { id: 'warn' },
    ],
    located,
    60,
  ).map((row) => row.id),
  ['warn'],
)
assert.equal(eventsMissingLocations([{ id: 'a' }, { id: 'c' }, { id: 'd' }], located, 1).length, 1)

function event(id, eventType, filingDate) {
  return {
    id,
    entity_id: `entity-${id}`,
    raw_record_id: `raw-${id}`,
    event_type: eventType,
    title: id,
    summary: '',
    jurisdiction: 'CA',
    filing_date: filingDate,
  }
}

const newestForm4s = Array.from({ length: 200 }, (_, index) =>
  event(`form4-${index}`, 'form_4', '2026-11-28'),
)
const olderWarn = event('warn-older-notice', 'warn_notice', '2026-11-10')
const locatedIds = new Set(newestForm4s.map((row) => row.id))
const calls = []

function idsInFilter(path) {
  const match = String(path).match(/[a-z_]+=in\.\(([^)]*)\)/i)
  if (!match) return []
  return match[1].split(',').map((id) => decodeURIComponent(id))
}

async function supabaseRest(_env, path) {
  calls.push(String(path))
  const text = String(path)
  if (text.startsWith('legal_events?')) {
    const offset = Number(new URLSearchParams(text.split('?')[1]).get('offset') || 0)
    if (offset === 0) return newestForm4s
    if (offset === 200) return [olderWarn]
    return []
  }
  if (text.startsWith('map_signal_locations?') && text.includes('event_id=in.')) {
    return idsInFilter(text)
      .filter((id) => locatedIds.has(id))
      .map((id) => ({ event_id: id }))
  }
  if (text.startsWith('map_signal_locations?') && text.includes('geocoding_confidence=eq.unresolved')) {
    return []
  }
  if (text.startsWith('raw_records?') || text.startsWith('entities?')) return []
  throw new Error(`unexpected supabase path: ${text}`)
}

const result = await runMapGeocodingJob({}, supabaseRest, { maxEvents: 60, dryRun: true })
assert.equal(result.ok, true)
assert.equal(result.processed, 1)
assert.equal(result.unresolved, 1)
assert.equal(result.resolved, 0)
assert.ok(calls.some((path) => path.includes('offset=200')))
assert.equal(
  calls.filter((path) => path.startsWith('legal_events?') && path.includes('order=filing_date')).length,
  0,
)

console.log('map geocoding job selection ok')
