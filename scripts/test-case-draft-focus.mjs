#!/usr/bin/env node
/**
 * Unit checks: case draft generation focuses on WARN + egregious Form 4 / Congress trades.
 */
import {
  CASE_DRAFT_FOCUS_TYPES,
  CASE_DRAFT_SITE_URL,
  CASE_DRAFT_SUBSTACK_URL,
  CASE_DRAFT_SYSTEM_PROMPT,
  buildCaseUserPrompt,
  caseDraftCoverage,
  isEgregiousTradeCaseCandidate,
  isWarnCaseCandidate,
  selectCaseDraftCandidates,
  warnImpactHints,
} from '../frontend/functions/lib/case-draft-generator.js'

function check(name, cond) {
  if (!cond) throw new Error(name)
  console.log(`ok: ${name}`)
}

check('focus types are warn + form_4 + congress', CASE_DRAFT_FOCUS_TYPES.join(',') === 'warn_notice,form_4,congress_trade')
check('case voice is direct operator copy', CASE_DRAFT_SYSTEM_PROMPT.includes('direct operator copy'))
check('case voice forbids mush openers', CASE_DRAFT_SYSTEM_PROMPT.includes('noted in a public record'))
check('WARN prompt requires Vortx CTA', CASE_DRAFT_SYSTEM_PROMPT.includes(CASE_DRAFT_SITE_URL))
check('WARN prompt requires Substack CTA', CASE_DRAFT_SYSTEM_PROMPT.includes(CASE_DRAFT_SUBSTACK_URL))
check('WARN prompt requires if-you impact', CASE_DRAFT_SYSTEM_PROMPT.includes('If you [role'))

check(
  'WARN candidate passes severity floor',
  isWarnCaseCandidate({ event_type: 'warn_notice', severity: 85 }),
)
check(
  'WARN candidate rejects low severity',
  !isWarnCaseCandidate({ event_type: 'warn_notice', severity: 40 }),
)
check(
  'bankruptcy never counts as WARN',
  !isWarnCaseCandidate({ event_type: 'bankruptcy_docket', severity: 99 }),
)

check(
  'Form 4 sale with code + size is egregious',
  isEgregiousTradeCaseCandidate({
    event_type: 'form_4',
    severity: 78,
    amount: 150_000,
    summary: 'Transaction code: S. Amount/shares field on record: 150000.',
  }),
)
check(
  'Form 4 shell without buy/sell is rejected',
  !isEgregiousTradeCaseCandidate({
    event_type: 'form_4',
    severity: 90,
    amount: 0,
    summary: 'Form 4 insider filing detected.',
  }),
)
check(
  'Congress trade with material amount is egregious',
  isEgregiousTradeCaseCandidate({
    event_type: 'congress_trade',
    severity: 82,
    amount: 75_000,
    summary: 'Amount field on record: 75000.',
  }),
)
check(
  '13F never counts as trade case',
  !isEgregiousTradeCaseCandidate({
    event_type: 'institutional_13f',
    severity: 99,
    amount: 50_000_000,
    summary: 'Reported value field: 50000000.',
  }),
)

const selected = selectCaseDraftCandidates(
  [
    { id: 'w1', event_type: 'warn_notice', severity: 90, title: 'Big WARN' },
    { id: 'w2', event_type: 'warn_notice', severity: 80, title: 'Mid WARN' },
    { id: 'w3', event_type: 'warn_notice', severity: 70, title: 'Small WARN' },
    { id: 'w4', event_type: 'warn_notice', severity: 68, title: 'Extra WARN' },
    {
      id: 't1',
      event_type: 'form_4',
      severity: 88,
      amount: 1_200_000,
      summary: 'Transaction code: S. Amount/shares field on record: 1200000.',
    },
    {
      id: 't2',
      event_type: 'congress_trade',
      severity: 82,
      amount: 60_000,
      summary: 'Amount field on record: 60000. purchase.',
    },
    { id: 'b1', event_type: 'bankruptcy_docket', severity: 99, title: 'Should skip' },
    { id: 'f1', event_type: 'institutional_13f', severity: 99, title: 'Should skip fund' },
  ],
  new Set(['w2']),
  { maxPerRun: 5, warnQuota: 3, tradeQuota: 2, warnMinSeverity: 65, tradeMinSeverity: 78 },
)

