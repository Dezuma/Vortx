#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  buildMapSignalDetail,
  mapExportPermissions,
  onMapSignalCsvGet,
  onMapSignalDetailGet,
} from '../frontend/functions/api/map-signal-detail.js'
import { planCapabilities } from '../frontend/functions/lib/plan-capabilities.js'
import { readDevVars } from './lib/supabase-pg.mjs'
import { supabaseRest } from '../frontend/functions/lib/supabase-rest.js'

const env = readDevVars()
const locationRows = await supabaseRest(
  env,
  'map_signal_locations?select=event_id&geocoding_confidence=neq.unresolved&order=filing_date.desc&limit=1',
)
const eventId = locationRows?.[0]?.event_id
assert.ok(eventId, 'expected a resolved map signal')

const guestRequest = new Request(
  `https://vortxmkt.com/api/map/signal?id=${encodeURIComponent(eventId)}`,
  { headers: { 'cf-connecting-ip': '127.0.0.21' } },
)
const guestResponse = await onMapSignalDetailGet({ request: guestRequest, env })
const guestPayload = await guestResponse.json()
assert.equal(guestResponse.status, 200)
assert.equal(guestPayload.access.masked, true)
assert.equal(guestPayload.signal.entityName, null)
assert.equal(guestPayload.signal.sourceUrl, null)
if (
  guestPayload.signal.eventType !== 'form_4' &&
  guestPayload.signal.eventType !== 'congress_trade'
) {
  assert.equal(guestPayload.signal.ticker, null)
}
assert.ok(guestPayload.signal.watchEntityId)
assert.ok(guestPayload.signal.location.label)

const guestCsv = await onMapSignalCsvGet({
  request: new Request(
    `https://vortxmkt.com/api/map/signal.csv?id=${encodeURIComponent(eventId)}`,
    { headers: { 'cf-connecting-ip': '127.0.0.22' } },
  ),
  env,
})
assert.equal(guestCsv.status, 403)

const fixture = {
  event: {
    id: '11111111-1111-4111-8111-111111111111',
    entity_id: '22222222-2222-4222-8222-222222222222',
    event_type: 'form_4',
    title: 'Form 4 insider filing: Jane Executive (EXMP) purchase',
    summary:
      'SEC Form 4 filing for Jane Executive. Reporting owner: Jane Executive. Issuer on record: Example Corp. Ticker on record: EXMP. Transaction code: P. Amount/shares field on record: 250000.',
    filing_date: '2026-08-11',
    trade_date: '2026-08-10',
    amount: 250000,
    jurisdiction: 'US-SEC',
  },
  entity: { canonical_name: 'Jane Executive', ticker: null },
  location: {
    signal_group: 'trade',
    geocoding_confidence: 'hq',
    location_precision: 'address',
    location_label: '1 Main St, Atlanta, GA, 30303',
    source_fields: { city: 'Atlanta', state: 'GA' },
  },
  sourceUrl: 'https://www.sec.gov/example',
  sourceName: 'SEC EDGAR Form 4',
}

function access(plan, { active = true, role = 'customer' } = {}) {
  const authenticated = plan !== 'guest'
  const subscriber = authenticated && active
  return {
    isAuthenticated: authenticated,
    isSubscriber: subscriber,
    profile: authenticated
      ? { plan, role, subscription_status: active ? 'active' : 'past_due' }
      : null,
    capabilities: planCapabilities(plan === 'guest' ? 'scout' : plan, role),
    showFullNames:
      subscriber && Boolean(planCapabilities(plan, role).fullEntityNames || role === 'admin'),
    showSourceUrls:
      subscriber && Boolean(planCapabilities(plan, role).sourceUrls || role === 'admin'),
    tierLabel: authenticated ? `${plan} · active` : null,
  }
}

for (const plan of ['guest', 'scout', 'sentinel']) {
  const payload = buildMapSignalDetail({ ...fixture, access: access(plan) })
  const serialized = JSON.stringify(payload)
  assert.equal(payload.access.masked, true, `${plan} should be masked`)
  assert.equal(payload.signal.entityName, null)
  assert.doesNotMatch(serialized, /Jane Executive|www\.sec\.gov\/example/)
  assert.equal(payload.signal.ticker, 'EXMP')
  assert.equal(payload.signal.issuerName, 'Example Corp')
}

const nebula = buildMapSignalDetail({ ...fixture, access: access('nebula') })
assert.equal(nebula.access.masked, false)
assert.equal(nebula.signal.entityName, 'Jane Executive')
assert.equal(nebula.signal.ticker, 'EXMP')
assert.equal(nebula.signal.sourceUrl, fixture.sourceUrl)
assert.equal(nebula.access.canExportSignal, false)
assert.match(nebula.signal.summary, /Jane Executive bought Example Corp \(EXMP\)/)
assert.match(nebula.signal.summary, /Address on the record: Atlanta, GA/)
assert.doesNotMatch(nebula.signal.summary, /Reporting owner:|Transaction code:|Fields enriched/)
assert.match(nebula.signal.summary, /The SEC posted it the next day/)

const guestStory = buildMapSignalDetail({ ...fixture, access: access('guest') })
assert.match(guestStory.signal.maskedSummary, /insider purchase of Example Corp/)
assert.doesNotMatch(guestStory.signal.maskedSummary, /Jane Executive/)

for (const plan of ['pulsar', 'supernova']) {
  const payload = buildMapSignalDetail({ ...fixture, access: access(plan) })
  assert.equal(payload.access.masked, false)
  assert.equal(payload.access.canExportSignal, true)
  assert.equal(payload.access.canExportVisible, false)
}

const enterprise = buildMapSignalDetail({ ...fixture, access: access('galactic') })
assert.equal(enterprise.access.canExportSignal, true)
assert.equal(enterprise.access.canExportVisible, true)
const custom = buildMapSignalDetail({ ...fixture, access: access('custom') })
assert.equal(custom.access.canExportSignal, true)
assert.equal(custom.access.canExportVisible, false)

assert.deepEqual(mapExportPermissions(access('nebula')), {
  individual: false,
  bulk: false,
})
assert.deepEqual(mapExportPermissions(access('pulsar')), {
  individual: true,
  bulk: false,
})
assert.deepEqual(mapExportPermissions(access('galactic')), {
  individual: true,
  bulk: true,
})

console.log(
  JSON.stringify(
    {
      guest_detail_status: guestResponse.status,
      guest_masked: guestPayload.access.masked,
      guest_csv_status: guestCsv.status,
      scout_masked: true,
      sentinel_masked: true,
      nebula_full: true,
      operator_signal_csv: true,
      professional_signal_csv: true,
      enterprise_visible_csv: true,
    },
    null,
    2,
  ),
)
console.log('Map drawer tier QA OK')
