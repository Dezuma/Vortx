/**
 * Worker-safe incremental map geocoding.
 *
 * NOTE: Full centroid recovery and manual QA stay in scripts/backfill-map-geocodes.mjs.
 * This job handles new address-level filings after each production cron.
 */
import { supabaseRestByIds } from './supabase-rest.js'
import {
  clean,
  geocodeSource,
  locationFromSecAddresses,
} from './map-geocode-providers.js'

const MAP_EVENT_TYPES = [
  'warn_notice',
  'bankruptcy_chapter_11',
  'bankruptcy_chapter_7',
  'bankruptcy_docket',
  'mechanics_lien',
  'form_4',
  'congress_trade',
]

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
  const city = payloadValue(payload, [
    'facility_city',
    'job_site_city',
    'city',
    'city_name',
    'City',
  ])
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
  const label = clean(address || [city, county, state].filter(Boolean).join(', '))
  return {
    confidence: label ? 'facility' : 'unresolved',
    precision: address ? 'address' : city ? 'city' : county ? 'county' : 'unknown',
    label,
    query: address,
    sourceFields: { address, city, county, state, zip },
    reason: label ? (address ? null : 'centroid_backfill_required') : 'warn_location_missing',
  }
}

function entityLocation(row) {
  const address = clean(row.primary_address)
  return {
    confidence: address ? 'hq' : 'unresolved',
    precision: address ? 'address' : 'unknown',
    label: address || clean(row.jurisdiction),
    query: address,
    sourceFields: { address, zip: address.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] || '' },
    reason: address ? null : 'entity_address_missing',
  }
}

async function fetchJson(url, headers, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers })
      if (response.ok) return response.json()
      lastError = new Error(`http_${response.status}`)
      if (response.status !== 429 && response.status < 500) break
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 300))
  }
  throw lastError || new Error('request_failed')
}

let companyTickerMapPromise
async function companyTickerMap(secUserAgent) {
  if (!companyTickerMapPromise) {
    companyTickerMapPromise = fetchJson(
      'https://www.sec.gov/files/company_tickers.json',
      { 'user-agent': secUserAgent, accept: 'application/json' },
    ).then((payload) => {
      const map = new Map()
      for (const row of Object.values(payload || {})) {
        const ticker = clean(row?.ticker).toUpperCase()
        if (ticker && row?.cik_str) {
          map.set(ticker, String(row.cik_str).padStart(10, '0'))
        }
      }
      return map
    })
  }
  return companyTickerMapPromise
}

