/**
 * Allowlisted geocoders for map pins.
 *
 * Census covers U.S. addresses. Nominatim covers foreign SEC issuer
 * business/mailing addresses. Never geocode a reporting owner's home address.
 */
const CENSUS_ORIGIN = 'https://geocoding.geo.census.gov'
const NOMINATIM_ORIGIN = 'https://nominatim.openstreetmap.org'
const NOMINATIM_GAP_MS = 1100

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID',
  'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO',
  'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA',
  'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'PR',
  'GU', 'VI', 'AS', 'MP',
])

const US_STATE_NAMES = new Set([
  'ALABAMA', 'ALASKA', 'ARIZONA', 'ARKANSAS', 'CALIFORNIA', 'COLORADO',
  'CONNECTICUT', 'DELAWARE', 'DISTRICT OF COLUMBIA', 'FLORIDA', 'GEORGIA',
  'HAWAII', 'IDAHO', 'ILLINOIS', 'INDIANA', 'IOWA', 'KANSAS', 'KENTUCKY',
  'LOUISIANA', 'MAINE', 'MARYLAND', 'MASSACHUSETTS', 'MICHIGAN', 'MINNESOTA',
  'MISSISSIPPI', 'MISSOURI', 'MONTANA', 'NEBRASKA', 'NEVADA', 'NEW HAMPSHIRE',
  'NEW JERSEY', 'NEW MEXICO', 'NEW YORK', 'NORTH CAROLINA', 'NORTH DAKOTA',
  'OHIO', 'OKLAHOMA', 'OREGON', 'PENNSYLVANIA', 'RHODE ISLAND', 'SOUTH CAROLINA',
  'SOUTH DAKOTA', 'TENNESSEE', 'TEXAS', 'UTAH', 'VERMONT', 'VIRGINIA',
  'WASHINGTON', 'WEST VIRGINIA', 'WISCONSIN', 'WYOMING', 'PUERTO RICO', 'GUAM',
  'VIRGIN ISLANDS', 'AMERICAN SAMOA', 'NORTHERN MARIANA ISLANDS',
])

const COUNTRY_NAMES = {
  AE: 'United Arab Emirates',
  AR: 'Argentina',
  AT: 'Austria',
  AU: 'Australia',
  BE: 'Belgium',
  BM: 'Bermuda',
  BR: 'Brazil',
  BS: 'Bahamas',
  CA: 'Canada',
  CH: 'Switzerland',
  CL: 'Chile',
  CN: 'China',
  CO: 'Colombia',
  CY: 'Cyprus',
  CZ: 'Czechia',
  DE: 'Germany',
  DK: 'Denmark',
  ES: 'Spain',
  FI: 'Finland',
  FR: 'France',
  GB: 'United Kingdom',
  GG: 'Guernsey',
  GR: 'Greece',
  HK: 'Hong Kong',
  HU: 'Hungary',
  IE: 'Ireland',
  IL: 'Israel',
  IN: 'India',
  IT: 'Italy',
  JE: 'Jersey',
  JP: 'Japan',
  KR: 'South Korea',
  KY: 'Cayman Islands',
  LU: 'Luxembourg',
  MX: 'Mexico',
  MY: 'Malaysia',
  NL: 'Netherlands',
  NO: 'Norway',
  NZ: 'New Zealand',
  PL: 'Poland',
  PT: 'Portugal',
  QA: 'Qatar',
  SE: 'Sweden',
  SG: 'Singapore',
  TH: 'Thailand',
  TW: 'Taiwan',
  UK: 'United Kingdom',
  VG: 'British Virgin Islands',
  ZA: 'South Africa',
}

