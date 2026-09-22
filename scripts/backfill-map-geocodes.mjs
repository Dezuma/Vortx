#!/usr/bin/env node
/**
 * Cache map coordinates from filed WARN facilities and SEC issuer addresses.
 *
 * U.S. addresses use the Census geocoder. Foreign issuer HQs use Nominatim.
 * Never geocodes a reporting owner's home address. Unmatched rows are stored
 * as unresolved for manual review.
 */
import { connectSupabasePg, readDevVars } from './lib/supabase-pg.mjs'
import { unzipEntriesAsync } from '../frontend/functions/lib/warn-xlsx.js'
import {
  geocodeSource,
  locationFromSecAddresses,
} from '../frontend/functions/lib/map-geocode-providers.js'

const MAP_EVENT_TYPES = [
  'warn_notice',
  'bankruptcy_chapter_11',
  'bankruptcy_chapter_7',
  'bankruptcy_docket',
  'mechanics_lien',
  'form_4',
  'congress_trade',
]

const args = new Set(process.argv.slice(2))
const limitArg = process.argv.find((value) => value.startsWith('--limit='))
const limit = Math.min(5000, Math.max(1, Number(limitArg?.split('=')[1]) || 1500))
const force = args.has('--force')
const retryUnresolved = args.has('--retry-unresolved')
const dryRun = args.has('--dry-run')
const env = readDevVars()
const secUserAgent =
  String(env.SEC_USER_AGENT || '').trim() || 'Vortx Data LLC contact@vortxmkt.com'

function clean(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function payloadValue(payload, names) {
  if (!payload || typeof payload !== 'object') return ''
  for (const name of names) {
    if (payload[name] != null && clean(payload[name])) return clean(payload[name])
  }
  const normalized = new Map(
    Object.entries(payload).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ''),
      value,
    ]),
  )
  for (const name of names) {
    const value = normalized.get(name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    if (value != null && clean(value)) return clean(value)
  }
  return ''
}

function stateCode(value) {
  const text = clean(value).toUpperCase()
  const match = text.match(/(?:^|[-,\s])([A-Z]{2})(?:$|[-,\s])/)
  return match?.[1] || (/^[A-Z]{2}$/.test(text) ? text : '')
}

function tickerFrom(row) {
  return (
    payloadValue(row.payload, ['ticker', 'symbol', 'issuerTradingSymbol']) ||
    row.summary?.match(/\bTicker on record:\s*([A-Z][A-Z0-9.-]{0,7})\b/i)?.[1] ||
    row.title?.match(/\(([A-Z][A-Z0-9.-]{0,7})\)/)?.[1] ||
    ''
  )
    .toUpperCase()
    .trim()
}

function warnLocation(row) {
  const payload = row.payload || {}
  const address = payloadValue(payload, [
    'facility_address',
    'job_site_address',
    'impacted_site_address',
    'worksite_address',
    'street_address',
    'address',
    'Address',
  ])
  const city =
    payloadValue(payload, ['facility_city', 'job_site_city', 'city', 'city_name', 'City']) ||
    row.summary?.match(/Location:\s*(?:.*?\s{2})?([^,.]+),\s*[^.]*County,\s*[A-Z]{2}\./i)?.[1] ||
    ''
  const county = payloadValue(payload, [
    'facility_county',
    'job_site_county',
    'county_name',
    'county',
    'County',
    'Impacted Site County',
  ])
  const state =
    stateCode(payloadValue(payload, ['state', 'State'])) ||
    stateCode(row.jurisdiction) ||
    stateCode(row.summary)
  const zip =
    payloadValue(payload, ['zip', 'zipcode', 'zip_code', 'postal_code', 'Zip']) ||
    address.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] ||
    ''
  const label = clean(
    address ||
      [city, county, state].filter(Boolean).join(', ') ||
      row.jurisdiction,
  )
  if (!label) {
    return {
      confidence: 'unresolved',
      precision: 'unknown',
      label: '',
      query: '',
      sourceFields: { city, county, state, zip },
      reason: 'warn_location_missing',
    }
  }
  return {
    confidence: 'facility',
    precision: address ? 'address' : city ? 'city' : county ? 'county' : 'state',
    label,
    query: clean(address || [city, county, state, zip].filter(Boolean).join(', ')),
    sourceFields: { address, city, county, state, zip },
    reason: null,
  }
}

function entityAddressLocation(row) {
  const address = clean(row.primary_address)
  const zip = address.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] || ''
  if (!address) {
    return {
      confidence: 'unresolved',
      precision: 'unknown',
      label: clean(row.jurisdiction),
      query: '',
      sourceFields: {},
      reason: 'entity_address_missing',
    }
  }
  return {
    confidence: 'hq',
    precision: 'address',
    label: address,
    query: address,
    sourceFields: { address, zip },
    reason: null,
  }
}

