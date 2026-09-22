import { hasSupabase, json, supabaseRest } from '../lib/supabase-rest.js'
import { rateLimit, rateLimitResponse } from '../lib/rate-limit.js'
import { TRACK_STEPS } from '../lib/marketing-track-steps.js'

/**
 * Persist a funnel step without PII. detail is truncated; never store emails here.
 */
export async function recordMarketingStep(env, { step, surface = 'marketing_site', detail = '', resultCount = 0 }) {
  const key = String(step || '').trim()
  if (!TRACK_STEPS.has(key) || !hasSupabase(env)) return { ok: false, tracked: false }
  const safeSurface = String(surface || 'marketing_site').trim().slice(0, 64) || 'marketing_site'
  const safeDetail = String(detail || '').trim().slice(0, 120)
  try {
    await supabaseRest(env, 'query_audit_events', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify([
        {
          subscriber_email: null,
          surface: safeSurface,
          query: safeDetail ? `${key}:${safeDetail}` : key,
          result_count: Number(resultCount) || 0,
        },
      ]),
    })
    return { ok: true, tracked: true }
  } catch {
    return { ok: true, tracked: false }
  }
}

export async function onMarketingTrack({ request, env }) {
  const retryAfter = rateLimit(request, { keyPrefix: 'marketing-track', limit: 60 })
  if (retryAfter) return rateLimitResponse(retryAfter)

  if (!hasSupabase(env)) {
    return json({ ok: true, tracked: false })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const step = String(body.step || '').trim()
  if (!TRACK_STEPS.has(step)) {
    return json({ ok: false, error: 'invalid_step' }, { status: 400 })
  }

  const result = await recordMarketingStep(env, {
    step,
    surface: body.surface,
    detail: body.detail,
    resultCount: body.result_count,
  })

  return json({ ok: true, tracked: Boolean(result.tracked) })
}