check('skips covered WARN id', !selected.candidates.some((row) => row.id === 'w2'))
check('never picks bankruptcy or 13F', !selected.candidates.some((row) => ['b1', 'f1'].includes(row.id)))
check('keeps WARN quota preference', selected.warnCandidates.length >= 2)
check('keeps trade quota', selected.tradeCandidates.length === 2)
check('respects max per run', selected.candidates.length <= 5)
check(
  'only focus event types selected',
  selected.candidates.every((row) => CASE_DRAFT_FOCUS_TYPES.includes(row.event_type)),
)

const defaultPicks = selectCaseDraftCandidates(
  [
    { id: 'w1', event_type: 'warn_notice', severity: 90, title: 'Big WARN' },
    { id: 'w2', event_type: 'warn_notice', severity: 80, title: 'Mid WARN' },
    { id: 'w3', event_type: 'warn_notice', severity: 70, title: 'Small WARN' },
    { id: 'w4', event_type: 'warn_notice', severity: 68, title: 'Extra WARN' },
    {
      id: 't1',
      event_type: 'form_4',
      severity: 88,
      amount: 1_200_000,
      summary: 'Transaction code: S. Amount/shares field on record: 1200000.',
    },
    {
      id: 't2',
      event_type: 'congress_trade',
      severity: 82,
      amount: 60_000,
      summary: 'Amount field on record: 60000. purchase.',
    },
    { id: 'f1', event_type: 'institutional_13f', severity: 99, title: 'Should skip fund' },
  ],
  new Set(),
  { maxPerRun: 5 },
)

check('default tradeQuota is 0 so trades are not picked', defaultPicks.tradeCandidates.length === 0)
check('default fills WARN first', defaultPicks.warnCandidates.length === 4)
check(
  'default never picks 13F',
  !defaultPicks.candidates.some((row) => row.event_type === 'institutional_13f'),
)

const warnFields = {
  record_type: 'warn_notice',
  event_type: 'warn_notice',
  entity_name: 'Monterey Mushrooms',
  jurisdiction: 'Morgan Hill, California',
  filing_date: '2026-07-15',
  warn_facts: {
    employer: 'Monterey Mushrooms',
    affected_workers: 253,
    location: 'Morgan Hill, California',
    notice_date: '2026-07-15',
    effective_layoff_date: '2026-09-01',
  },
}
const impact = warnImpactHints(warnFields)
check('impact hints name the town and count', impact.some((line) => line.includes('Morgan Hill') && line.includes('253')))
check('impact hints stay conditional', impact.every((line) => /if you|could/i.test(line)))
check(
  'WARN user prompt injects impact and subscribe URLs',
  (() => {
    const prompt = buildCaseUserPrompt(warnFields)
    return (
      prompt.includes('ALLOWED IMPACT ANGLES') &&
      prompt.includes('do not paste them') &&
      prompt.includes(CASE_DRAFT_SITE_URL) &&
      prompt.includes(CASE_DRAFT_SUBSTACK_URL) &&
      prompt.includes('253')
    )
  })(),
)
check('WARN prompt bans WARN-prefixed headlines', CASE_DRAFT_SYSTEM_PROMPT.includes('Never start with "WARN"'))

const coverage = caseDraftCoverage(
  [
    { id: 'p1', event_id: 'w1', status: 'pending_review' },
    { id: 'pub1', event_id: 'w2', status: 'published' },
  ],
  { replacePending: true },
)
check('replace-pending leaves pending events uncovered', !coverage.coveredEventIds.has('w1'))
check('replace-pending still covers published', coverage.coveredEventIds.has('w2'))
check('replace-pending maps pending id', coverage.pendingByEvent.get('w1') === 'p1')

const keepPending = caseDraftCoverage(
  [{ id: 'p1', event_id: 'w1', status: 'pending_review' }],
  { replacePending: false },
)
check('default coverage treats pending as done', keepPending.coveredEventIds.has('w1'))

console.log('case draft focus checks passed')
