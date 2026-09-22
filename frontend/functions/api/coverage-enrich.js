import { json, supabaseRest, hasSupabase } from '../lib/supabase-rest.js'
import { enrichEventsWithNewsCoverage } from '../lib/news-coverage.js'
import { rateLimit, rateLimitResponse } from '../lib/rate-limit.js'

/**
 * POST { events: [{ id, event_type, created_at, entity_name, signal_meta, ticker }] }
 * Returns { ok, coverage: { [eventId]: { detected_at, news_mentioned_at, ... } } }
 * Rate-limited; only enriches event IDs that exist in legal_events.
 */
export async function onRequestPost({ request, env }) {
  const retryAfter = rateLimit(request, { keyPrefix: 'coverage-enrich', limit: 20, windowMs: 60_000 })
  if (retryAfter) return rateLimitResponse(retryAfter)

  let body = {}
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json', coverage: {} }, { status: 400 })
  }

  const events = Array.isArray(body?.events) ? body.events.slice(0, 40) : []
  if (!events.length) {
    return json({ ok: true, coverage: {}, source: 'news_rss' })
  }

  const requestedIds = [
    ...new Set(events.map((row) => String(row?.id || '').trim()).filter(Boolean)),
  ].slice(0, 40)

  let allowedIds = new Set(requestedIds)
  if (hasSupabase(env) && requestedIds.length) {
    try {
      const rows = await supabaseRest(
        env,
        `legal_events?select=id&id=in.(${requestedIds.map((id) => encodeURIComponent(id)).join(',')})`,
      )
      allowedIds = new Set((rows || []).map((row) => String(row.id || '').trim()).filter(Boolean))
    } catch {
      return json({ ok: false, error: 'event_lookup_failed', coverage: {} }, { status: 503 })
    }
  }

  const knownEvents = events.filter((row) => allowedIds.has(String(row?.id || '').trim()))
  if (!knownEvents.length) {
    return json({ ok: true, coverage: {}, source: 'news_rss', checked: 0, rejected: events.length })
  }

  try {
    const enriched = await enrichEventsWithNewsCoverage(knownEvents, {
      maxEvents: Math.min(24, knownEvents.length),
      concurrency: 4,
      budgetMs: 5000,
      env: hasSupabase(env) ? env : null,
      supabaseRest: hasSupabase(env) ? supabaseRest : null,
    })
    const coverage = {}
    for (const event of enriched) {
      if (!event?.id || !event?.news_mentioned_at) continue
      coverage[event.id] = {
        detected_at: event.detected_at || event.created_at || null,
        news_mentioned_at: event.news_mentioned_at,
        coverage_first_seen_at: event.coverage_first_seen_at || event.news_mentioned_at,
        coverage_source: event.signal_meta?.coverage_source || 'news_rss',
        coverage_title: event.signal_meta?.coverage_title || null,
      }
    }
    return json(
      {
        ok: true,
        coverage,
        source: 'news_rss',
        checked: knownEvents.length,
        rejected: Math.max(0, events.length - knownEvents.length),
      },
      { headers: { 'cache-control': 'private, max-age=30' } },
    )
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'coverage_enrich_failed',
        coverage: {},
      },
      { status: 500 },
    )
  }
}

export async function onRequestGet() {
  return json({
    ok: true,
    usage: 'POST /api/coverage-enrich with { events: [...] }',
  })
}