async function fetchJson(url, { headers = {}, attempts = 3 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers })
      if (response.ok) return response.json()
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`http_${response.status}`)
      }
      lastError = new Error(`http_${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 350))
  }
  throw lastError || new Error('request_failed')
}

let companyTickerMapPromise
async function companyTickerMap() {
  if (!companyTickerMapPromise) {
    companyTickerMapPromise = fetchJson('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'user-agent': secUserAgent, accept: 'application/json' },
    }).then((payload) => {
      const map = new Map()
      for (const row of Object.values(payload || {})) {
        const ticker = clean(row?.ticker).toUpperCase()
        if (ticker && row?.cik_str) map.set(ticker, String(row.cik_str).padStart(10, '0'))
      }
      return map
    })
  }
  return companyTickerMapPromise
}

const secAddressCache = new Map()
async function secIssuerLocation(row) {
  let cik = payloadValue(row.payload, ['issuerCik', 'issuer_cik']).replace(/\D/g, '')
  const ticker = tickerFrom(row)
  if (!cik && ticker && ticker !== 'NONE') {
    const tickers = await companyTickerMap().catch(() => new Map())
    cik = tickers.get(ticker) || ''
  }
  if (!cik) {
    return {
      confidence: 'unresolved',
      precision: 'unknown',
      label: ticker || clean(row.jurisdiction),
      query: '',
      sourceFields: { ticker },
      reason: 'issuer_cik_missing',
    }
  }
  cik = cik.padStart(10, '0')
  if (!secAddressCache.has(cik)) {
    secAddressCache.set(
      cik,
      fetchJson(`https://data.sec.gov/submissions/CIK${cik}.json`, {
        headers: { 'user-agent': secUserAgent, accept: 'application/json' },
      }).catch((error) => ({ _error: error?.message || 'sec_address_fetch_failed' })),
    )
    await new Promise((resolve) => setTimeout(resolve, 110))
  }
  const filing = await secAddressCache.get(cik)
  if (filing?._error) {
    return {
      confidence: 'unresolved',
      precision: 'unknown',
      label: ticker,
      query: '',
      sourceFields: { ticker, issuer_cik: cik },
      reason: filing._error,
    }
  }
  return locationFromSecAddresses(filing, { ticker, cik })
}

let zctaCentroidPromise
let placeCentroidPromise
let countyCentroidPromise

function normalizedGeoName(value) {
  return clean(value)
    .toUpperCase()
    .replace(
      /\s+(CITY|TOWN|VILLAGE|CDP|BOROUGH|MUNICIPALITY|COUNTY|PARISH|CITY AND BOROUGH|CENSUS AREA)$/i,
      '',
    )
    .replace(/[^A-Z0-9]/g, '')
}

