import { json, supabaseRest, supabaseRestByIds } from '../lib/supabase-rest.js'
import { rateLimit, rateLimitResponse } from '../lib/rate-limit.js'
import { resolveFeedAccess } from '../lib/feed-access.js'

const MAX_POINTS_PER_VIEWPORT = 2000
const MAX_LONGITUDE_SPAN = 360
const MAX_LATITUDE_SPAN = 180
const FILTER_EVENT_TYPES = {
  warn: ['warn_notice'],
  bankruptcy: [
    'bankruptcy_chapter_11',
    'bankruptcy_chapter_7',
    'bankruptcy_docket',
    'bankruptcy_adversary',
  ],
  liens: ['mechanics_lien', 'notice_of_intent', 'creditor_dispute'],
  congress: ['congress_trade'],
  form4: ['form_4'],
}
const DEFAULT_FILTERS = Object.keys(FILTER_EVENT_TYPES)

export function parseMapBounds(url) {
  const raw = String(url.searchParams.get('bounds') || '')
    .split(',')
    .map((value) => Number(value.trim()))
  if (raw.length !== 4 || raw.some((value) => !Number.isFinite(value))) return null
  let [west, south, east, north] = raw
  west = Math.max(-180, Math.min(180, west))
  east = Math.max(-180, Math.min(180, east))
  south = Math.max(-90, Math.min(90, south))
  north = Math.max(-90, Math.min(90, north))
  if (south >= north) return null
  if (west > east || Math.abs(east - west) < 1e-9) {
    west = -180
    east = 180
  }
  if (east - west > MAX_LONGITUDE_SPAN || north - south > MAX_LATITUDE_SPAN) {
    return null
  }
  return { west, south, east, north }
}

