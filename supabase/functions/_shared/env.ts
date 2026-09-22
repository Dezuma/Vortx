/**
 * Supabase Edge Functions (Deno): secrets via `supabase secrets set SUPABASE_SERVICE_ROLE_KEY`.
 * Do not commit real values. Same names as Cloudflare Worker `env` in frontend/functions.
 */

export function getSupabaseUrl(): string {
  const raw = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? ''
  return raw.trim().replace(/\/$/, '')
}

/** Mirrors Worker env.SUPABASE_SERVICE_ROLE_KEY */
export function getSupabaseServiceRoleKey(): string {
  const k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  return typeof k === 'string' ? k.trim() : ''
}
