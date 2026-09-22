#!/usr/bin/env node
import assert from 'node:assert/strict'
import { connectSupabasePg } from './lib/supabase-pg.mjs'

function clean(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function postalCode(value) {
  return String(value || '').match(/\b\d{5}(?:-\d{4})?\b/)?.[0]?.slice(0, 5) || ''
}

function houseNumber(value) {
  return String(value || '').match(/^\s*(\d+[A-Z]?)\b/i)?.[1]?.toUpperCase() || ''
}

function filedAddressMatches(row) {
  if (row.geocoder === 'nominatim') {
    const city = clean(row.source_fields?.city)
    const country = clean(row.source_fields?.country)
    const matched = clean(row.matched_address)
    return Boolean((city && matched.includes(city)) || (country && matched.includes(country)))
  }
  if (row.geocoder_match_type === 'zcta_centroid') {
    const sourceZip = clean(row.source_fields?.zip).match(/\b\d{5}\b/)?.[0] || ''
    return Boolean(sourceZip && String(row.matched_address || '').includes(sourceZip))
  }
  if (row.geocoder_match_type === 'place_centroid') {
    const city = normalizedGeoName(row.source_fields?.city)
    return Boolean(city && normalizedGeoName(row.matched_address).includes(city))
  }
  if (row.geocoder_match_type === 'county_centroid') {
    const county = normalizedGeoName(row.source_fields?.county)
    return Boolean(county && normalizedGeoName(row.matched_address).includes(county))
  }
  const filed = clean(row.location_label)
  const matched = clean(row.matched_address)
  if (!filed || !matched) return false
  const filedZip = postalCode(filed)
  const matchedZip = postalCode(matched)
  const filedNumber = houseNumber(filed)
  const matchedNumber = houseNumber(matched)
  if (filedNumber && matchedNumber && filedNumber !== matchedNumber) return false
  const filedTokens = new Set(filed.split(' ').filter((token) => token.length > 2))
  const matchedTokens = matched.split(' ').filter((token) => token.length > 2)
  const tokenOverlap = matchedTokens.filter((token) => filedTokens.has(token)).length
  if (filedNumber && matchedNumber && filedNumber === matchedNumber && tokenOverlap >= 2) {
    return true
  }
  if (tokenOverlap >= 3) return true
  if (filedZip && matchedZip && filedZip !== matchedZip) return false
  return tokenOverlap >= 2
}

function normalizedGeoName(value) {
  return clean(value)
    .replace(
      /\s+(CITY|TOWN|VILLAGE|CDP|BOROUGH|MUNICIPALITY|COUNTY|PARISH|CITY AND BOROUGH|CENSUS AREA)$/i,
      '',
    )
    .replace(/[^A-Z0-9]/g, '')
}

const { sql, host } = await connectSupabasePg()
try {
  console.log(`Checking map geocodes via ${host}…`)

  const invalidResolved = await sql`
    select count(*)::int as count
    from public.map_signal_locations
    where geocoding_confidence <> 'unresolved'
      and (longitude is null or latitude is null)
  `
  const plottedUnresolved = await sql`
    select count(*)::int as count
    from public.map_signal_locations
    where geocoding_confidence = 'unresolved'
      and (longitude is not null or latitude is not null)
  `
  assert.equal(invalidResolved[0].count, 0, 'resolved rows must have coordinates')
  assert.equal(plottedUnresolved[0].count, 0, 'unresolved rows must never have coordinates')

  const stats = await sql`
    select
      count(*)::int as total,
      count(*) filter (where geocoding_confidence <> 'unresolved')::int as resolved,
      count(*) filter (where geocoding_confidence = 'unresolved')::int as unresolved
    from public.map_signal_locations
  `
  const byType = await sql`
    select
      event_type,
      count(*)::int as total,
      count(*) filter (where geocoding_confidence <> 'unresolved')::int as resolved,
      count(*) filter (where geocoding_confidence = 'unresolved')::int as unresolved
    from public.map_signal_locations
    group by event_type
    order by event_type
  `

  const samples = await sql`
    with ranked as (
      select
        event_id,
        event_type,
        signal_group,
        filing_date,
        longitude,
        latitude,
        location_label,
        matched_address,
        geocoder,
        geocoder_match_type,
        source_fields,
        geocoding_confidence,
        location_precision,
        row_number() over (
          partition by signal_group
          order by filing_date desc, event_id
        ) as group_rank
      from public.map_signal_locations
      where geocoding_confidence <> 'unresolved'
    )
    select *
    from ranked
    where group_rank <= 10
    order by signal_group, group_rank
  `
  assert.ok(samples.length >= 20, `expected at least 20 resolved QA rows; found ${samples.length}`)

  const qa = samples.slice(0, 20).map((row) => ({
    event_id: row.event_id,
    event_type: row.event_type,
    filing_date: row.filing_date,
    confidence: row.geocoding_confidence,
    precision: row.location_precision,
    geocoder_match_type: row.geocoder_match_type,
    filed_location: row.location_label,
    census_match: row.matched_address,
    longitude: Number(row.longitude),
    latitude: Number(row.latitude),
    address_match: filedAddressMatches(row),
  }))
  for (const row of qa) {
    assert.ok(Number.isFinite(row.longitude) && row.longitude >= -180 && row.longitude <= 180)
    assert.ok(Number.isFinite(row.latitude) && row.latitude >= -90 && row.latitude <= 90)
    assert.ok(row.address_match, `filed/Census address mismatch for ${row.event_id}`)
  }

  const unresolvedPercent = stats[0].total
    ? Number(((stats[0].unresolved / stats[0].total) * 100).toFixed(1))
    : 0
  console.log(
    JSON.stringify(
      {
        totals: { ...stats[0], unresolved_percent: unresolvedPercent },
        by_type: byType.map((row) => ({
          ...row,
          unresolved_percent: row.total
            ? Number(((row.unresolved / row.total) * 100).toFixed(1))
            : 0,
        })),
        qa_sample: qa,
      },
      null,
      2,
    ),
  )
  console.log('Map geocoding QA OK')
} finally {
  await sql.end({ timeout: 2 }).catch(() => undefined)
}
