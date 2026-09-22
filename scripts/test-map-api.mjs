#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  onRequestGet,
  searchBlobByEventId,
} from '../frontend/functions/api/map-signals.js'
import { readDevVars } from './lib/supabase-pg.mjs'
import { supabaseRest } from '../frontend/functions/lib/supabase-rest.js'

const env = readDevVars()

async function request(bounds, params = {}) {
  const query = new URLSearchParams()
  if (bounds) query.set('bounds', bounds.join(','))
  for (const [key, value] of Object.entries(params)) query.set(key, String(value))
  const suffix = query.size ? `?${query.toString()}` : ''
  const response = await onRequestGet({
    request: new Request(`https://vortxmkt.com/api/map/signals${suffix}`, {
      headers: { 'cf-connecting-ip': '127.0.0.1' },
    }),
    env,
  })
  return { response, payload: await response.json() }
}

const missing = await request()
assert.equal(missing.response.status, 400)
assert.equal(missing.payload.error, 'valid_bounds_required')

const reversedLat = await request([-125, 42, -114, 32])
assert.equal(reversedLat.response.status, 400)

const world = await request([-180, -85, 180, 85])
assert.equal(world.response.status, 200)
assert.equal(world.payload.type, 'FeatureCollection')
assert.ok(Array.isArray(world.payload.features))

const europe = await request([0, 35, 20, 55])
const asia = await request([100, 15, 130, 45])
const middleEast = await request([32, 29, 38, 35])
assert.equal(europe.response.status, 200)
assert.equal(asia.response.status, 200)
assert.equal(middleEast.response.status, 200)

const westBounds = [-125, 32, -114, 42]
const eastBounds = [-83, 24, -66, 48]
const west = await request(westBounds)
const east = await request(eastBounds)
assert.equal(west.response.status, 200)
assert.equal(east.response.status, 200)
assert.equal(west.payload.type, 'FeatureCollection')
assert.equal(east.payload.type, 'FeatureCollection')
assert.ok(west.payload.features.length > 0, 'expected western viewport signals')
assert.ok(east.payload.features.length > 0, 'expected eastern viewport signals')

function inside(feature, [west, south, east, north]) {
  const [longitude, latitude] = feature.geometry.coordinates
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north
}

for (const feature of west.payload.features) {
  assert.ok(inside(feature, westBounds), `western response leaked off-screen point ${feature.id}`)
}
for (const feature of east.payload.features) {
  assert.ok(inside(feature, eastBounds), `eastern response leaked off-screen point ${feature.id}`)
}

const forbiddenPropertyNames = [
  'entityName',
  'entity_name',
  'sourceUrl',
  'source_url',
  'locationLabel',
  'matchedAddress',
]
for (const feature of [...west.payload.features, ...east.payload.features]) {
  for (const property of forbiddenPropertyNames) {
    assert.equal(
      Object.hasOwn(feature.properties || {}, property),
      false,
      `Phase 1 API exposed ${property}`,
    )
  }
}

const westIds = new Set(west.payload.features.map((feature) => feature.id))
const eastIds = new Set(east.payload.features.map((feature) => feature.id))
const overlap = [...westIds].filter((id) => eastIds.has(id))
assert.equal(overlap.length, 0, 'disjoint viewport responses should not overlap')

const warnOnly = await request(westBounds, { types: 'warn' })
assert.ok(warnOnly.payload.features.length > 0)
assert.ok(
  warnOnly.payload.features.every(
    (feature) =>
      feature.properties.eventType === 'warn_notice' ||
      feature.properties.signalGroup === 'cross',
  ),
)
const form4Only = await request(westBounds, { types: 'form4' })
assert.ok(form4Only.payload.features.length > 0)
assert.ok(
  form4Only.payload.features.every(
    (feature) =>
      feature.properties.eventType === 'form_4' ||
      feature.properties.signalGroup === 'cross',
  ),
)
const crossOnly = await request(westBounds, { cross_only: '1' })
assert.ok(
  crossOnly.payload.features.every(
    (feature) => feature.properties.signalGroup === 'cross',
  ),
)

const searchableFeature = west.payload.features.find(
  (feature) => feature.properties.signalGroup !== 'cross',
)
const searchableEvents = await supabaseRest(
  env,
  `legal_events?select=id,entity_id&id=eq.${encodeURIComponent(searchableFeature.id)}&limit=1`,
)
const searchableEntities = await supabaseRest(
  env,
  `entities?select=canonical_name&id=eq.${encodeURIComponent(searchableEvents[0].entity_id)}&limit=1`,
)
const searched = await request(westBounds, {
  q: searchableEntities[0].canonical_name,
})
assert.equal(
  searched.payload.features.some((feature) => feature.id === searchableFeature.id),
  false,
  'guest entity search must not act as a name-to-location oracle',
)
const [guestBlobs, subscriberBlobs] = await Promise.all([
  searchBlobByEventId(env, [searchableFeature.id], { includeEntityText: false }),
  searchBlobByEventId(env, [searchableFeature.id], { includeEntityText: true }),
])
const escapedEntityName = searchableEntities[0].canonical_name.replace(
  /[.*+?^${}()|[\]\\]/g,
  '\\$&',
)
assert.doesNotMatch(
  guestBlobs.get(searchableFeature.id) || '',
  new RegExp(escapedEntityName, 'i'),
)
assert.match(
  subscriberBlobs.get(searchableFeature.id) || '',
  new RegExp(escapedEntityName, 'i'),
)
const noSearchResults = await request(westBounds, {
  q: 'definitely-not-a-real-vortx-entity-zzzz',
})
assert.equal(noSearchResults.payload.features.length, 0)

console.log(
  JSON.stringify(
    {
      west_viewport_points: west.payload.features.length,
      east_viewport_points: east.payload.features.length,
      missing_bounds_status: missing.response.status,
      reversed_lat_status: reversedLat.response.status,
      world_bounds_status: world.response.status,
      world_viewport_points: world.payload.features.length,
      europe_bounds_status: europe.response.status,
      asia_bounds_status: asia.response.status,
      middle_east_bounds_status: middleEast.response.status,
      offscreen_points: 0,
      sensitive_properties_exposed: 0,
      warn_filter_points: warnOnly.payload.features.length,
      form4_filter_points: form4Only.payload.features.length,
      cross_only_points: crossOnly.payload.features.length,
      guest_entity_search_leak: false,
      subscriber_entity_search_match: true,
      empty_search_points: noSearchResults.payload.features.length,
    },
    null,
    2,
  ),
)
console.log('Map bounds API QA OK')
