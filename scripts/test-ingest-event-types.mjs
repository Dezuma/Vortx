#!/usr/bin/env node
/** CourtListener distress filings must keep their event type when stored. */
import { storageEventType } from '../worker/ingest-cron.js'

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

const DISTRESS_TYPES = [
  'bankruptcy_docket',
  'bankruptcy_chapter_11',
  'bankruptcy_chapter_7',
  'bankruptcy_adversary',
  'receivership',
  'creditor_dispute',
]

for (const eventType of DISTRESS_TYPES) {
  check(`keeps ${eventType}`, () => {
    const stored = storageEventType(eventType)
    if (stored !== eventType) throw new Error(`stored as ${stored}`)
  })
}

check('keeps lien, warn, and trading types', () => {
  for (const eventType of [
    'mechanics_lien',
    'notice_of_intent',
    'warn_notice',
    'form_4',
    'congress_trade',
    'institutional_13f',
    'civil_docket',
  ]) {
    if (storageEventType(eventType) !== eventType) throw new Error(eventType)
  }
})

check('unknown types still fall back to civil_docket', () => {
  if (storageEventType('not_a_real_type') !== 'civil_docket') {
    throw new Error(storageEventType('not_a_real_type'))
  }
  if (storageEventType('') !== 'civil_docket') throw new Error('empty should be civil_docket')
})

if (failed) process.exit(1)
console.log('\nIngest event type tests passed.')
