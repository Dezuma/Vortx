import { json, hasSupabase, supabaseRest } from '../lib/supabase-rest.js'
import { rateLimit, rateLimitResponse } from '../lib/rate-limit.js'
import {
  adjacentWindowCutoff,
  buildAdjacentSignalStats,
  buildScanResults,
  fetchScanData,
  resolveAdjacentSignals,
  SCAN_WINDOW_DAYS,
} from '../lib/scan-core.js'
import { API_RESEARCH_DISCLAIMER } from '../lib/product-positioning.js'

const MAX_ENTITIES = 50

export async function onRequestPost({ request, env }) {
  const retryAfter = rateLimit(request, { keyPrefix: 'scan-results', limit: 10 })
  if (retryAfter) return rateLimitResponse(retryAfter)

  if (!hasSupabase(env)) {
    return json({ ok: false, error: 'supabase_unconfigured' }, { status: 503 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const entityIds = [...new Set((body.entity_ids || []).map((id) => String(id || '').trim()).filter(Boolean))]
  if (!entityIds.length) {
    return json({ ok: false, error: 'missing_entity_ids', message: 'Provide entity_ids to scan.' }, { status: 400 })
  }
  if (entityIds.length > MAX_ENTITIES) {
    return json({ ok: false, error: 'entity_limit_exceeded', message: `Maximum ${MAX_ENTITIES} entities per scan.` }, { status: 400 })
  }

  try {
    const data = await fetchScanData(env, supabaseRest, entityIds)
    const adjacentCutoff = adjacentWindowCutoff()
    const recentEvents = await supabaseRest(
      env,
      `legal_events?select=entity_id,jurisdiction&filing_date=gte.${adjacentCutoff}&order=filing_date.desc&limit=500`,
    ).catch(() => [])
    const adjacentStats = buildAdjacentSignalStats(recentEvents)
    const entityById = new Map((data.entities || []).map((entity) => [entity.id, entity]))
    const entities = buildScanResults(data, { unlockLevel: 'teaser' }).map((result) => {
      if (result.event_count_90d > 0) return result
      const entity = entityById.get(result.entity_id) || {
        canonical_name: result.name,
        jurisdiction: result.jurisdiction,
      }
      return {
        ...result,
        adjacent_signals: resolveAdjacentSignals(entity, adjacentStats),
      }
    })

    return json({
      ok: true,
      window_days: SCAN_WINDOW_DAYS,
      unlock_level: 'teaser',
      entities,
      disclaimer: API_RESEARCH_DISCLAIMER,
    })
  } catch {
    return json({ ok: false, error: 'scan_failed', message: 'Could not load scan results. Try again shortly.' }, { status: 500 })
  }
}

export function onRequestGet() {
  return json({ ok: true, message: 'POST JSON { entity_ids } for teaser scan results.' })
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context)
  return onRequestGet(context)
}
