import {
  bearerToken,
  hasSupabase,
  isActiveSubscription,
  json,
  PAID_PLANS,
  supabaseAuthUser,
  supabaseRest,
} from '../lib/supabase-rest.js'

const SCAN_USE_CASE = 'blind_spot_scan'

export async function scanAccessContext(request, env) {
  const token = bearerToken(request)
  if (!token || !hasSupabase(env)) {
    return { authenticated: false, isSubscriber: false, maxNames: 10 }
  }

  try {
    const user = await supabaseAuthUser(env, token)
    const rows = await supabaseRest(
      env,
      `app_profiles?select=role,plan,subscription_status&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    )
    const profile = rows?.[0] || null
    const isAdmin = profile?.role === 'admin' && isActiveSubscription(profile.subscription_status)
    const isSubscriber =
      isAdmin ||
      (profile && PAID_PLANS.has(profile.plan) && isActiveSubscription(profile.subscription_status))
    return {
      authenticated: true,
      isSubscriber: Boolean(isSubscriber),
      maxNames: isSubscriber ? 50 : 10,
      profile,
    }
  } catch {
    return { authenticated: false, isSubscriber: false, maxNames: 10 }
  }
}

export { SCAN_USE_CASE }
