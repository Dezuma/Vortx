import { json, supabaseRest } from '../lib/supabase-rest.js'
import {
  authenticateEnterpriseMapApi,
  enterpriseApiAuthResponse,
} from '../lib/enterprise-api-auth.js'
import { rateLimit, rateLimitResponse } from '../lib/rate-limit.js'
import { planCapabilities } from '../lib/plan-capabilities.js'
import { loadVisibleMapDetails } from './map-signal-detail.js'
import { parseMapBounds, parseMapFilters } from './map-signals.js'

function enterpriseAccess(subscriber) {
  return {
    isAuthenticated: true,
    isSubscriber: true,
    profile: {
      plan: 'galactic',
      role: 'customer',
      email: subscriber.owner_email,
      subscription_status: 'active',
    },
    capabilities: planCapabilities('galactic'),
    showFullNames: true,
    showSourceUrls: true,
    showSignalMeta: true,
    tierLabel: 'Enterprise · API',
  }
}

function enterpriseFeature(detail) {
  const signal = detail?.signal
  const longitude = Number(signal?.location?.longitude)
  const latitude = Number(signal?.location?.latitude)
  if (!signal || !Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
  return {
    type: 'Feature',
    id: signal.id,
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    properties: {
      ...signal,
      location: {
        label: signal.location.label,
        confidence: signal.location.confidence,
        precision: signal.location.precision,
      },
    },
  }
}

/**
 * Build the full Enterprise GeoJSON response from visible, gated details.
 * @param {object[]} details Full map details.
 * @param {{west:number,south:number,east:number,north:number}} bounds Viewport bounds.
 * @param {{types:string[],query:string,crossOnly:boolean}} filters Parsed filters.
 * @returns {object} Enterprise FeatureCollection response body.
 * @example buildEnterpriseMapFeatureCollection(details, bounds, filters)
 */
export function buildEnterpriseMapFeatureCollection(details, bounds, filters) {
  const features = details.map(enterpriseFeature).filter(Boolean)
  return {
    ok: true,
    type: 'FeatureCollection',
    features,
    meta: {
      bounds,
      returned: features.length,
      capped: features.length >= 2000,
      filters: {
        types: filters.types,
        query: filters.query || null,
        crossOnly: filters.crossOnly,
      },
      tier: 'Enterprise',
      docs: 'https://vortxmkt.com/docs/map-api.html',
    },
  }
}

async function auditEnterpriseMapQuery(env, subscriber, count) {
  await supabaseRest(env, 'query_audit_events', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify([
      {
        subscriber_email: subscriber.owner_email,
        surface: 'enterprise_map_api',
        query: 'bounds_query',
        result_count: Number(count) || 0,
      },
    ]),
  }).catch(() => null)
}

/**
 * Return full, filter-aware map GeoJSON to an active Enterprise API key.
 * @param {{request: Request, env: object}} context Worker request context.
 * @returns {Promise<Response>} Private GeoJSON response or a safe auth/validation error.
 * @example await onEnterpriseMapSignalsGet({ request, env })
 */
export async function onEnterpriseMapSignalsGet({ request, env }) {
  const ipRetryAfter = rateLimit(request, {
    keyPrefix: 'enterprise-map-auth',
    limit: 60,
    windowMs: 60_000,
  })
  if (ipRetryAfter) return rateLimitResponse(ipRetryAfter)

  let auth
  try {
    auth = await authenticateEnterpriseMapApi(request, env)
  } catch (error) {
    return enterpriseApiAuthResponse(error)
  }

  const keyRetryAfter = rateLimit(request, {
    keyPrefix: 'enterprise-map-key',
    key: auth.tokenHash.slice(0, 24),
    limit: 180,
    windowMs: 60_000,
  })
  if (keyRetryAfter) return rateLimitResponse(keyRetryAfter)

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
  const filters = parseMapFilters(url)

  try {
    const details = await loadVisibleMapDetails(
      env,
      bounds,
      filters,
      enterpriseAccess(auth.subscriber),
    )
    const payload = buildEnterpriseMapFeatureCollection(details, bounds, filters)
    await auditEnterpriseMapQuery(env, auth.subscriber, payload.features.length)
    return json(
      payload,
      {
        headers: {
          'cache-control': 'private, no-store',
          'x-vortx-api-tier': 'enterprise',
        },
      },
    )
  } catch {
    return json(
      {
        ok: false,
        error: 'enterprise_map_query_failed',
        message: 'Enterprise map query failed.',
      },
      { status: 500 },
    )
  }
}
