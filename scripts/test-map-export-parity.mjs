#!/usr/bin/env node
import assert from 'node:assert/strict'
import { onRequestGet, parseMapFilters } from '../frontend/functions/api/map-signals.js'
import {
  loadVisibleMapDetails,
  mapDetailsCsvResponse,
} from '../frontend/functions/api/map-signal-detail.js'
import { planCapabilities } from '../frontend/functions/lib/plan-capabilities.js'
import { readDevVars } from './lib/supabase-pg.mjs'

const env = readDevVars()
const bounds = { west: -125, south: 32, east: -114, north: 42 }
const url = new URL('https://vortxmkt.com/api/map/signals')
url.searchParams.set(
  'bounds',
  [bounds.west, bounds.south, bounds.east, bounds.north].join(','),
)
url.searchParams.set('types', 'warn')
url.searchParams.set('q', 'Modesto')
const request = new Request(url, {
  headers: { 'cf-connecting-ip': '127.0.0.41' },
})

const publicResponse = await onRequestGet({ request, env })
const publicPayload = await publicResponse.json()
assert.equal(publicResponse.status, 200)
const renderedIds = publicPayload.features.map((feature) => String(feature.id)).sort()
assert.ok(renderedIds.length > 0)

const enterpriseAccess = {
  isAuthenticated: true,
  isSubscriber: true,
  profile: {
    plan: 'galactic',
    role: 'customer',
    subscription_status: 'active',
  },
  capabilities: planCapabilities('galactic'),
  showFullNames: true,
  showSourceUrls: true,
  showSignalMeta: true,
  tierLabel: 'Enterprise · active',
}
const details = await loadVisibleMapDetails(
  env,
  bounds,
  parseMapFilters(url),
  enterpriseAccess,
)
const detailIds = details.map((detail) => String(detail.signal.id)).sort()
assert.deepEqual(detailIds, renderedIds)

const csvResponse = mapDetailsCsvResponse(details, 'vortx-visible-map.csv')
const csv = await csvResponse.text()
const csvIds = csv
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.match(/^"([^"]+)"/)?.[1] || '')
  .filter(Boolean)
  .sort()
assert.deepEqual(csvIds, renderedIds)

console.log(
  JSON.stringify(
    {
      active_filters: { types: ['warn'], q: 'Modesto', cross_only: false },
      rendered_points: renderedIds.length,
      hydrated_details: detailIds.length,
      csv_rows: csvIds.length,
      id_set_match: true,
    },
    null,
    2,
  ),
)
console.log('Filtered visible-map CSV parity QA OK')
