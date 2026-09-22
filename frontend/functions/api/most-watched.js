import { json, supabaseRest, hasSupabase } from '../lib/supabase-rest.js'
import { loadMostWatchedNames } from '../lib/most-watched.js'

export async function onRequestGet({ request, env }) {
  if (!hasSupabase(env)) {
    return json({ ok: false, error: 'supabase_unconfigured', names: [] }, { status: 503 })
  }
  try {
    const url = new URL(request.url)
    const scope = String(url.searchParams.get('scope') || 'desk').toLowerCase()
    const limit = Number(url.searchParams.get('limit') || 8)
    const payload = await loadMostWatchedNames(env, supabaseRest, { limit, scope })
    return json(payload, {
      headers: { 'cache-control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=30' },
    })
  } catch (error) {
    return json(
      { ok: false, error: error.message || 'most_watched_failed', names: [] },
      { status: 500 },
    )
  }
}