export function clean(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isUsAddress(stateOrCountry, description, zip) {
  const desc = clean(description).toUpperCase()
  const code = clean(stateOrCountry).toUpperCase()
  const usZip = /^\d{5}(?:-\d{4})?$/.test(clean(zip))
  if (desc) {
    if (
      US_STATE_NAMES.has(desc) ||
      desc === 'USA' ||
      desc === 'US' ||
      desc.startsWith('UNITED STATES')
    ) {
      return true
    }
    if (US_STATE_CODES.has(desc) && (desc === code || usZip)) return true
    return false
  }
  if (usZip && US_STATE_CODES.has(code)) return true
  if (/^[A-Z]{2}$/.test(code) && !US_STATE_CODES.has(code)) return false
  if (US_STATE_CODES.has(code)) return true
  return false
}

export function isoCountryCode(stateOrCountry) {
  const code = clean(stateOrCountry).toUpperCase()
  if (code === 'UK') return 'GB'
  if (/^[A-Z]{2}$/.test(code)) return code
  return ''
}

export function countryName(code) {
  const normalized = isoCountryCode(code)
  return COUNTRY_NAMES[normalized] || COUNTRY_NAMES[clean(code).toUpperCase()] || ''
}

export function censusGeocodeUrl(query) {
  const url = new URL('/geocoder/locations/onelineaddress', CENSUS_ORIGIN)
  url.searchParams.set('address', clean(query).slice(0, 200))
  url.searchParams.set('benchmark', 'Public_AR_Current')
  url.searchParams.set('format', 'json')
  return url
}

export function nominatimSearchUrl(query, countrycodes = '') {
  const url = new URL('/search', NOMINATIM_ORIGIN)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('q', clean(query).slice(0, 200))
  const codes = clean(countrycodes)
    .toLowerCase()
    .split(',')
    .map((part) => (part === 'uk' ? 'gb' : part))
    .filter((part) => /^[a-z]{2}$/.test(part))
    .slice(0, 4)
    .join(',')
  if (codes) url.searchParams.set('countrycodes', codes)
  return url
}

function precisionFromNominatim(hit) {
  const type = clean(hit?.addresstype || hit?.type).toLowerCase()
  if (['house', 'building', 'road', 'residential', 'hamlet'].includes(type)) {
    return 'address'
  }
  if (
    [
      'city',
      'town',
      'village',
      'municipality',
      'suburb',
      'neighbourhood',
      'quarter',
      'postcode',
    ].includes(type)
  ) {
    return 'city'
  }
  if (['county', 'state_district'].includes(type)) return 'county'
  if (['state', 'province', 'region'].includes(type)) return 'state'
  if (type === 'country') return 'country'
  return 'city'
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
    await new Promise((resolve) => setTimeout(resolve, attempt * 350))
  }
  throw lastError || new Error('request_failed')
}

export async function censusGeocode(query, userAgent) {
  if (!clean(query)) return null
  const payload = await fetchJson(censusGeocodeUrl(query), {
    accept: 'application/json',
    'user-agent': userAgent,
  })
  const match = payload?.result?.addressMatches?.[0]
  const longitude = Number(match?.coordinates?.x)
  const latitude = Number(match?.coordinates?.y)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
  return {
    longitude,
    latitude,
    matchedAddress: clean(match?.matchedAddress),
    matchType: clean(match?.tigerLine?.side || 'address_match'),
    precision: 'address',
    geocoder: 'census',
  }
}

let nominatimChain = Promise.resolve()

function enqueueNominatim(task) {
  const run = nominatimChain.then(task, task)
  nominatimChain = run.then(
    () => new Promise((resolve) => setTimeout(resolve, NOMINATIM_GAP_MS)),
    () => new Promise((resolve) => setTimeout(resolve, NOMINATIM_GAP_MS)),
  )
  return run
}