export function parseMapFilters(url) {
  const requested = String(url.searchParams.get('types') || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  const types = requested.length
    ? [...new Set(requested.filter((value) => DEFAULT_FILTERS.includes(value)))]
    : DEFAULT_FILTERS
  const query = String(url.searchParams.get('q') || '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .trim()
    .slice(0, 64)
  return {
    types: types.length ? types : DEFAULT_FILTERS,
    eventTypes: [
      ...new Set(types.flatMap((type) => FILTER_EVENT_TYPES[type] || [])),
    ],
    query,
    crossOnly: url.searchParams.get('cross_only') === '1',
  }
}

export async function loadMapLocationRows(
  env,
  bounds,
  {
    select =
      'event_id,event_type,signal_group,filing_date,longitude,latitude,geocoding_confidence,location_precision',
    limit = MAX_POINTS_PER_VIEWPORT,
    eventTypes = [],
  } = {},
) {
  return supabaseRest(
    env,
    [
      'map_signal_locations',
      `?select=${encodeURIComponent(select)}`,
      '&geocoding_confidence=neq.unresolved',
      '&longitude=not.is.null',
      '&latitude=not.is.null',
      eventTypes.length
        ? `&event_type=in.(${eventTypes.map((value) => encodeURIComponent(value)).join(',')})`
        : '',
      `&longitude=gte.${encodeURIComponent(bounds.west)}`,
      `&longitude=lte.${encodeURIComponent(bounds.east)}`,
      `&latitude=gte.${encodeURIComponent(bounds.south)}`,
      `&latitude=lte.${encodeURIComponent(bounds.north)}`,
      '&order=filing_date.desc',
      `&limit=${Math.min(MAX_POINTS_PER_VIEWPORT, Math.max(1, Number(limit) || MAX_POINTS_PER_VIEWPORT))}`,
    ].join(''),
  )
}

export async function loadMapCrossRows(env, bounds, limit = MAX_POINTS_PER_VIEWPORT) {
  return supabaseRest(
    env,
    [
      'map_cross_signals',
      '?select=id,trade_event_id,distress_event_id,trade_entity_id,distress_entity_id,ticker,trade_event_type,distress_event_type,trade_date,distress_date,days_between,longitude,latitude,location_confidence,location_precision',
      `&longitude=gte.${encodeURIComponent(bounds.west)}`,
      `&longitude=lte.${encodeURIComponent(bounds.east)}`,
      `&latitude=gte.${encodeURIComponent(bounds.south)}`,
      `&latitude=lte.${encodeURIComponent(bounds.north)}`,
      '&order=distress_date.desc',
      `&limit=${Math.min(MAX_POINTS_PER_VIEWPORT, Math.max(1, Number(limit) || MAX_POINTS_PER_VIEWPORT))}`,
    ].join(''),
  )
}

export async function searchBlobByEventId(
  env,
  eventIds,
  { includeEntityText = true } = {},
) {
  const events = await supabaseRestByIds(env, {
    table: 'legal_events',
    select: 'id,entity_id,title,summary,jurisdiction',
    ids: eventIds,
  }).catch(() => [])
  const entities = await supabaseRestByIds(env, {
    table: 'entities',
    select: 'id,canonical_name,ticker',
    ids: events.map((event) => event.entity_id).filter(Boolean),
  }).catch(() => [])
  const locations = await supabaseRestByIds(env, {
    table: 'map_signal_locations',
    select: 'event_id,location_label,source_fields',
    ids: eventIds,
    idColumn: 'event_id',
  }).catch(() => [])
  const entityById = new Map(entities.map((entity) => [entity.id, entity]))
  const locationById = new Map(locations.map((location) => [location.event_id, location]))
  return new Map(
    events.map((event) => {
      const entity = entityById.get(event.entity_id)
      const location = locationById.get(event.id)
      const sourceFields =
        location?.source_fields && typeof location.source_fields === 'object'
          ? includeEntityText
            ? Object.values(location.source_fields)
            : [
                location.source_fields.city,
                location.source_fields.county,
                location.source_fields.state,
                location.source_fields.zip,
              ]
          : []
      return [
        event.id,
        [
          includeEntityText ? entity?.canonical_name : null,
          includeEntityText ? entity?.ticker : null,
          includeEntityText ? event.title : null,
          includeEntityText ? event.summary : null,
          event.jurisdiction,
          includeEntityText ? location?.location_label : null,
          ...sourceFields,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      ]
    }),
  )
}

function featureFromRow(row) {
  const longitude = Number(row.longitude)
  const latitude = Number(row.latitude)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
  return {
    type: 'Feature',
    id: row.event_id,
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    properties: {
      id: row.event_id,
      eventType: row.event_type,
      signalGroup: row.signal_group,
      filingDate: row.filing_date,
      locationConfidence: row.geocoding_confidence,
      locationPrecision: row.location_precision,
    },
  }
}

function featureFromCrossRow(row) {
  const longitude = Number(row.longitude)
  const latitude = Number(row.latitude)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
  return {
    type: 'Feature',
    id: `cross-${row.id}`,
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    properties: {
      id: `cross-${row.id}`,
      eventType: 'cross_signal',
      signalGroup: 'cross',
      filingDate: row.distress_date,
      locationConfidence: row.location_confidence,
      locationPrecision: row.location_precision,
      tradeEventType: row.trade_event_type,
      distressEventType: row.distress_event_type,
      daysBetween: row.days_between,
    },
  }
}

/**
 * Bounds are mandatory. Filtering/search happens server-side, but no entity names,
 * source URLs, raw addresses, or unresolved locations are returned.
 */
export async function onRequestGet({ request, env }) {
  const retryAfter = rateLimit(request, {
    keyPrefix: 'map-signals',
    limit: 120,
    windowMs: 60_000,
  })
  if (retryAfter) return rateLimitResponse(retryAfter)

  const url = new URL(request.url)
  const bounds = parseMapBounds(url)
  if (!bounds) {
    return json(
      {
        ok: false,
        error: 'valid_bounds_required',
        message: 'Pass bounds=west,south,east,north as WGS84 coordinates.',
      },
      { status: 400 },
    )
  }

  let personalizedSearch = false
  try {
    const filters = parseMapFilters(url)
    let [rows, crossRows] = await Promise.all([
      filters.crossOnly
        ? Promise.resolve([])
        : loadMapLocationRows(env, bounds, {
            eventTypes: filters.eventTypes,
          }),
      loadMapCrossRows(env, bounds),
    ])
    const allowedEventTypes = new Set(filters.eventTypes)
    crossRows = (crossRows || []).filter(
      (row) =>
        allowedEventTypes.has(row.trade_event_type) ||
        allowedEventTypes.has(row.distress_event_type),
    )

    if (filters.query) {
      const query = filters.query.toLowerCase()
      const searchAccess = await resolveFeedAccess(request, env)
      personalizedSearch = Boolean(searchAccess.showFullNames)
      const eventIds = [
        ...(rows || []).map((row) => row.event_id),
        ...crossRows.flatMap((row) => [row.trade_event_id, row.distress_event_id]),
      ]
      const searchBlobs = await searchBlobByEventId(env, eventIds, {
        includeEntityText: personalizedSearch,
      })
      rows = (rows || []).filter((row) =>
        String(searchBlobs.get(row.event_id) || '').includes(query),
      )
      crossRows = crossRows.filter((row) =>
        [
          searchBlobs.get(row.trade_event_id),
          searchBlobs.get(row.distress_event_id),
          personalizedSearch ? row.ticker : null,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      )
    }

    const baseFeatures = (rows || []).map(featureFromRow).filter(Boolean)
    const crossFeatures = crossRows.map(featureFromCrossRow).filter(Boolean)
    const features = filters.crossOnly
      ? crossFeatures
      : [...baseFeatures, ...crossFeatures]
    return json(
      {
        ok: true,
        type: 'FeatureCollection',
        features,
        meta: {
          bounds,
          returned: features.length,
          capped:
            baseFeatures.length >= MAX_POINTS_PER_VIEWPORT ||
            crossFeatures.length >= MAX_POINTS_PER_VIEWPORT,
          unresolvedExcluded: true,
          filters: {
            types: filters.types,
            query: filters.query || null,
            crossOnly: filters.crossOnly,
          },
          crossSignals: crossFeatures.length,
        },
      },
      {
        headers: {
          'cache-control': personalizedSearch
            ? 'private, no-store'
            : 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
        },
      },
    )
  } catch (error) {
    return json(
      {
        ok: false,
        error: 'map_signals_unavailable',
        message: 'Map signals are temporarily unavailable.',
      },
      { status: Number(error?.status) === 404 ? 503 : 500 },
    )
  }
}