async function namedGazetteer(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': secUserAgent, accept: 'application/zip' },
  })
  if (!response.ok) throw new Error(`gazetteer_http_${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const entries = await unzipEntriesAsync(bytes)
  const map = new Map()
  for (const entry of entries.filter((row) => /\.txt$/i.test(row.name))) {
    const lines = new TextDecoder().decode(entry.data).split(/\r?\n/)
    const headerLine = String(lines.shift() || '')
    const delimiter = headerLine.includes('|') ? '|' : '\t'
    const headers = headerLine.split(delimiter).map((value) => value.trim())
    const stateIndex = headers.findIndex((value) => value === 'USPS')
    const nameIndex = headers.findIndex((value) => value === 'NAME')
    const latIndex = headers.findIndex((value) => value === 'INTPTLAT')
    const lngIndex = headers.findIndex((value) => value === 'INTPTLONG')
    if (stateIndex < 0 || nameIndex < 0 || latIndex < 0 || lngIndex < 0) continue
    for (const line of lines) {
      const cells = line.split(delimiter)
      const state = clean(cells[stateIndex]).toUpperCase()
      const name = clean(cells[nameIndex])
      const latitude = Number(cells[latIndex])
      const longitude = Number(cells[lngIndex])
      if (
        /^[A-Z]{2}$/.test(state) &&
        name &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ) {
        map.set(`${state}|${normalizedGeoName(name)}`, {
          latitude,
          longitude,
          name,
          state,
        })
      }
    }
  }
  return map
}

function placeCentroids() {
  if (!placeCentroidPromise) {
    placeCentroidPromise = namedGazetteer(
      'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip',
    )
  }
  return placeCentroidPromise
}

function countyCentroids() {
  if (!countyCentroidPromise) {
    countyCentroidPromise = namedGazetteer(
      'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_counties_national.zip',
    )
  }
  return countyCentroidPromise
}

async function zctaCentroids() {
  if (!zctaCentroidPromise) {
    zctaCentroidPromise = (async () => {
      const response = await fetch(
        'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_zcta_national.zip',
        { headers: { 'user-agent': secUserAgent, accept: 'application/zip' } },
      )
      if (!response.ok) throw new Error(`zcta_http_${response.status}`)
      const bytes = new Uint8Array(await response.arrayBuffer())
      const entries = await unzipEntriesAsync(bytes)
      const textEntry = entries.find((entry) => /\.txt$/i.test(entry.name))
      if (!textEntry) throw new Error('zcta_text_missing')
      const lines = new TextDecoder().decode(textEntry.data).split(/\r?\n/)
      const headerLine = String(lines.shift() || '')
      const delimiter = headerLine.includes('|') ? '|' : '\t'
      const headers = headerLine
        .split(delimiter)
        .map((value) => value.trim())
      const zipIndex = headers.findIndex((value) => value === 'GEOID')
      const latIndex = headers.findIndex((value) => value === 'INTPTLAT')
      const lngIndex = headers.findIndex((value) => value === 'INTPTLONG')
      if (zipIndex < 0 || latIndex < 0 || lngIndex < 0) {
        throw new Error('zcta_headers_invalid')
      }
      const map = new Map()
      for (const line of lines) {
        const cells = line.split(delimiter)
        const zip = clean(cells[zipIndex]).slice(0, 5)
        const latitude = Number(cells[latIndex])
        const longitude = Number(cells[lngIndex])
        if (
          /^\d{5}$/.test(zip) &&
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
        ) {
          map.set(zip, { latitude, longitude })
        }
      }
      return map
    })()
  }
  return zctaCentroidPromise
}

async function zctaFallback(source) {
  const zip = clean(source?.sourceFields?.zip).match(/\b\d{5}\b/)?.[0] || ''
  if (!zip) return null
  try {
    const map = await zctaCentroids()
    const point = map.get(zip)
    if (!point) return null
    return {
      longitude: point.longitude,
      latitude: point.latitude,
      matchedAddress: `Census ZCTA ${zip} internal point`,
      matchType: 'zcta_centroid',
    }
  } catch {
    return null
  }
}

async function namedPlaceFallback(source) {
  const state = clean(source?.sourceFields?.state).toUpperCase()
  const city = clean(source?.sourceFields?.city)
  const county = clean(source?.sourceFields?.county)
  if (!/^[A-Z]{2}$/.test(state)) return null
  try {
    if (city) {
      const places = await placeCentroids()
      const point = places.get(`${state}|${normalizedGeoName(city)}`)
      if (point) {
        return {
          longitude: point.longitude,
          latitude: point.latitude,
          matchedAddress: `${point.name}, ${state} Census place internal point`,
          matchType: 'place_centroid',
        }
      }
    }
    if (county) {
      const counties = await countyCentroids()
      const point = counties.get(`${state}|${normalizedGeoName(county)}`)
      if (point) {
        return {
          longitude: point.longitude,
          latitude: point.latitude,
          matchedAddress: `${point.name}, ${state} Census county internal point`,
          matchType: 'county_centroid',
        }
      }
    }
  } catch {
    return null
  }
  return null
}

function signalGroup(eventType) {
  return eventType === 'form_4' || eventType === 'congress_trade' ? 'trade' : 'distress'
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const output = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      output[index] = await mapper(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return output
}

async function resolveRow(row) {
  let source
  try {
    if (row.event_type === 'warn_notice') source = warnLocation(row)
    else if (row.event_type === 'form_4' || row.event_type === 'congress_trade') {
      source = await secIssuerLocation(row)
    } else {
      source = entityAddressLocation(row)
    }
  } catch (error) {
    source = {
      confidence: 'unresolved',
      precision: 'unknown',
      label: clean(row.jurisdiction),
      query: '',
      sourceFields: {},
      reason: error?.message || 'location_source_failed',
    }
  }

  let match = null
  let reason = source.reason
  let geocoder = 'unresolved'
  if (source.query && source.confidence !== 'unresolved') {
    try {
      match = await geocodeSource(source, secUserAgent)
      if (!match) {
        reason =
          source.geocodeWith === 'nominatim' ? 'nominatim_no_match' : 'census_no_match'
      }
    } catch (error) {
      reason =
        error?.message ||
        (source.geocodeWith === 'nominatim' ? 'nominatim_failed' : 'census_failed')
    }
    if (!match && source.geocodeWith !== 'nominatim') {
      match = await zctaFallback(source)
      if (match) reason = null
    }
    if (!match && source.geocodeWith !== 'nominatim') {
      match = await namedPlaceFallback(source)
      if (match) reason = null
    }
    if (source.geocodeWith !== 'nominatim') {
      await new Promise((resolve) => setTimeout(resolve, 80))
    }
  }

  const resolved = Boolean(match)
  if (resolved) {
    geocoder = match.geocoder || source.geocodeWith || 'census'
  }
  return {
    event_id: row.id,
    entity_id: row.entity_id,
    event_type: row.event_type,
    signal_group: signalGroup(row.event_type),
    filing_date: row.filing_date,
    longitude: resolved ? match.longitude : null,
    latitude: resolved ? match.latitude : null,
    location_label: source.label,
    geocoding_confidence: resolved ? source.confidence : 'unresolved',
    location_precision:
      resolved &&
        ['zcta_centroid', 'place_centroid', 'county_centroid'].includes(match.matchType)
        ? match.matchType === 'county_centroid'
          ? 'county'
          : 'city'
        : resolved
          ? match.precision || source.precision
          : 'unknown',
    geocoder,
    matched_address: resolved ? match.matchedAddress : null,
    geocoder_match_type: resolved ? match.matchType : null,
    review_reason: resolved ? null : reason || 'unresolved',
    source_fields: source.sourceFields,
    attempted_at: new Date(),
    geocoded_at: resolved ? new Date() : null,
    updated_at: new Date(),
  }
}

const { sql, host } = await connectSupabasePg(env)
try {
  console.log(
    `Loading map candidates via ${host} (limit ${limit}, force=${force}, retryUnresolved=${retryUnresolved})…`,
  )
  const rows = await sql`
    select
      le.id,
      le.entity_id,
      le.event_type,
      le.title,
      le.summary,
      le.jurisdiction,
      le.filing_date,
      e.primary_address,
      rr.payload
    from public.legal_events le
    join public.entities e on e.id = le.entity_id
    left join public.raw_records rr on rr.id = le.raw_record_id
    left join public.map_signal_locations msl on msl.event_id = le.id
    where le.event_type in ${sql(MAP_EVENT_TYPES)}
      and (
        ${force}
        or (${retryUnresolved} and (msl.event_id is null or msl.geocoding_confidence = 'unresolved'))
        or (${!force && !retryUnresolved} and msl.event_id is null)
      )
    order by le.filing_date desc, le.created_at desc
    limit ${limit}
  `

  console.log(`Resolving ${rows.length} map candidates…`)
  const resolvedRows = await mapWithConcurrency(rows, 3, resolveRow)
  const resolvedCount = resolvedRows.filter(
    (row) => row.geocoding_confidence !== 'unresolved',
  ).length

  if (!dryRun && resolvedRows.length) {
    const columns = [
      'event_id',
      'entity_id',
      'event_type',
      'signal_group',
      'filing_date',
      'longitude',
      'latitude',
      'location_label',
      'geocoding_confidence',
      'location_precision',
      'geocoder',
      'matched_address',
      'geocoder_match_type',
      'review_reason',
      'source_fields',
      'attempted_at',
      'geocoded_at',
      'updated_at',
    ]
    for (let index = 0; index < resolvedRows.length; index += 100) {
      const batch = resolvedRows.slice(index, index + 100)
      await sql`
        insert into public.map_signal_locations ${sql(batch, columns)}
        on conflict (event_id) do update set
          entity_id = excluded.entity_id,
          event_type = excluded.event_type,
          signal_group = excluded.signal_group,
          filing_date = excluded.filing_date,
          longitude = excluded.longitude,
          latitude = excluded.latitude,
          location_label = excluded.location_label,
          geocoding_confidence = excluded.geocoding_confidence,
          location_precision = excluded.location_precision,
          geocoder = excluded.geocoder,
          matched_address = excluded.matched_address,
          geocoder_match_type = excluded.geocoder_match_type,
          review_reason = excluded.review_reason,
          source_fields = excluded.source_fields,
          attempted_at = excluded.attempted_at,
          geocoded_at = excluded.geocoded_at,
          updated_at = excluded.updated_at
      `
    }
  }

  const stats = dryRun
    ? {
        total: resolvedRows.length,
        resolved: resolvedCount,
        unresolved: resolvedRows.length - resolvedCount,
      }
    : (
        await sql`
          select
            count(*)::int as total,
            count(*) filter (where geocoding_confidence <> 'unresolved')::int as resolved,
            count(*) filter (where geocoding_confidence = 'unresolved')::int as unresolved
          from public.map_signal_locations
        `
      )[0]
  const unresolvedPercent = stats.total
    ? Number(((stats.unresolved / stats.total) * 100).toFixed(1))
    : 0
  console.log(
    JSON.stringify(
      {
        dry_run: dryRun,
        processed: resolvedRows.length,
        ...stats,
        unresolved_percent: unresolvedPercent,
      },
      null,
      2,
    ),
  )
} finally {
  await sql.end({ timeout: 2 }).catch(() => undefined)
}
