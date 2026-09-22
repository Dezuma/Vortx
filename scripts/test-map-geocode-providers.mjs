#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  isUsAddress,
  isoCountryCode,
  countryName,
  censusGeocodeUrl,
  nominatimSearchUrl,
  locationFromSecAddresses,
} from '../frontend/functions/lib/map-geocode-providers.js'

assert.equal(isUsAddress('CA', 'CA', '94105'), true)
assert.equal(isUsAddress('IL', 'ILLINOIS', ''), true)
assert.equal(isUsAddress('IL', 'ISRAEL', ''), false)
assert.equal(isUsAddress('CA', 'CALIFORNIA', '94105'), true)
assert.equal(isUsAddress('CA', 'CANADA', ''), false)
assert.equal(isUsAddress('CH', 'SWITZERLAND', ''), false)
assert.equal(isUsAddress('CH', '', ''), false)
assert.equal(isUsAddress('NY', '', '10001'), true)
assert.equal(isUsAddress('DE', 'GERMANY', ''), false)
assert.equal(isUsAddress('DE', 'DELAWARE', '19801'), true)

assert.equal(isoCountryCode('UK'), 'GB')
assert.equal(isoCountryCode('CH'), 'CH')
assert.equal(countryName('IL'), 'Israel')
assert.equal(countryName('UK'), 'United Kingdom')

const censusUrl = censusGeocodeUrl('1 Infinite Loop, Cupertino, CA 95014')
assert.equal(censusUrl.origin, 'https://geocoding.geo.census.gov')
assert.equal(censusUrl.pathname, '/geocoder/locations/onelineaddress')

const nominatimUrl = nominatimSearchUrl('Zurich, Switzerland', 'CH')
assert.equal(nominatimUrl.origin, 'https://nominatim.openstreetmap.org')
assert.equal(nominatimUrl.pathname, '/search')
assert.equal(nominatimUrl.searchParams.get('countrycodes'), 'ch')
assert.equal(nominatimUrl.searchParams.get('limit'), '1')

const blocked = nominatimSearchUrl('x', 'https://evil.example')
assert.equal(blocked.searchParams.has('countrycodes'), false)

const swiss = locationFromSecAddresses(
  {
    addresses: {
      business: {
        street1: 'Gotthardstrasse 43',
        city: 'Zurich',
        stateOrCountry: 'CH',
        stateOrCountryDescription: 'SWITZERLAND',
        zipCode: '8002',
      },
    },
  },
  { ticker: 'VONT', cik: '0001234567' },
)
assert.equal(swiss.geocodeWith, 'nominatim')
assert.equal(swiss.confidence, 'hq')
assert.match(swiss.query, /Switzerland/i)
assert.equal(swiss.sourceFields.country_code, 'CH')

const israel = locationFromSecAddresses(
  {
    addresses: {
      business: {
        street1: '5 Kiryat HaMada St',
        city: 'Jerusalem',
        stateOrCountry: 'IL',
        stateOrCountryDescription: 'ISRAEL',
        zipCode: '9777605',
      },
    },
  },
  { ticker: 'DRTS', cik: '000111' },
)
assert.equal(israel.geocodeWith, 'nominatim')
assert.doesNotMatch(israel.query, /\bIL\b/)

const california = locationFromSecAddresses(
  {
    addresses: {
      business: {
        street1: '1 Apple Park Way',
        city: 'Cupertino',
        stateOrCountry: 'CA',
        stateOrCountryDescription: 'CA',
        zipCode: '95014',
      },
    },
  },
  { ticker: 'AAPL', cik: '0000320193' },
)
assert.equal(california.geocodeWith, 'census')
assert.match(california.query, /CA/)

const missing = locationFromSecAddresses({}, { ticker: 'NONE' })
assert.equal(missing.confidence, 'unresolved')
assert.equal(missing.geocodeWith, null)

console.log(
  JSON.stringify(
    {
      us_vs_foreign: ['IL/Israel', 'CH/Switzerland', 'CA/California'],
      nominatim_allowlist: nominatimUrl.origin,
      census_allowlist: censusUrl.origin,
    },
    null,
    2,
  ),
)
console.log('Map geocode provider QA OK')
