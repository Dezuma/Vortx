/**
 * Read Supabase credentials from the Cloudflare Worker `env` binding.
 *
 * Same secret names you would use with Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 * in Supabase Edge Functions ; set via Wrangler (.dev.vars), Cloudflare dashboard,
 * or `wrangler secret put`. Never log returned values.
 *
 * @param {Record<string, string | undefined>} env
 */

export function getSupabaseUrl(env) {
  return String(env?.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, '')
}

/** Service role JWT (server-only). */
export function getSupabaseServiceRoleKey(env) {
  const k = env?.SUPABASE_SERVICE_ROLE_KEY
  return typeof k === 'string' ? k.trim() : ''
}

export function hasSupabaseServiceRoleKey(env) {
  return getSupabaseServiceRoleKey(env).length > 0
}

/** Browser-safe key from Wrangler vars (mirrors Vite public env). */
export function getSupabasePublishableKey(env) {
  const a = env?.VITE_SUPABASE_PUBLISHABLE_KEY
  const b = env?.VITE_SUPABASE_ANON_KEY
  if (typeof a === 'string' && a.trim()) return a.trim()
  if (typeof b === 'string' && b.trim()) return b.trim()
  return ''
}

/**
 * Prefer service role when present; otherwise anon/publishable (e.g. waitlist insert).
 */
export function getSupabaseRestKey(env) {
  const sr = getSupabaseServiceRoleKey(env)
  if (sr) return sr
  return getSupabasePublishableKey(env)
}
