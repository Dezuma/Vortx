#!/usr/bin/env node
import assert from 'node:assert/strict'
import { connectSupabasePg } from './lib/supabase-pg.mjs'

const { sql } = await connectSupabasePg()
let inTransaction = false
try {
  await sql.unsafe('begin')
  inTransaction = true
  await sql`
    create temporary table map_perf_fixture (
      id bigint primary key,
      event_type text not null,
      longitude double precision not null,
      latitude double precision not null,
      geocoding_confidence text not null
    ) on commit drop
  `
  await sql`
    insert into map_perf_fixture (
      id,
      event_type,
      longitude,
      latitude,
      geocoding_confidence
    )
    select
      value,
      case value % 5
        when 0 then 'warn_notice'
        when 1 then 'bankruptcy_docket'
        when 2 then 'mechanics_lien'
        when 3 then 'form_4'
        else 'congress_trade'
      end,
      -169.5 + ((value * 37) % 10900) / 100.0,
      15.2 + ((value * 17) % 5600) / 100.0,
      'facility'
    from generate_series(1, 11500) value
  `
  await sql`
    create index map_perf_fixture_type_bounds_idx
      on map_perf_fixture (event_type, longitude, latitude)
      where geocoding_confidence <> 'unresolved'
  `
  await sql`analyze map_perf_fixture`
  const explain = await sql`
    explain (analyze, buffers, format json)
    select id, event_type, longitude, latitude
    from map_perf_fixture
    where geocoding_confidence <> 'unresolved'
      and event_type in ('warn_notice', 'form_4')
      and longitude between -125 and -66
      and latitude between 24 and 49
    limit 2000
  `
  const plan = explain[0]['QUERY PLAN'][0]
  const executionMs = Number(plan['Execution Time'])
  assert.ok(Number.isFinite(executionMs))
  assert.ok(executionMs < 100, `11,500-row bounds query took ${executionMs}ms`)
  await sql.unsafe('rollback')
  inTransaction = false

  const regions = [
    [-125, 32, -114, 42],
    [-124, 42, -116, 49],
    [-112, 31, -102, 42],
    [-106, 25, -93, 37],
    [-97, 37, -82, 49],
    [-91, 29, -75, 42],
    [-83, 24, -66, 48],
    [-170, 50, -130, 72],
  ]
  const latencies = []
  const counts = []
  for (const bounds of regions) {
    const started = performance.now()
    const response = await fetch(
      `https://vortxmkt.com/api/map/signals?bounds=${bounds.join(',')}`,
    )
    const payload = await response.json()
    latencies.push(performance.now() - started)
    assert.equal(response.status, 200)
    assert.ok(payload.features.length <= 2000)
    for (const feature of payload.features) {
      const [longitude, latitude] = feature.geometry.coordinates
      assert.ok(longitude >= bounds[0] && longitude <= bounds[2])
      assert.ok(latitude >= bounds[1] && latitude <= bounds[3])
    }
    counts.push(payload.features.length)
  }
  const sorted = [...latencies].sort((a, b) => a - b)
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
  assert.ok(p95 < 5000, `live viewport p95 was ${p95.toFixed(1)}ms`)

  console.log(
    JSON.stringify(
      {
        synthetic_rows: 11500,
        synthetic_bounds_execution_ms: executionMs,
        live_regions: regions.length,
        live_point_counts: counts,
        live_latency_p95_ms: Number(p95.toFixed(1)),
        offscreen_points: 0,
        max_points_per_response: Math.max(...counts),
      },
      null,
      2,
    ),
  )
  console.log('Map performance QA OK')
} finally {
  if (inTransaction) await sql.unsafe('rollback').catch(() => undefined)
  await sql.end({ timeout: 2 }).catch(() => undefined)
}
