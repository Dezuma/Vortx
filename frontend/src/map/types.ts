// NOTE: Production UI still ships from .prod-reference.js; these contracts are the
// shared source of truth for the map API and the eventual React source unification.

export type MapSignalGroup = 'distress' | 'trade' | 'cross'

export type MapGeocodingConfidence =
  | 'facility'
  | 'hq'
  | 'registered_agent'
  | 'unresolved'

export type MapLocationPrecision = 'address' | 'city' | 'county' | 'state' | 'unknown'

export interface GeocodedLocation {
  longitude: number | null
  latitude: number | null
  label: string
  confidence: MapGeocodingConfidence
  precision: MapLocationPrecision
  geocoder: 'census' | 'manual' | 'unresolved'
  matchedAddress: string | null
  reviewReason: string | null
}

export interface MapSignalPoint {
  id: string
  eventType:
    | 'warn_notice'
    | 'bankruptcy_chapter_11'
    | 'bankruptcy_chapter_7'
    | 'bankruptcy_docket'
    | 'mechanics_lien'
    | 'form_4'
    | 'congress_trade'
  signalGroup: MapSignalGroup
  filingDate: string
  location: GeocodedLocation
}

export interface UserAccessTier {
  authenticated: boolean
  role: 'guest' | 'customer' | 'admin'
  plan:
    | 'guest'
    | 'scout'
    | 'sentinel'
    | 'nebula'
    | 'pulsar'
    | 'supernova'
    | 'galactic'
    | 'custom'
  active: boolean
}

export interface CompositeCrossSignal {
  id: string
  tradeSignalId: string
  distressSignalId: string
  correlationKeyType: 'entity' | 'ticker'
  ticker: string | null
  tradeEventType: 'form_4' | 'congress_trade'
  distressEventType:
    | 'warn_notice'
    | 'bankruptcy_chapter_11'
    | 'bankruptcy_chapter_7'
    | 'bankruptcy_docket'
    | 'bankruptcy_adversary'
  tradeDate: string
  distressDate: string
  daysBetween: number
  location: GeocodedLocation
  standingDisclaimer:
    'This shows the timing relationship between two public filings. It is not evidence of insider knowledge, coordination, or wrongdoing.'
}
