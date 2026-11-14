import { isEmailConfirmed } from './auth-user-lookup.js'
import { supabaseRest } from './supabase-rest.js'

export const ONE_TIME_UNLOCK_PLANS = new Set([
  'contractor_unlock',
  'job_safety_unlock',
  'landlord_unlock',
])

const GRANTABLE_STATUSES = new Set(['active', 'trialing', 'past_due'])
const CLOSED_STATUSES = new Set(['canceled', 'cancelled', 'unpaid', 'incomplete', 'incomplete_expired'])

export function stripeObjectId(value) {
  if (!value) return null
  if (typeof value === 'string') {
    const id = value.trim()
    return id || null
  }
  if (typeof value === 'object' && value.id) return stripeObjectId(value.id)
  return null
}

/**
 * Paid subscription entitlement stored on a checkout_sessions row.
 * One-time unlocks and canceled subscriptions do not grant desk access.
 */
export function subscriptionGrantFromCheckout(row) {
  if (!row || typeof row !== 'object') return null
  const checkoutStatus = String(row.status || '').trim().toLowerCase()
  if (!['completed', 'complete', 'paid'].includes(checkoutStatus)) return null
  const mode = String(row.mode || 'subscription').trim().toLowerCase()
  if (mode === 'payment') return null
  const plan = String(row.plan || '').trim()
  if (!plan || ONE_TIME_UNLOCK_PLANS.has(plan)) return null

  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  const subscriptionStatus = String(metadata.subscription_status || 'active').trim().toLowerCase()
  if (CLOSED_STATUSES.has(subscriptionStatus) || !GRANTABLE_STATUSES.has(subscriptionStatus)) return null

  return {
    plan,
    subscription_status: subscriptionStatus,
    stripe_customer_id: stripeObjectId(metadata.stripe_customer_id),
    stripe_subscription_id: stripeObjectId(metadata.stripe_subscription_id),
  }
}

/**
 * Whether a checkout.session.completed event can write app_profiles.
 * app_profiles.user_id is the primary key, so a payer with no confirmed
 * account must stay on the checkout row until they prove the inbox.
 */
export function decideProfileActivation({ email, profile, authUser, plan, stripeIds = {}, now = new Date() } = {}) {
  const normalized = String(email || profile?.email || '').trim().toLowerCase()
  const patch = {
    plan,
    subscription_status: 'active',
    stripe_customer_id: stripeObjectId(stripeIds.customerId) || profile?.stripe_customer_id || null,
    stripe_subscription_id: stripeObjectId(stripeIds.subscriptionId) || profile?.stripe_subscription_id || null,
    updated_at: now.toISOString(),
  }

  if (profile?.user_id) {
    if (authUser && !isEmailConfirmed(authUser)) {
      return { action: 'pending', reason: 'email_unconfirmed' }
    }
    return { action: 'patch', userId: profile.user_id, patch }
  }

  if (!authUser?.id || !isEmailConfirmed(authUser)) {
    return { action: 'pending', reason: 'account_missing' }
  }

  return {
    action: 'insert',
    row: {
      user_id: authUser.id,
      email: normalized,
      role: 'customer',
      ...patch,
    },
  }
}

/** Apply a paid checkout only onto a confirmed account that has never been subscribed. */
export function profileEntitlementPatch(currentStatus, grant, { emailConfirmed = false, isAdmin = false } = {}) {
  if (isAdmin || !emailConfirmed || !grant) return null
  const status = String(currentStatus || 'none').trim().toLowerCase()
  if (status !== 'none') return null
  return {
    plan: grant.plan,
    subscription_status: grant.subscription_status,
    stripe_customer_id: grant.stripe_customer_id,
    stripe_subscription_id: grant.stripe_subscription_id,
  }
}

export async function findSubscriptionGrant(env, email, { rest = supabaseRest } = {}) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return null
  const rows = await rest(
    env,
    `checkout_sessions?select=plan,mode,status,email,metadata,created_at&email=eq.${encodeURIComponent(normalized)}&status=eq.completed&order=created_at.desc&limit=10`,
  )
  for (const row of rows || []) {
    const grant = subscriptionGrantFromCheckout(row)
    if (grant) return grant
  }
  return null
}

export async function recordCheckoutSubscriptionState(env, email, state = {}, { rest = supabaseRest } = {}) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return { ok: false, reason: 'missing_email' }
  const rows = await rest(
    env,
    `checkout_sessions?select=stripe_session_id,plan,mode,status,metadata&email=eq.${encodeURIComponent(normalized)}&order=created_at.desc&limit=10`,
  )
  const row = (rows || []).find((item) => {
    const mode = String(item?.mode || 'subscription').trim().toLowerCase()
    const plan = String(item?.plan || '').trim()
    return mode !== 'payment' && !ONE_TIME_UNLOCK_PLANS.has(plan)
  })
  if (!row?.stripe_session_id) return { ok: false, reason: 'no_checkout' }

  const metadata = {
    ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
  }
  if (state.plan) metadata.plan = state.plan
  if (state.subscription_status) metadata.subscription_status = state.subscription_status
  const customerId = stripeObjectId(state.stripe_customer_id)
  const subscriptionId = stripeObjectId(state.stripe_subscription_id)
  if (customerId) metadata.stripe_customer_id = customerId
  if (subscriptionId) metadata.stripe_subscription_id = subscriptionId
  metadata.synced_at = new Date().toISOString()

  await rest(env, `checkout_sessions?stripe_session_id=eq.${encodeURIComponent(row.stripe_session_id)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ metadata }),
  })
  return { ok: true }
}
