import { matchTickerForCompanyWithCache } from '../_shared/match-ticker-core.ts'
import { getSupabaseServiceRoleKey } from '../_shared/env.ts'
import { resolveTickerCacheStore } from './kv-cache.ts'

const cache = resolveTickerCacheStore()

export async function matchTickerForCompany(companyName: string): Promise<string | null> {
  return matchTickerForCompanyWithCache(companyName, cache)
}

function authorized(request: Request): boolean {
  const expected = getSupabaseServiceRoleKey()
  if (!expected) return false
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  return provided === expected
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (!authorized(request)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }

  let companyName = ''
  try {
    const body = (await request.json()) as { companyName?: string }
    companyName = String(body?.companyName || '').trim()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (!companyName) {
    return new Response(JSON.stringify({ error: 'company_name_required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const ticker = await matchTickerForCompany(companyName)
    return new Response(JSON.stringify({ ticker }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'match_failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }
})
