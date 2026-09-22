#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildCrossSignalDetail,
  CROSS_SIGNAL_DISCLAIMER,
} from '../frontend/functions/api/map-signal-detail.js'
import { planCapabilities } from '../frontend/functions/lib/plan-capabilities.js'
import { projectRoot } from './lib/supabase-pg.mjs'

function exactCrossMatch({
  tradeEntityId,
  distressEntityId,
  tradeTicker,
  distressTicker,
  daysBetween,
}) {
  const sameEntity = Boolean(tradeEntityId && tradeEntityId === distressEntityId)
  const left = String(tradeTicker || '').trim().toUpperCase()
  const right = String(distressTicker || '').trim().toUpperCase()
  const sameTicker = Boolean(
    left &&
      right &&
      left === right &&
      left !== 'NONE' &&
      /^[A-Z][A-Z0-9.-]{0,7}$/.test(left),
  )
  return Math.abs(Number(daysBetween)) <= 30 && (sameEntity || sameTicker)
}

assert.equal(
  exactCrossMatch({
    tradeEntityId: 'person-1',
    distressEntityId: 'company-1',
    tradeTicker: 'EXMP',
    distressTicker: 'EXMP',
    daysBetween: 30,
  }),
  true,
)
assert.equal(
  exactCrossMatch({
    tradeEntityId: 'person-1',
    distressEntityId: 'company-1',
    tradeTicker: 'EXMP',
    distressTicker: 'EXMP',
    daysBetween: 31,
  }),
  false,
)
assert.equal(
  exactCrossMatch({
    tradeEntityId: 'person-1',
    distressEntityId: 'company-1',
    tradeTicker: 'EXM',
    distressTicker: 'EXMP',
    daysBetween: 3,
  }),
  false,
)
assert.equal(
  exactCrossMatch({
    tradeEntityId: 'company-1',
    distressEntityId: 'company-1',
    tradeTicker: null,
    distressTicker: null,
    daysBetween: -4,
  }),
  true,
)
assert.equal(
  exactCrossMatch({
    tradeEntityId: 'person-1',
    distressEntityId: 'company-1',
    tradeTicker: null,
    distressTicker: null,
    daysBetween: 0,
  }),
  false,
)

const migration = readFileSync(
  resolve(
    projectRoot(),
    'supabase/migrations/20260812180000_harden_map_cross_signal_match.sql',
  ),
  'utf8',
)
assert.match(migration, /with unique_tickers as/)
assert.match(migration, /having count\(\*\) = 1/)
assert.match(migration, /trade\.issuer_entity_id = distress\.entity_id/)
assert.match(migration, /trade\.ticker = distress\.ticker/)
assert.match(migration, /abs\(distress\.event_date - trade\.event_date\) <= 30/)

const activeAccess = {
  isAuthenticated: true,
  isSubscriber: true,
  profile: { plan: 'nebula', role: 'customer', subscription_status: 'active' },
  capabilities: planCapabilities('nebula'),
  showFullNames: true,
  showSourceUrls: true,
  tierLabel: 'Nebula · active',
}
const guestAccess = {
  isAuthenticated: false,
  isSubscriber: false,
  profile: null,
  capabilities: planCapabilities('scout'),
  showFullNames: false,
  showSourceUrls: false,
  tierLabel: null,
}
const dayOffsets = [14, -7, 0, 30, -30, 1, -1, 9, -22, 27]
const generated = dayOffsets.map((daysBetween, index) => {
  const tradeDate = new Date(Date.UTC(2026, 6, 1 + index))
  const distressDate = new Date(tradeDate)
  distressDate.setUTCDate(distressDate.getUTCDate() + daysBetween)
  const tradeEventType = index % 3 === 0 ? 'congress_trade' : 'form_4'
  const distressEventType =
    index % 2 === 0 ? 'warn_notice' : 'bankruptcy_chapter_11'
  const detail = buildCrossSignalDetail({
    cross: {
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      trade_event_id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      distress_event_id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      trade_entity_id: '30000000-0000-4000-8000-000000000001',
      distress_entity_id: '40000000-0000-4000-8000-000000000001',
      correlation_key_type: 'ticker',
      ticker: 'EXMP',
      trade_event_type: tradeEventType,
      distress_event_type: distressEventType,
      trade_date: tradeDate.toISOString().slice(0, 10),
      distress_date: distressDate.toISOString().slice(0, 10),
      days_between: daysBetween,
      location_confidence: 'facility',
      location_precision: 'address',
    },
    tradeEvent: {
      id: 'trade',
      entity_id: 'person',
      event_type: tradeEventType,
      title:
        tradeEventType === 'form_4'
          ? 'Form 4 insider filing: Alex Example (EXMP) sale'
          : 'STOCK Act disclosure: Senator Example · EXMP',
      summary:
        tradeEventType === 'form_4'
          ? 'Reporting owner: Alex Example. Issuer on record: Example Corp. Ticker on record: EXMP. Transaction code: S.'
          : 'Congressional STOCK Act disclosure naming Senator Example. Ticker on record: EXMP.',
      filing_date: tradeDate.toISOString().slice(0, 10),
      trade_date: tradeDate.toISOString().slice(0, 10),
      amount: 250000,
    },
    distressEvent: {
      id: 'distress',
      entity_id: 'company',
      event_type: distressEventType,
      title:
        distressEventType === 'warn_notice'
          ? 'Example Corp filed a workforce notice'
          : 'Example Corp filed a Chapter 11 docket',
      summary:
        distressEventType === 'warn_notice'
          ? 'Reported affected employees: 500.'
          : 'Chapter 11 filing on record.',
      filing_date: distressDate.toISOString().slice(0, 10),
    },
    tradeEntity: { canonical_name: tradeEventType === 'form_4' ? 'Alex Example' : 'Senator Example' },
    distressEntity: { canonical_name: 'Example Corp' },
    location: {
      source_fields: { city: 'Atlanta', county: 'Fulton County', state: 'GA' },
      location_label: 'Atlanta, Fulton County, GA',
    },
    tradeSourceUrl: 'https://example.test/trade',
    distressSourceUrl: 'https://example.test/distress',
    access: activeAccess,
  })
  return detail.signal.crossSignal
})

