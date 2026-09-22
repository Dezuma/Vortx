#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  authenticateEnterpriseMapApi,
  EnterpriseApiAuthError,
  sha256Hex,
} from '../frontend/functions/lib/enterprise-api-auth.js'
import {
  buildEnterpriseMapFeatureCollection,
  onEnterpriseMapSignalsGet,
} from '../frontend/functions/api/enterprise-map-signals.js'

const key = `vx_map_${'a'.repeat(43)}`
const request = new Request(
  'https://vortxmkt.com/api/enterprise/map/signals?bounds=-125,32,-114,42',
  { headers: { 'x-vortx-api-key': key, 'cf-connecting-ip': '127.0.0.31' } },
)
const expectedHash = await sha256Hex(key)
let queriedPath = ''
const authenticated = await authenticateEnterpriseMapApi(request, {}, {
  lookup: async (_env, path) => {
    queriedPath = path
    return [
      {
        id: 'subscriber-id',
        owner_email: 'enterprise@example.com',
        plan: 'galactic',
        status: 'active',
      },
    ]
  },
})
assert.equal(authenticated.tokenHash, expectedHash)
assert.match(queriedPath, new RegExp(expectedHash))
assert.doesNotMatch(queriedPath, new RegExp(key))

await assert.rejects(
  () =>
    authenticateEnterpriseMapApi(request, {}, {
      lookup: async () => [
        {
          id: 'subscriber-id',
          owner_email: 'professional@example.com',
          plan: 'supernova',
          status: 'active',
        },
      ],
    }),
  (error) =>
    error instanceof EnterpriseApiAuthError &&
    error.code === 'enterprise_required' &&
    error.status === 403,
)
await assert.rejects(
  () =>
    authenticateEnterpriseMapApi(request, {}, {
      lookup: async () => [
        {
          id: 'subscriber-id',
          owner_email: 'enterprise@example.com',
          plan: 'galactic',
          status: 'revoked',
        },
      ],
    }),
  (error) =>
    error instanceof EnterpriseApiAuthError &&
    error.code === 'invalid_api_key' &&
    error.status === 401,
)

const noKeyResponse = await onEnterpriseMapSignalsGet({
  request: new Request(
    'https://vortxmkt.com/api/enterprise/map/signals?bounds=-125,32,-114,42',
    { headers: { 'cf-connecting-ip': '127.0.0.32' } },
  ),
  env: {},
})
assert.equal(noKeyResponse.status, 401)
assert.match(noKeyResponse.headers.get('www-authenticate') || '', /Vortx Enterprise/)

const detail = {
  signal: {
    id: '11111111-1111-4111-8111-111111111111',
    eventType: 'warn_notice',
    signalGroup: 'distress',
    entityName: 'Example Corp',
    ticker: 'EXMP',
    sourceUrl: 'https://source.example/filing',
    location: {
      label: 'Atlanta, Fulton County, GA',
      confidence: 'facility',
      precision: 'address',
      longitude: -84.388,
      latitude: 33.749,
    },
  },
}
const collection = buildEnterpriseMapFeatureCollection(
  [detail],
  { west: -125, south: 32, east: -114, north: 42 },
  {
    types: ['warn'],
    eventTypes: ['warn_notice'],
    query: '',
    crossOnly: false,
  },
)
assert.equal(collection.type, 'FeatureCollection')
assert.equal(collection.features.length, 1)
assert.equal(collection.features[0].properties.entityName, 'Example Corp')
assert.equal(collection.features[0].properties.sourceUrl, detail.signal.sourceUrl)
assert.deepEqual(collection.features[0].geometry.coordinates, [-84.388, 33.749])
assert.equal(collection.meta.tier, 'Enterprise')

console.log(
  JSON.stringify(
    {
      raw_key_stored: false,
      sha256_lookup: true,
      enterprise_key_allowed: true,
      professional_key_status: 403,
      revoked_key_status: 401,
      missing_key_status: noKeyResponse.status,
      full_geojson_fields: true,
    },
    null,
    2,
  ),
)
console.log('Enterprise map API auth QA OK')
