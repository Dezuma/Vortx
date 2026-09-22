import { json, hasSupabase, supabaseRest } from '../lib/supabase-rest.js'
import { rateLimit, rateLimitResponse } from '../lib/rate-limit.js'
import { loadPaidUnlockSession } from '../lib/stripe-unlock-verify.js'
import {
  CONTRACTOR_DISCLAIMER,
  runContractorCheckSearch,
  runContractorCheckUnlock,
} from '../lib/contractor-check.js'

const TRACK_STEPS = new Set([
  'page_view',
  'search',
  'results_found',
  'results_clear',
  'unlock_click',
  'unlock_paid',
  'subscribe_click',
])

async function auditFunnelStep(env, step, resultCount = 0) {
  try {
    await supabaseRest(env, 'query_audit_events', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify([
        {
          subscriber_email: null,
          surface: 'contractor_check',
          query: step,
          result_count: Number(resultCount) || 0,
        },
      ]),
    })
  } catch {
    // Non-blocking analytics
  }
}

export async function onContractorCheckSearch({ request, env }) {
  const retryAfter = rateLimit(request, { keyPrefix: 'contractor-check', limit: 15 })
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

  const name = String(body.name || body.company || '').trim()
  const state = String(body.state || '').trim()
  const city = String(body.city || '').trim()

  if (!name || name.length < 2) {
    return json({ ok: false, error: 'missing_name', message: 'Enter a contractor or business name.' }, { status: 400 })
  }

  try {
    const payload = await runContractorCheckSearch(env, supabaseRest, { name, state, city })
    await auditFunnelStep(env, 'search', payload.result?.record_count || 0)
    if (payload.result?.has_records) await auditFunnelStep(env, 'results_found', payload.result.record_count)
    else await auditFunnelStep(env, 'results_clear', 0)

    return json(payload)
  } catch (error) {
    return json(
      { ok: false, error: 'search_failed', message: 'Could not run contractor check. Try again shortly.' },
      { status: 500 },
    )
  }
}

export async function onContractorCheckTrack({ request, env }) {
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

  await auditFunnelStep(env, step, body.result_count)
  return json({ ok: true, tracked: true })
}

export async function onContractorCheckVerifyUnlock({ request, env }) {
  if (!hasSupabase(env)) {
    return json({ ok: false, error: 'supabase_unconfigured' }, { status: 503 })
  }
  if (!env.STRIPE_SECRET_KEY) {
    return json({ ok: false, error: 'stripe_unconfigured' }, { status: 503 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const sessionId = String(body.session_id || body.stripe_session_id || '').trim()
  const entityIdHint = String(body.entity_id || '').trim()
  const stateHint = String(body.state || '').trim()

  if (!sessionId) {
    return json({ ok: false, error: 'missing_params', message: 'session_id is required.' }, { status: 400 })
  }

  const verified = await loadPaidUnlockSession(env, sessionId, 'contractor_unlock', entityIdHint)
  if (!verified.ok) {
    return json(
      { ok: false, error: verified.error, message: verified.message },
      { status: verified.error === 'payment_not_verified' ? 402 : 502 },
    )
  }

  const entityId = verified.entityId
  const state = stateHint || verified.state

  try {
    const result = await runContractorCheckUnlock(env, supabaseRest, entityId, state)
    await auditFunnelStep(env, 'unlock_paid', result.record_count || 0)
    return json({
      ok: true,
      unlocked: true,
      result,
      disclaimer: CONTRACTOR_DISCLAIMER,
    })
  } catch {
    return json({ ok: false, error: 'unlock_failed', message: 'Payment verified but results could not load.' }, { status: 500 })
  }
}

export function onContractorCheckGetHelp() {
  return json({
    ok: true,
    message: 'POST /api/contractor-check/search { name, state?, city? }',
    track: 'POST /api/contractor-check/track { step }',
    verify: 'POST /api/contractor-check/verify-unlock { session_id, entity_id, state? }',
  })
}