export async function nominatimGeocode(query, { userAgent, countrycodes = '' } = {}) {
  if (!clean(query)) return null
  return enqueueNominatim(async () => {
    const payload = await fetchJson(nominatimSearchUrl(query, countrycodes), {
      accept: 'application/json',
      'user-agent': userAgent,
      from: 'contact@vortxmkt.com',
    })
    const hit = Array.isArray(payload) ? payload[0] : null
    const longitude = Number(hit?.lon)
    const latitude = Number(hit?.lat)
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
    return {
      longitude,
      latitude,
      matchedAddress: clean(hit?.display_name),
      matchType: clean(hit?.addresstype || hit?.type || 'nominatim_match'),
      precision: precisionFromNominatim(hit),
      geocoder: 'nominatim',
    }
  })
}

export async function geocodeSource(source, userAgent) {
  if (!source?.query || source.confidence === 'unresolved') return null
  if (source.geocodeWith === 'nominatim') {
    const country = clean(source.sourceFields?.country_code)
    const full = await nominatimGeocode(source.query, {
      userAgent,
      countrycodes: country,
    })
    if (full) return full
    const city = clean(source.sourceFields?.city)
    const countryNameValue =
      clean(source.sourceFields?.country) || countryName(country)
    if (city && countryNameValue) {
      const cityMatch = await nominatimGeocode(`${city}, ${countryNameValue}`, {
        userAgent,
        countrycodes: country,
      })
      if (cityMatch) return cityMatch
    }
    if (countryNameValue) {
      return nominatimGeocode(countryNameValue, {
        userAgent,
        countrycodes: country,
      })
    }
    return null
  }
  return censusGeocode(source.query, userAgent)
}

export function locationFromSecAddresses(filing, { ticker = '', cik = '' } = {}) {
  const business = filing?.addresses?.business
  const mailing = filing?.addresses?.mailing
  const selected = business?.street1 && business?.city ? business : mailing
  const selectedText = [selected?.street1, selected?.street2].map(clean).join(' ')
  const looksLikeAgent = /\b(?:C\/O|REGISTERED AGENT|CORPORATION TRUST|CSC)\b/i.test(
    selectedText,
  )
  const confidence =
    selected === business && !looksLikeAgent ? 'hq' : 'registered_agent'
  const region = clean(selected?.stateOrCountry)
  const description = clean(selected?.stateOrCountryDescription)
  const zip = clean(selected?.zipCode)
  const city = clean(selected?.city)
  const street = [selected?.street1, selected?.street2].map(clean).filter(Boolean).join(', ')
  const baseFields = { ticker, issuer_cik: cik, zip, city }

  if (!selected || (!street && !city)) {
    return {
      confidence: 'unresolved',
      precision: 'unknown',
      label: ticker,
      query: '',
      sourceFields: baseFields,
      geocodeWith: null,
      reason: 'issuer_address_missing',
    }
  }

  if (isUsAddress(region, description, zip)) {
    const state = clean(region).toUpperCase()
    const address = [street, city, state, zip].filter(Boolean).join(', ')
    if (!address || !/^[A-Z]{2}$/.test(state)) {
      return {
        confidence: 'unresolved',
        precision: 'unknown',
        label: address || ticker,
        query: '',
        sourceFields: { ...baseFields, state },
        geocodeWith: null,
        reason: address ? 'issuer_address_incomplete' : 'issuer_address_missing',
      }
    }
    return {
      confidence,
      precision: 'address',
      label: address,
      query: address,
      sourceFields: { ...baseFields, state },
      geocodeWith: 'census',
      reason: null,
    }
  }

  const countryCode = isoCountryCode(region)
  const country = description || countryName(countryCode) || region
  const address = [street, city, zip, country].filter(Boolean).join(', ')
  if (!city && !country) {
    return {
      confidence: 'unresolved',
      precision: 'unknown',
      label: ticker,
      query: '',
      sourceFields: baseFields,
      geocodeWith: null,
      reason: 'issuer_address_missing',
    }
  }
  return {
    confidence,
    precision: street ? 'address' : 'city',
    label: address || ticker,
    query: address,
    sourceFields: {
      ...baseFields,
      country,
      country_code: countryCode,
    },
    geocodeWith: 'nominatim',
    reason: null,
  }
}
