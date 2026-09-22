import assert from 'node:assert/strict'
import { buildWatchAlertCopy } from '../frontend/functions/lib/watchlist-alerts.js'

const copy = buildWatchAlertCopy(
  {
    event_type: 'form_4',
    filing_date: '2026-07-30',
    title: 'Form 4 insider filing: Example Officer',
  },
  'Example Officer',
)

assert.match(copy.subject, /Example Officer/)
assert.match(copy.headline, /new insider form 4/i)
assert.ok(!copy.subject.includes('—'))
assert.ok(!copy.body.includes('—'))
console.log('test-watchlist-alerts: ok')
