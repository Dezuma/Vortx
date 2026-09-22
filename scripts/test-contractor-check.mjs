#!/usr/bin/env node
import {
  buildContractorCheckResults,
  isContractorMatchAcceptable,
  isContractorRelevantEvent,
  normalizeUsState,
  relativeRecencyLabel,
} from '../frontend/functions/lib/contractor-check.js'

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

check('normalizes US state abbreviations', () => {
  const tx = normalizeUsState('TX')
  if (tx.abbr !== 'TX' || tx.label !== 'Texas') throw new Error('bad tx')
})

check('filters contractor-relevant events', () => {
  const sourceById = new Map([['s1', { record_type: 'bankruptcy_docket' }]])
  if (!isContractorRelevantEvent({ event_type: 'warn_notice', source_id: 's1' }, sourceById)) {
    throw new Error('should ignore warn')
  }
  if (!isContractorRelevantEvent({ event_type: 'civil_docket', title: 'mechanics lien', source_id: 's1' }, sourceById)) {
    throw new Error('should match lien')
  }
})

check('builds free binary result with locked previews', () => {
  const data = {
    entities: [{ id: 'e1', canonical_name: 'Apex Roofing LLC', jurisdiction: 'Texas' }],
    events: [
      {
        id: 'ev1',
        entity_id: 'e1',
        event_type: 'civil_docket',
        title: 'Mechanics lien filing',
        summary: 'construction lien',
        source_id: 's1',
        jurisdiction: 'Texas',
        filing_date: '2026-04-01',
        severity: 80,
      },
    ],
    scores: [],
    sources: [{ id: 's1', record_type: 'civil_docket', name: 'CourtListener Lien Search' }],
  }
  const result = buildContractorCheckResults(data, { unlocked: false, stateAbbr: 'TX' })
  if (!result.has_records || result.record_count !== 1) throw new Error('expected one record')
  if (!result.records[0].locked || !result.records[0].teaser_line.includes('ago')) {
    throw new Error('expected locked teaser with recency')
  }
})

check('relative recency label', () => {
  const label = relativeRecencyLabel(new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10))
  if (!/month/.test(label)) throw new Error(`unexpected label: ${label}`)
})

check('rejects weak entity matches like State Farm vs State Street', () => {
  const accepted = isContractorMatchAcceptable('State Farm', {
    entity_id: 'x',
    name: 'STATE STREET CORP',
    confidence: 0.554,
  })
  if (accepted) throw new Error('should reject weak match')
})

check('accepts exact entity matches', () => {
  const accepted = isContractorMatchAcceptable('BCS AD 2 LLC', {
    entity_id: 'x',
    name: 'BCS AD 2 LLC',
    confidence: 1,
  })
  if (!accepted) throw new Error('should accept exact match')
})

if (failed) process.exit(1)
console.log('\nContractor check unit tests passed.')
