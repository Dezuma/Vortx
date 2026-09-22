#!/usr/bin/env node
import {
  buildJobSafetyScoreResults,
  extractAffectedWorkers,
  formatWorkerScale,
  isJobSafetyMatchAcceptable,
  isWarnLayoffEvent,
  normalizeUsState,
} from '../frontend/functions/lib/job-safety-score.js'

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
  const or = normalizeUsState('Oregon')
  if (or.abbr !== 'OR' || or.label !== 'Oregon') throw new Error('bad or')
})

check('filters WARN layoff events only', () => {
  const sourceById = new Map([
    ['s1', { record_type: 'warn_notice' }],
    ['s2', { record_type: 'bankruptcy_docket' }],
  ])
  if (!isWarnLayoffEvent({ event_type: 'warn_notice', source_id: 's1' }, sourceById)) {
    throw new Error('should match warn')
  }
  if (isWarnLayoffEvent({ event_type: 'bankruptcy_docket', source_id: 's2' }, sourceById)) {
    throw new Error('should ignore bankruptcy')
  }
})

check('extracts affected worker count from summary', () => {
  const count = extractAffectedWorkers('WARN notice listed 648 affected workers in Bexar County.')
  if (count !== 648) throw new Error(`expected 648, got ${count}`)
  const scale = formatWorkerScale(count)
  if (!scale || !scale.includes('648')) throw new Error('bad scale')
})

check('builds free result with filing date and worker scale visible', () => {
  const data = {
    entities: [{ id: 'e1', canonical_name: 'Example Manufacturing LLC', jurisdiction: 'Texas' }],
    events: [
      {
        id: 'ev1',
        entity_id: 'e1',
        event_type: 'warn_notice',
        title: 'WARN notice: Example Manufacturing LLC',
        summary: 'WARN notice listed 648 affected workers in Bexar County.',
        source_id: 's1',
        jurisdiction: 'Bexar County, Texas',
        filing_date: '2026-06-30',
        severity: 88,
      },
    ],
    scores: [],
    sources: [{ id: 's1', record_type: 'warn_notice', name: 'Texas WARN Notices' }],
  }
  const result = buildJobSafetyScoreResults(data, { unlocked: false, stateAbbr: 'TX' })
  if (!result.has_records || result.record_count !== 1) throw new Error('expected one record')
  if (!result.records[0].filing_date) throw new Error('expected filing date in free tier')
  if (!result.records[0].worker_scale || !result.records[0].worker_scale.includes('648')) {
    throw new Error('expected worker scale in free tier')
  }
  if (result.records[0].source_url) throw new Error('source url should be gated')
})

check('unlocked result includes summary and source fields', () => {
  const data = {
    entities: [{ id: 'e1', canonical_name: 'Example Manufacturing LLC', jurisdiction: 'Texas' }],
    events: [
      {
        id: 'ev1',
        entity_id: 'e1',
        event_type: 'warn_notice',
        title: 'WARN notice: Example Manufacturing LLC',
        summary: 'WARN notice listed 648 affected workers in Bexar County.',
        source_id: 's1',
        jurisdiction: 'Bexar County, Texas',
        filing_date: '2026-06-30',
        severity: 88,
        source_url: 'https://data.austintexas.gov/example',
      },
    ],
    scores: [],
    sources: [{ id: 's1', record_type: 'warn_notice', name: 'Texas WARN Notices', source_url: 'https://data.austintexas.gov/' }],
  }
  const result = buildJobSafetyScoreResults(data, { unlocked: true, stateAbbr: 'TX' })
  if (result.records[0].locked) throw new Error('expected unlocked')
  if (!result.records[0].summary_preview) throw new Error('expected summary')
})

check('rejects weak entity matches', () => {
  const accepted = isJobSafetyMatchAcceptable('State Farm', {
    entity_id: 'x',
    name: 'STATE STREET CORP',
    confidence: 0.554,
  })
  if (accepted) throw new Error('should reject weak match')
})

if (failed) process.exit(1)
console.log('\nJob Safety Score unit tests passed.')
