import {
  bearerToken,
  hasSupabase,
  isActiveSubscription,
  PAID_PLANS,
  supabaseAuthUser,
  supabaseRest,
} from './supabase-rest.js'
import { capabilityLocks, planCapabilities } from './plan-capabilities.js'
import { entitlementForPlan } from './plan-entitlements.js'

const PUBLIC_CAPABILITIES = planCapabilities('scout')

function browseLimits(plan, role, isSubscriber) {
  if (role === 'admin') {
    return { queue: 12, commandPalette: 12 }
  }
  if (!isSubscriber) {
    return { queue: 6, commandPalette: 6 }
  }
  switch (String(plan || '').trim()) {
    case 'scout':
      return { queue: 6, commandPalette: 6 }
    case 'sentinel':
      return { queue: 8, commandPalette: 8 }
    case 'nebula':
      return { queue: 10, commandPalette: 10 }
    default:
      return { queue: 12, commandPalette: 12 }
  }
}

/**
 * Resolve browse/export access for the public friction feed.
 * Signed-in users without an active paid subscription stay on the public preview tier.
 */
export async function resolveFeedAccess(request, env) {
  const base = {
    isAuthenticated: false,
    isSubscriber: false,
    profile: null,
    capabilities: PUBLIC_CAPABILITIES,
    locks: capabilityLocks(PUBLIC_CAPABILITIES),
    showFullNames: false,
    showSourceUrls: false,
    showSignalMeta: false,
    allowBonusPreview: true,
    allowSourcePreview: false,
    browseLimits: browseLimits(null, null, false),
    tierLabel: null,
  }

  const token = bearerToken(request)
  if (!token || !hasSupabase(env)) return base

  try {
    const user = await supabaseAuthUser(env, token)
    const rows = await supabaseRest(
      env,
      `app_profiles?select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    )
    const profile = rows?.[0] || null
    if (!profile) return base

    const isAdmin = profile.role === 'admin'
    const isSubscriber =
      isAdmin ||
      (PAID_PLANS.has(profile.plan) && isActiveSubscription(profile.subscription_status))
    const capabilities = planCapabilities(profile.plan, profile.role)
    const locks = capabilityLocks(capabilities)
    const entitlement = entitlementForPlan(profile.plan)
    const showFullNames = isSubscriber && (capabilities.fullEntityNames || profile.role === 'admin')
    const showSourceUrls = isSubscriber && (capabilities.sourceUrls || profile.role === 'admin')
    const showSignalMeta =
      isSubscriber && (capabilities.signalTypeAndState || profile.role === 'admin')
    const allowSourcePreview =
      isSubscriber &&
      String(profile.plan || '').trim() === 'nebula' &&
      !showSourceUrls &&
      profile.role !== 'admin'

    let tierLabel = null
    if (isAdmin) tierLabel = 'Admin · full access'
    else if (isSubscriber) tierLabel = `${entitlement?.label || profile.plan} · active`
    else if (profile.subscription_status === 'past_due') tierLabel = 'Payment past due · preview only'
    else tierLabel = 'Account only · subscribe to unlock'

    return {
      isAuthenticated: true,
      isSubscriber: Boolean(isSubscriber),
      profile,
      capabilities,
      locks,
      showFullNames,
      showSourceUrls,
      showSignalMeta,
      allowBonusPreview: !showFullNames,
      allowSourcePreview,
      browseLimits: browseLimits(profile.plan, profile.role, isSubscriber),
      tierLabel,
    }
  } catch {
    return base
  }
}

export function feedAccessPayload(access) {
  return {
    authenticated: access.isAuthenticated,
    subscriber: access.isSubscriber,
    plan: access.profile?.plan || null,
    subscription_status: access.profile?.subscription_status || 'none',
    capabilities: access.capabilities,
    locks: access.locks,
    tier_label: access.tierLabel,
    browse_limits: access.browseLimits,
    source_preview_available: Boolean(access.allowSourcePreview),
  }
}
