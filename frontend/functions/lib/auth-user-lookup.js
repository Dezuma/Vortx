import { getSupabaseServiceRoleKey, getSupabaseUrl } from './worker-env.js'

/** Inbox ownership, not an admin-created password account. */
export function isEmailConfirmed(user) {
  if (!user) return false
  return Boolean(user.email_confirmed_at || user.confirmed_at)
}

/**
 * Exact auth user lookup. GoTrue's `filter` is a substring match, so results
 * are compared case-insensitively before a row is returned.
 */
export async function lookupAuthUserByEmail(env, email) {
  const url = getSupabaseUrl(env)
  const key = getSupabaseServiceRoleKey(env)
  const normalized = String(email || '').trim().toLowerCase()
  if (!url || !key || !normalized) return null

  const response = await fetch(
    `${url}/auth/v1/admin/users?per_page=200&filter=${encodeURIComponent(normalized)}`,
    {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        accept: 'application/json',
      },
    },
  )
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.msg || `auth_user_lookup_failed_${response.status}`)
    error.status = response.status
    throw error
  }
  const users = Array.isArray(payload?.users) ? payload.users : Array.isArray(payload) ? payload : []
  return users.find((user) => String(user?.email || '').trim().toLowerCase() === normalized) || null
}
