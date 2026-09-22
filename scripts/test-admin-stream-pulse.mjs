#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  buildOpsConfigStatus,
  comparePulseSignals,
  selectPulseEventsByEntity,
} from '../frontend/functions/api/admin-stream-pulse-data.js'

const ranked = [
  { event_type: 'institutional_13f', severity: 99, filing_date: '2026-09-01' },
  { event_type: 'warn_notice', severity: 70, filing_date: '2026-08-01' },
  { event_type: 'warn_notice', severity: 88, filing_date: '2026-07-15' },
].sort(comparePulseSignals)

assert.equal(ranked[0].event_type, 'warn_notice')
assert.equal(ranked[0].severity, 88)
assert.equal(ranked[1].event_type, 'warn_notice')
assert.equal(ranked[2].event_type, 'institutional_13f')

const perEntity = selectPulseEventsByEntity([
  {
    entity_id: 'acme',
    event_type: 'institutional_13f',
    severity: 99,
    filing_date: '2026-09-01',
  },
  {
    entity_id: 'acme',
    event_type: 'warn_notice',
    severity: 72,
    filing_date: '2026-07-01',
  },
  {
    entity_id: 'other',
    event_type: 'form_4',
    severity: 80,
    filing_date: '2026-08-20',
  },
])
assert.equal(perEntity[0].entity_id, 'acme')
assert.equal(perEntity[0].event_type, 'warn_notice')
assert.equal(perEntity.length, 2)

const quiet = buildOpsConfigStatus({
  DISCORD_MASS_LAYOFFS_WEBHOOK_URL: 'https://discord.com/api/webhooks/9/m',
})
assert.equal(quiet.ops_config.discord_cases_configured, true)
assert.equal(quiet.ops_config.substack_configured, false)
assert.equal(quiet.ops_config.substack_publish_on_approve, false)
assert.deepEqual(quiet.config_warnings, [])

const missingDiscord = buildOpsConfigStatus({})
assert.equal(missingDiscord.ops_config.discord_cases_configured, false)
assert.ok(missingDiscord.config_warnings.some((row) => /Discord Cases webhook missing/.test(row)))
assert.ok(!missingDiscord.config_warnings.some((row) => /Substack/.test(row)))

const substackWarn = buildOpsConfigStatus({
  DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/8/legacy',
  SUBSTACK_PUBLISH_ON_APPROVE: 'true',
})
assert.ok(substackWarn.config_warnings.some((row) => /Substack session missing/.test(row)))
assert.equal(substackWarn.ops_config.substack_publish_on_approve, false)

console.log('admin-stream-pulse ops + ranking: ok')
