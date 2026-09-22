#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildVisitSummary,
  buildSinceSubscribedStat,
  buildWatchlistIndex,
  dedupeLiveFeedEvents,
  scoreLiveFeedRow,
  watchlistMatchNote,
} from '../frontend/functions/lib/customer-desk.js'
import { derivedEventSeverity, derivedEntityScore } from '../frontend/functions/lib/derived-scores.js'
import { customerActionHint, noticeKindForEvent } from '../frontend/functions/lib/event-evidence.js'

let failed = 0

function check(label, fn) {
  try {
    fn()
    console.log(`ok ${label}`)
  } catch (error) {
    failed += 1
    console.error(`fail ${label}:`, error instanceof Error ? error.message : error)
  }
}

const entity = { id: 'ent-1', canonical_name: 'Vitti Properties Corp.' }
const entityScore = { entity_id: 'ent-1', score: 90, confidence: 82 }
const events = [
  {
    id: 'ev-1',
    entity_id: 'ent-1',
    event_type: 'bankruptcy_docket',
    title: 'In re Vitti Properties Corp.: Case 24-12345',
    filing_date: '2026-07-01',
    severity: 90,
    confidence: 82,
  },
  {
    id: 'ev-2',
    entity_id: 'ent-1',
    event_type: 'bankruptcy_docket',
    title: 'In re Vitti Properties Corp.: Case 24-12345',
    filing_date: '2026-07-01',
    severity: 90,
    confidence: 82,
  },
  {
    id: 'ev-3',
    entity_id: 'ent-2',
    event_type: 'warn_notice',
    title: 'WARN notice · Example Co',
    filing_date: '2026-07-05',
    severity: 90,
    confidence: 80,
  },
]

check('dedupes identical entity/title/filing rows', () => {
  const deduped = dedupeLiveFeedEvents(events)
  if (deduped.length !== 2) throw new Error(`expected 2 rows, got ${deduped.length}`)
})

check('derived scores vary across record types', () => {
  const bankruptcyScore = derivedEventSeverity(events[0], entityScore, entity)
  const warnScore = derivedEventSeverity(events[2], { score: 90 }, { id: 'ent-2' })
  if (bankruptcyScore === warnScore) throw new Error('expected different display severities')
  if (bankruptcyScore >= 98 || bankruptcyScore <= 35) throw new Error(`severity out of range: ${bankruptcyScore}`)
})

check('urgency only marks 85+ as urgent', () => {
  const scored = scoreLiveFeedRow(events[2], { id: 'ent-2' }, { score: 90 }, [events[2]])
  if (scored.severity >= 85 && scored.urgency !== 'urgent') throw new Error('expected urgent')
})

check('recommended actions differ by record type', () => {
  const bankruptcy = customerActionHint(events[0], noticeKindForEvent(events[0], { record_type: 'bankruptcy_docket' }), {
    recordType: 'bankruptcy_docket',
    displaySeverity: 88,
  })
  const warn = customerActionHint(events[2], 'workforce', {
    recordType: 'warn_notice',
    displaySeverity: 88,
  })
  if (bankruptcy === warn) throw new Error('expected distinct action copy')
  if (!/WARN|workforce|layoff/i.test(warn)) throw new Error('expected workforce action text')
})

check('watchlist match note personalizes feed rows', () => {
  const index = buildWatchlistIndex([{ label: 'Vendors', entity_ids: ['ent-1'] }])
  const note = watchlistMatchNote('ent-1', 'Vitti Properties Corp.', index)
  if (!note?.includes('Vendors')) throw new Error('expected watchlist label in note')
})

check('visit summary counts new signals since last visit', () => {
  const scored = events.map((event) => ({
    ...event,
    display_severity: derivedEventSeverity(event, entityScore, entity),
  }))
  const summary = buildVisitSummary(scored, '2026-07-02T00:00:00.000Z', 11)
  if (summary.new_since_visit < 1) throw new Error('expected new signals')
  if (!summary.headline) throw new Error('expected headline')
})

check('since subscribed stat prefers watchlist hits', () => {
  const index = buildWatchlistIndex([{ label: 'Vendors', entity_ids: ['ent-1'] }])
  const stat = buildSinceSubscribedStat(events, '2026-06-01T00:00:00.000Z', index)
  if (!stat.copy.includes('watchlist')) throw new Error('expected watchlist copy')
})

check('entity friction score uses heat map pipeline', () => {
  const friction = derivedEntityScore(entityScore, events.slice(0, 1), entity)
  if (friction === 90) throw new Error('expected derived friction to differ from raw 90')
})

check('dashboard does not block on news coverage scrape', () => {
  const auth = readFileSync(resolve(import.meta.dirname, '../frontend/functions/api/auth.js'), 'utf8')
  if (auth.includes('enrichEventsWithNewsCoverage')) {
    throw new Error('desk dashboard should not wait on news coverage')
  }
  if (!auth.includes('event_type=not.in.(form_4,congress_trade,institutional_13f)')) {
    throw new Error('expected distress-only leftover query')
  }
  if (!auth.includes('loadAlertSummaryForUser')) {
    throw new Error('expected alert summary to stay on desk payload')
  }
})

if (failed) process.exit(1)
console.log('\nAll customer desk checks passed.')