const prohibitedCausalLanguage =
  /\b(knew|because of|caused|coordinated with|front[- ]?ran|dumped before|anticipated|inside knowledge|evidence of wrongdoing)\b/i
for (const cross of generated) {
  assert.equal(cross.standingDisclaimer, CROSS_SIGNAL_DISCLAIMER)
  assert.doesNotMatch(cross.factualCopy, prohibitedCausalLanguage)
  assert.match(cross.factualCopy, /\bdisclosed\b/)
  assert.match(cross.factualCopy, /\bfiled\b/)
}

const masked = buildCrossSignalDetail({
  cross: {
    id: '00000000-0000-4000-8000-000000000099',
    trade_event_id: '10000000-0000-4000-8000-000000000099',
    distress_event_id: '20000000-0000-4000-8000-000000000099',
    trade_entity_id: '30000000-0000-4000-8000-000000000099',
    distress_entity_id: '40000000-0000-4000-8000-000000000099',
    correlation_key_type: 'ticker',
    ticker: 'EXMP',
    trade_event_type: 'form_4',
    distress_event_type: 'warn_notice',
    trade_date: '2026-07-01',
    distress_date: '2026-07-15',
    days_between: 14,
    location_confidence: 'facility',
    location_precision: 'address',
  },
  tradeEvent: {
    event_type: 'form_4',
    title: 'Form 4 insider filing: Alex Example (EXMP) sale',
    summary:
      'Reporting owner: Alex Example. Issuer on record: Example Corp. Ticker on record: EXMP. Transaction code: S.',
    filing_date: '2026-07-01',
    trade_date: '2026-07-01',
  },
  distressEvent: {
    event_type: 'warn_notice',
    title: 'Example Corp WARN notice',
    summary: 'Reported affected employees: 500.',
    filing_date: '2026-07-15',
  },
  tradeEntity: { canonical_name: 'Alex Example' },
  distressEntity: { canonical_name: 'Example Corp' },
  location: { source_fields: { city: 'Atlanta', state: 'GA' } },
  access: guestAccess,
})
const maskedText = JSON.stringify(masked)
assert.doesNotMatch(maskedText, /Alex Example|Example Corp|EXMP/)
assert.equal(
  masked.signal.crossSignal.standingDisclaimer,
  CROSS_SIGNAL_DISCLAIMER,
)

console.log(
  JSON.stringify(
    {
      generated_cross_copies: generated.length,
      causal_language_findings: 0,
      standing_disclaimer_present: generated.length,
      exact_entity_or_ticker_guard: true,
      thirty_day_boundary_inclusive: true,
      thirty_one_day_excluded: true,
      masked_copy_leaks: 0,
      copies: generated.map((cross) => cross.factualCopy),
    },
    null,
    2,
  ),
)
console.log('Map cross-signal QA OK')