async function secLocation(row, secUserAgent, cache) {
  let cik = payloadValue(row.payload, ['issuerCik', 'issuer_cik']).replace(/\D/g, '')
  const ticker = (
    payloadValue(row.payload, ['ticker', 'symbol', 'issuerTradingSymbol']) ||
    row.summary?.match(/\bTicker on record:\s*([A-Z][A-Z0-9.-]{0,7})\b/i)?.[1] ||
    ''
  )
    .toUpperCase()
    .trim()
  if (!cik && ticker && ticker !== 'NONE') {
    const tickers = await companyTickerMap(secUserAgent).catch(() => new Map())
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
  if (!cache.has(cik)) {
    cache.set(
      cik,
      fetchJson(
        `https://data.sec.gov/submissions/CIK${cik}.json`,
        { 'user-agent': secUserAgent, accept: 'application/json' },
      ).catch((error) => ({ _error: error?.message || 'sec_address_fetch_failed' })),
    )
  }
  const filing = await cache.get(cik)
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

function signalGroup(eventType) {
  return eventType === 'form_4' || eventType === 'congress_trade' ? 'trade' : 'distress'
}

/**
 * Geocode recent map-eligible events that do not have a cache/review row yet.
 * Also retries unresolved Form 4 issuer addresses, including foreign HQs.
 */
export async function runMapGeocodingJob(
  env,
  supabaseRest,
  { maxEvents = 60, dryRun = false } = {},
) {
  const result = { ok: true, scanned: 0, processed: 0, resolved: 0, unresolved: 0, errors: [] }
  const limit = Math.min(100, Math.max(1, Number(maxEvents) || 60))
  const retryLimit = Math.min(25, Math.max(5, Math.floor(limit / 3)))
  const rawEventRows = await supabaseRest(
    env,
    `legal_events?select=id,entity_id,raw_record_id,event_type,title,summary,jurisdiction,filing_date&event_type=in.(${MAP_EVENT_TYPES.join(',')})&order=filing_date.desc,created_at.desc&limit=${limit}`,
  ).catch((error) => {
    result.ok = false
    result.errors.push(error instanceof Error ? error.message : String(error))
    return []
  })
  const eventRows = Array.isArray(rawEventRows) ? rawEventRows : []
  result.scanned = eventRows.length

  const eventIds = eventRows.map((row) => row.id)
  const existing = eventIds.length
    ? await supabaseRestByIds(env, {
        table: 'map_signal_locations',
        select: 'event_id',
        ids: eventIds,
        idColumn: 'event_id',
      }).catch(() => [])
    : []
  const existingIds = new Set((existing || []).map((row) => row.event_id))
  const pending = eventRows.filter((row) => !existingIds.has(row.id))

  const retryLocations = await supabaseRest(
    env,
    `map_signal_locations?select=event_id&geocoding_confidence=eq.unresolved&event_type=eq.form_4&review_reason=in.(issuer_address_non_us,issuer_address_missing,census_no_match)&order=attempted_at.asc&limit=${retryLimit}`,
  ).catch(() => [])
  const retryIds = (Array.isArray(retryLocations) ? retryLocations : [])
    .map((row) => row.event_id)
    .filter((id) => id && !pending.some((row) => row.id === id))
  const retryEvents = retryIds.length
    ? await supabaseRestByIds(env, {
        table: 'legal_events',
        select: 'id,entity_id,raw_record_id,event_type,title,summary,jurisdiction,filing_date',
        ids: retryIds,
      }).catch(() => [])
    : []
  pending.push(...(retryEvents || []))
  if (!pending.length) return result

  const [rawRows, entityRows] = await Promise.all([
    supabaseRestByIds(env, {
      table: 'raw_records',
      select: 'id,payload',
      ids: pending.map((row) => row.raw_record_id).filter(Boolean),
    }).catch(() => []),
    supabaseRestByIds(env, {
      table: 'entities',
      select: 'id,primary_address',
      ids: pending.map((row) => row.entity_id).filter(Boolean),
    }).catch(() => []),
  ])
  const rawById = new Map((rawRows || []).map((row) => [row.id, row.payload]))
  const entityById = new Map((entityRows || []).map((row) => [row.id, row]))
  const secCache = new Map()
  const userAgent =
    String(env.SEC_USER_AGENT || '').trim() || 'Vortx Data LLC contact@vortxmkt.com'
  const output = []

  for (const event of pending) {
    const row = {
      ...event,
      payload: rawById.get(event.raw_record_id) || {},
      primary_address: entityById.get(event.entity_id)?.primary_address || null,
    }
    let source
    try {
      if (row.event_type === 'warn_notice') source = warnLocation(row)
      else if (row.event_type === 'form_4' || row.event_type === 'congress_trade') {
        source = await secLocation(row, userAgent, secCache)
      } else {
        source = entityLocation(row)
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
    if (source.query && source.confidence !== 'unresolved') {
      try {
        match = await geocodeSource(source, userAgent)
      } catch (error) {
        source.reason =
          error?.message ||
          (source.geocodeWith === 'nominatim' ? 'nominatim_failed' : 'census_failed')
      }
    }
    const resolved = Boolean(match)
    const now = new Date().toISOString()
    output.push({
      event_id: row.id,
      entity_id: row.entity_id,
      event_type: row.event_type,
      signal_group: signalGroup(row.event_type),
      filing_date: row.filing_date,
      longitude: resolved ? match.longitude : null,
      latitude: resolved ? match.latitude : null,
      location_label: source.label,
      geocoding_confidence: resolved ? source.confidence : 'unresolved',
      location_precision: resolved
        ? match.precision || source.precision
        : 'unknown',
      geocoder: resolved ? match.geocoder || source.geocodeWith || 'census' : 'unresolved',
      matched_address: resolved ? match.matchedAddress : null,
      geocoder_match_type: resolved ? match.matchType : null,
      review_reason: resolved
        ? null
        : source.reason ||
          (source.query
            ? source.geocodeWith === 'nominatim'
              ? 'nominatim_no_match'
              : 'census_no_match'
            : 'unresolved'),
      source_fields: source.sourceFields,
      attempted_at: now,
      geocoded_at: resolved ? now : null,
      updated_at: now,
    })
    if (resolved) result.resolved += 1
    else result.unresolved += 1
  }

  result.processed = output.length
  if (!dryRun && output.length) {
    await supabaseRest(env, 'map_signal_locations', {
      method: 'POST',
      headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(output),
    }).catch((error) => {
      result.ok = false
      result.errors.push(error instanceof Error ? error.message : String(error))
    })
  }
  return result
}
