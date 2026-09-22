#!/usr/bin/env node
import {
  buildWarnTitle,
  extractAffectedWorkers,
  warnSeverityFromWorkers,
} from '../frontend/functions/lib/warn-notice.js'

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

check('scales large layoffs into case-draft range', () => {
  if (warnSeverityFromWorkers(244) < 80) throw new Error('244 workers should be >= 80')
  if (warnSeverityFromWorkers(648) < 90) throw new Error('648 workers should be >= 90')
})

check('keeps small layoffs eligible at lower threshold', () => {
  if (warnSeverityFromWorkers(10) < 65) throw new Error('small layoffs should stay >= 65')
})

check('extracts worker counts from summary text', () => {
  const count = extractAffectedWorkers('Reported affected employees: 244. Location: TX.')
  if (count !== 244) throw new Error(`expected 244, got ${count}`)
})

check('builds narrative WARN titles', () => {
  const title = buildWarnTitle('JPMorgan Chase & Co.', 244)
  if (!title.includes('JPMorgan') || !title.includes('244')) throw new Error(title)
  const small = buildWarnTitle('PD Systems', 81)
  if (!small.includes('81') || !small.includes('WARN notice')) throw new Error(small)
})

if (failed) process.exit(1)
console.log('\nWARN notice helper tests passed.')
