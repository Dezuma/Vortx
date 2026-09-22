import { json, hasSupabase, supabaseRest } from '../lib/supabase-rest.js'
import { rateLimit, rateLimitResponse } from '../lib/rate-limit.js'
import { parseCompanyNames, scoreEntityCandidates, fetchEntityCandidates } from '../lib/entity-match.js'
import { scanAccessContext } from '../lib/scan-auth.js'

export async function onRequestPost({ request, env }) {
  const retryAfter = rateLimit(request, { keyPrefix: 'scan-match', limit: 10 })
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

  const mode = String(body.mode || 'holdings').trim()
  if (mode !== 'holdings' && mode !== 'competitors') {
    return json({ ok: false, error: 'invalid_mode', message: 'mode must be holdings or competitors.' }, { status: 400 })
  }

  const names = parseCompanyNames(body.names)
  if (!names.length) {
    return json({ ok: false, error: 'missing_names', message: 'Provide at least one company name.' }, { status: 400 })
  }

  const access = await scanAccessContext(request, env)
  if (names.length > access.maxNames) {
    return json(
      {
        ok: false,
        error: 'name_limit_exceeded',
        message: access.isSubscriber
          ? `Maximum ${access.maxNames} names per scan.`
          : `Maximum ${access.maxNames} names without signing in. Subscribe for higher limits.`,
        max_names: access.maxNames,
      },
      { status: 400 },
    )
  }

  try {
    const candidates = await fetchEntityCandidates(env, supabaseRest, names)
    const results = names.map((input) => ({
      input,
      matches: scoreEntityCandidates(input, candidates),
    }))

    return json({
      ok: true,
      mode,
      results,
      max_names: access.maxNames,
      authenticated: access.authenticated,
    })
  } catch (error) {
    return json(
      { ok: false, error: 'match_failed', message: 'Could not match company names. Try again shortly.' },
      { status: 500 },
    )
  }
}

export function onRequestGet() {
  return json({ ok: true, message: 'POST JSON { names, mode } to match entities.' })
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context)
  return onRequestGet(context)
}
