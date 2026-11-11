import { PAID_PLANS, supabaseRest } from './supabase-rest.js'

export const BILLING_CLAIM_STATUSES = new Set(['active', 'trialing', 'past_due', 'canceled'])

function stripeId(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object' && value.id) return String(value.id).trim()
  return ''
}

function metadataObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value
}

/**
 * A profile row can only be created with a real auth user id.
 * Logged-out Checkout therefore has to wait until signup.
 */
export function profileActivationTarget(existing) {
  if (existing?.user_id) return 'profile'
  return 'pending_signup'
}

export function profileAcceptsBillingClaim(profile) {
  if (!profile || profile.role === 'admin') return false
  if (!profile.user_id || !profile.email) return false
  return String(profile.subscription_status || 'none').toLowerCase() === 'none'
}

/**
 * Stamp the Checkout row that signup will read.
 * Keeps a subscription status already written by an earlier Stripe event.
 */
export function attachCheckoutClaim(row, stripeSession) {
  if (!row || !PAID_PLANS.has(String(row.plan || '').trim())) return row
  const metadata = { ...metadataObject(row.metadata) }
  const customerId = stripeId(stripeSession?.customer)
  const subscriptionId = stripeId(stripeSession?.subscription)
  if (customerId) metadata.stripe_customer_id = customerId
  if (subscriptionId) metadata.stripe_subscription_id = subscriptionId
  const existing = String(metadata.subscription_status || '').trim().toLowerCase()
  if (!BILLING_CLAIM_STATUSES.has(existing)) metadata.subscription_status = 'active'
  return { ...row, metadata }
}

export function claimFromCheckoutRow(row) {
  if (!row || String(row.status || '').toLowerCase() !== 'completed') return null
  const plan = String(row.plan || '').trim()
  if (!PAID_PLANS.has(plan)) return null
  const metadata = metadataObject(row.metadata)
  const subscriptionStatus = String(metadata.subscription_status || '').trim().toLowerCase()
  if (!BILLING_CLAIM_STATUSES.has(subscriptionStatus)) return null
  return {
    plan,
    subscription_status: subscriptionStatus,
    stripe_customer_id: String(metadata.stripe_customer_id || '').trim() || null,
    stripe_subscription_id: String(metadata.stripe_subscription_id || '').trim() || null,
    stripe_session_id: row.stripe_session_id || null,
  }
}

/** Newest live claim wins. Rows must already be newest-first. */
export function bestBillingClaim(rows) {
  const claims = []
  for (const row of rows || []) {
    const claim = claimFromCheckoutRow(row)
    if (claim) claims.push(claim)
  }
  return (
    claims.find((claim) => claim.subscription_status === 'active' || claim.subscription_status === 'trialing') ||
    claims[0] ||
    null
  )
}

/**
 * Pick the checkout row a later subscription event should update.
 * Never overwrite a different subscription's row.
 */
export function selectCheckoutRowForClaim(rows, { subscriptionId = '', customerId = '', plan = '' } = {}) {
  const list = Array.isArray(rows) ? rows : []
  const sub = String(subscriptionId || '').trim()
  const customer = String(customerId || '').trim()
  if (sub) {
    const match = list.find((row) => String(row?.metadata?.stripe_subscription_id || '') === sub)
    if (match) return match
  }
  if (customer) {
    const match = list.find((row) => {
      if (String(row?.metadata?.stripe_customer_id || '') !== customer) return false
      const rowSub = String(row?.metadata?.stripe_subscription_id || '').trim()
      if (sub && rowSub && rowSub !== sub) return false
      return true
    })
    if (match) return match
  }
  const planId = String(plan || '').trim()
  return (
    list.find((row) => {
      if (!PAID_PLANS.has(String(row?.plan || '').trim())) return false
      if (String(row?.metadata?.stripe_subscription_id || '').trim()) return false
      if (planId && row.plan !== planId) return false
      return true
    }) || null
  )
}

export function mergeClaimMetadata(metadata, { customerId, subscriptionId, subscriptionStatus, plan } = {}) {
  const next = { ...metadataObject(metadata) }
  if (customerId) next.stripe_customer_id = customerId
  if (subscriptionId) next.stripe_subscription_id = subscriptionId
  if (subscriptionStatus) next.subscription_status = subscriptionStatus
  if (plan) next.claim_plan = plan
  return next
}

export async function recordBillingClaim(
  env,
  { email, plan, subscriptionStatus, customerId, subscriptionId } = {},
  { rest = supabaseRest } = {},
) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return { updated: false, reason: 'missing_email' }
  const rows = await rest(
    env,
    `checkout_sessions?select=stripe_session_id,plan,status,email,metadata,created_at&email=ilike.${encodeURIComponent(normalized)}&order=created_at.desc&limit=10`,
  )
  const target = selectCheckoutRowForClaim(rows, { subscriptionId, customerId, plan })
  if (!target?.stripe_session_id) return { updated: false, reason: 'no_checkout' }
  const explicitPlan = PAID_PLANS.has(String(plan || '').trim()) ? String(plan).trim() : ''
  const metadata = mergeClaimMetadata(target.metadata, {
    customerId,
    subscriptionId,
    subscriptionStatus,
    plan: explicitPlan,
  })
  const patch = { metadata }
  if (explicitPlan) patch.plan = explicitPlan
  await rest(env, `checkout_sessions?stripe_session_id=eq.${encodeURIComponent(target.stripe_session_id)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  })
  return { updated: true, stripe_session_id: target.stripe_session_id }
}

export async function applyPendingBillingClaim(env, profile, { rest = supabaseRest } = {}) {
  if (!profileAcceptsBillingClaim(profile)) return profile
  const email = String(profile.email || '').trim().toLowerCase()
  const rows = await rest(
    env,
    `checkout_sessions?select=stripe_session_id,plan,status,email,metadata,created_at&email=ilike.${encodeURIComponent(email)}&status=eq.completed&order=created_at.desc&limit=10`,
  )
  const claim = bestBillingClaim(rows)
  if (!claim) return profile
  const patch = {
    plan: claim.plan,
    subscription_status: claim.subscription_status,
    updated_at: new Date().toISOString(),
  }
  if (claim.stripe_customer_id) patch.stripe_customer_id = claim.stripe_customer_id
  if (claim.stripe_subscription_id) patch.stripe_subscription_id = claim.stripe_subscription_id
  const updated = await rest(env, `app_profiles?user_id=eq.${encodeURIComponent(profile.user_id)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(patch),
  })
  return updated?.[0] || { ...profile, ...patch }
}
