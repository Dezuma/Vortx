import {
  getSupabasePublishableKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  hasSupabaseServiceRoleKey,
} from './worker-env.js'

export function hasSupabase(env) {
  return Boolean(getSupabaseUrl(env) && hasSupabaseServiceRoleKey(env))
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  })
}

export function bearerToken(request) {
  const value = request.headers.get('authorization') || ''
  const match = value.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : ''
}

export async function supabaseRest(env, path, init = {}) {
  const url = getSupabaseUrl(env)
  const key = getSupabaseServiceRoleKey(env)
  if (!url || !key) throw new Error('supabase_unconfigured')

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { raw: text }
    }
  }

  if (!response.ok) {
    const message = payload?.message || payload?.hint || payload?.error || `Supabase REST ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export async function supabaseAuthUser(env, accessToken) {
  const url = getSupabaseUrl(env)
  const anon = getSupabasePublishableKey(env)
  if (!url || !anon) throw new Error('supabase_auth_unconfigured')

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anon,
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    const error = new Error('invalid_session')
    error.status = 401
    throw error
  }

  return response.json()
}

export function adminEmails(env) {
  return String(env.VORTX_ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

export function isActiveSubscription(status) {
  return status === 'active' || status === 'trialing'
}

export const PAID_PLANS = new Set(['scout', 'sentinel', 'nebula', 'pulsar', 'supernova', 'galactic', 'custom'])

export function parseContentRangeCount(contentRange) {
  const match = String(contentRange || '').match(/\/(\d+)$/)
  return match ? Number(match[1]) : 0
}

export async function supabaseTableCount(env, table, filter = '') {
  const url = getSupabaseUrl(env)
  const key = getSupabaseServiceRoleKey(env)
  if (!url || !key) return 0
  const suffix = filter ? `&${filter}` : ''
  const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=1${suffix}`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: 'application/json',
      prefer: 'count=exact',
    },
  })
  if (!response.ok) return 0
  return parseContentRangeCount(response.headers.get('content-range'))
}

/** Fetch rows by id in chunks (PostgREST default page size is 1000; avoid full-table scans). */
export async function supabaseRestByIds(env, { table, select, ids, idColumn = 'id', chunkSize = 60 }) {
  const unique = [...new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean))]
  if (!unique.length) return []

  const rows = []
  for (let index = 0; index < unique.length; index += chunkSize) {
    const chunk = unique.slice(index, index + chunkSize)
    const filter = chunk.map((id) => encodeURIComponent(id)).join(',')
    const batch = await supabaseRest(
      env,
      `${table}?select=${encodeURIComponent(select)}&${idColumn}=in.(${filter})`,
    )
    if (Array.isArray(batch)) rows.push(...batch)
  }
  return rows
}
