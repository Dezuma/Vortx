#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  displayWatchers,
  hash32,
  loadMostWatchedNames,
} from '../frontend/functions/lib/most-watched.js'

assert.equal(hash32('alpha'), hash32('alpha'))
assert.notEqual(hash32('alpha'), hash32('beta'))

const noon = Date.UTC(2026, 8, 10, 12)
const later = Date.UTC(2026, 8, 10, 23)
assert.equal(displayWatchers('ent-1', 2, 0, noon), displayWatchers('ent-1', 2, 0, later))
assert.notEqual(displayWatchers('ent-1', 2, 0, noon), displayWatchers('ent-2', 2, 0, noon))

const seeded = displayWatchers('ent-1', 0, 0, noon)
assert.ok(seeded >= 18 && seeded <= 168, `seeded count in range, got ${seeded}`)
assert.equal(displayWatchers('ent-1', 0, 400, noon), 400)

const empty = await loadMostWatchedNames({}, async () => [])
assert.equal(empty.names.length, 0)

const payload = await loadMostWatchedNames({}, async (env, path) => {
  if (path.startsWith('entity_watchlist_members')) return []
  if (path.startsWith('legal_events') && path.includes('filing_date=gte')) return []
  if (path.startsWith('legal_events')) {
    return [
      { entity_id: 'aaa', event_type: 'form_4', filing_date: '2026-09-01' },
      { entity_id: 'aaa', event_type: 'form_4', filing_date: '2026-09-02' },
      { entity_id: 'bbb', event_type: 'congress_trade', filing_date: '2026-09-03' },
    ]
  }
  if (path.startsWith('entities')) {
    return [
      { id: 'aaa', canonical_name: 'Ada Lovelace', ticker: 'NVDA' },
      { id: 'bbb', canonical_name: 'Rep. Example', ticker: 'AAPL' },
    ]
  }
  return []
})
assert.equal(payload.ok, true)
assert.ok(payload.names.length >= 2)
assert.equal(payload.names[0].name, 'Ada Lovelace')
assert.ok(payload.names[0].watchers >= 18)
assert.notEqual(payload.names[0].watchers, 0)
assert.equal(payload.names[0].filings, 2)

console.log('Most watched QA OK')
