import { hasSupabase, json, PAID_PLANS, supabaseRest } from '../lib/supabase-rest.js'
import { parseEntityIdList, queueScanWatchlistSetup } from '../lib/scan-watchlist.js'
import { sendSubscriptionWelcomeEmail } from '../lib/transactional-email.js'
import { upsertCheckoutSessionRow } from '../lib/checkout-session-store.js'
import {
  buildCheckoutSessionRow,
  fetchStripeCheckoutSession,
  loadExistingCheckoutRow,
  priceIdForPlan,
} from '../lib/stripe-checkout-sync.js'

const PLAN_BY_PRICE_ENV = {
  STRIPE_SCOUT_PRICE_ID: 'scout',
  STRIPE_SENTINEL_PRICE_ID: 'sentinel',
  STRIPE_NEBULA_PRICE_ID: 'nebula',
  STRIPE_PULSAR_PRICE_ID: 'pulsar',
  STRIPE_SUPERNOVA_PRICE_ID: 'supernova',
  STRIPE_GALACTIC_PRICE_ID: 'galactic',
  STRIPE_CUSTOM_PRICE_ID: 'custom',
  STRIPE_CONTRACTOR_CHECK_PRICE_ID: 'contractor_unlock',
  STRIPE_JOB_SAFETY_SCORE_PRICE_ID: 'job_safety_unlock',
  STRIPE_LANDLORD_CHECK_PRICE_ID: 'landlord_unlock',
}

const ONE_TIME_UNLOCK_PLANS = new Set(['contractor_unlock', 'job_safety_unlock', 'landlord_unlock'])

function planFromEnvPrice(env, priceId) {
  const id = String(priceId || '').trim()
  if (!id) return ''
  for (const [key, plan] of Object.entries(PLAN_BY_PRICE_ENV)) {
    if (String(env[key] || '').trim() === id) return plan
  }
  return ''
}

/**
 * Subscription id carried by a billing event.
 * Invoices use `subscription`; subscription objects use `id`.
 * One-time invoices have no subscription id.
 */
export function stripeSubscriptionIdFromEvent(type, object) {
  if (type === 'invoice.payment_failed') {
    const subscription = object?.subscription
    if (typeof subscription === 'string') return subscription.trim()
    if (subscription && typeof subscription === 'object') return String(subscription.id || '').trim()
    return ''
  }
  return String(object?.id || '').trim()
}

/**
 * Status writes apply only to the subscription stored on the profile.
 * checkout.session.completed switches stripe_subscription_id when a new
 * checkout starts. Events for a previous subscription must not cancel,
 * mark past_due, or rewrite the plan of the subscription still on file.
 * Events with no subscription id (one-time unlock invoices) never change it.
 * Profiles that have not stored a subscription id yet still accept the event.
 */
export function subscriptionStatusEventApplies(profile, eventSubscriptionId) {
  const incoming = String(eventSubscriptionId || '').trim()
  if (!incoming) return false
  const current = String(profile?.stripe_subscription_id || '').trim()
  if (!current) return true
  return current === incoming
}

/** Plan slug from subscription metadata or a mapped price. Unknown prices do not change the plan. */
export function resolveSubscriptionPlan(env, object) {
  const fromMeta = String(object?.metadata?.plan || '').trim()
  if (fromMeta && PAID_PLANS.has(fromMeta) && !ONE_TIME_UNLOCK_PLANS.has(fromMeta)) return fromMeta
  const priceId = object?.items?.data?.[0]?.price?.id || object?.items?.data?.[0]?.price || ''
  const fromPrice = planFromEnvPrice(env, priceId)
  if (!fromPrice || ONE_TIME_UNLOCK_PLANS.has(fromPrice) || !PAID_PLANS.has(fromPrice)) return ''
  return fromPrice
}

async function hmacSha256(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

const WEBHOOK_TOLERANCE_SEC = 300

async function verifyStripeSignature(request, env, rawBody) {
  const secret = String(env.STRIPE_WEBHOOK_SECRET || '').trim()
  if (!secret) return false

  const header = request.headers.get('stripe-signature') || ''
  const parts = Object.fromEntries(
    header.split(',').map((piece) => {
      const [key, value] = piece.split('=')
      return [key, value]
    }),
  )

  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const timestampNum = Number(timestamp)
  if (!Number.isFinite(timestampNum)) return false
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - timestampNum)
  if (ageSec > WEBHOOK_TOLERANCE_SEC) return false

  const signed = `${timestamp}.${rawBody}`
  const expected = await hmacSha256(secret, signed)
  return timingSafeEqual(expected, signature)
}

async function loadProfileByEmail(env, email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return null
  const rows = await supabaseRest(
    env,
    `app_profiles?select=user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id&email=eq.${encodeURIComponent(normalized)}&limit=1`,
  )
  return rows?.[0] || null
}

async function profileEmailForStripeCustomer(env, customerId) {
  const id = String(customerId || '').trim()
  if (!id) return ''
  const rows = await supabaseRest(
    env,
    `app_profiles?select=email&stripe_customer_id=eq.${encodeURIComponent(id)}&limit=1`,
  ).catch(() => [])
  return String(rows?.[0]?.email || '').trim().toLowerCase()
}

async function resolveSubscriberEmail(env, object, fallbackEmail = '') {
  const direct = String(
    fallbackEmail || object.metadata?.owner_email || object.customer_email || object.customer_details?.email || '',
  )
    .trim()
    .toLowerCase()
  if (direct) return direct
  return profileEmailForStripeCustomer(env, object.customer)
}

async function upsertCheckout(env, row) {
  const result = await upsertCheckoutSessionRow(env, row)
  if (!result.ok) {
    const error = new Error(result.error || 'checkout_upsert_failed')
    error.code = 'checkout_upsert_failed'
    throw error
  }
  return result
}

async function handleCheckoutSessionCompleted(env, object) {
  const existing = await loadExistingCheckoutRow(env, supabaseRest, object.id)
  let stripeSession = object
  if (!object.line_items?.data?.length) {
    stripeSession = (await fetchStripeCheckoutSession(env, object.id)) || object
  }

  const row = buildCheckoutSessionRow(env, stripeSession, existing)
  if (!row.price_id) {
    row.price_id = priceIdForPlan(env, row.plan)
  }
  row.status = 'completed'

  await upsertCheckout(env, row)

  const email = await resolveSubscriberEmail(env, stripeSession)
  const plan = row.plan

  if (email && !ONE_TIME_UNLOCK_PLANS.has(plan)) {
    await activateProfile(env, email, plan, {
      customerId: stripeSession.customer,
      subscriptionId: stripeSession.subscription,
    })
    await sendSubscriptionWelcomeEmail(env, {
      email,
      plan,
      siteUrl: env.PUBLIC_SITE_URL || 'https://vortxmkt.com',
    }).catch(() => null)
  }

  const scanEntityIds = parseEntityIdList(stripeSession.metadata?.scan_entity_ids || '')
  if (email && scanEntityIds.length && !ONE_TIME_UNLOCK_PLANS.has(plan)) {
    await queueScanWatchlistSetup(env, supabaseRest, {
      email,
      plan,
      entityIds: scanEntityIds,
      source: 'blind_spot_scan_checkout',
    }).catch(() => null)
  }
}

async function activateProfile(env, email, plan, stripeIds = {}) {
  if (!email) return
  const rows = await supabaseRest(env, `app_profiles?email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`)
  const existing = rows?.[0]
  const patch = {
    plan,
    subscription_status: 'active',
    stripe_customer_id: stripeIds.customerId || existing?.stripe_customer_id || null,
    stripe_subscription_id: stripeIds.subscriptionId || existing?.stripe_subscription_id || null,
    updated_at: new Date().toISOString(),
  }

  if (existing?.user_id) {
    await supabaseRest(env, `app_profiles?user_id=eq.${encodeURIComponent(existing.user_id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    return
  }

  await supabaseRest(env, 'app_profiles', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([
      {
        email: email.toLowerCase(),
        role: 'customer',
        ...patch,
      },
    ]),
  })
}

export async function onRequestPost({ request, env }) {
  if (!hasSupabase(env)) {
    return json({ ok: false, error: 'supabase_unconfigured' }, { status: 503 })
  }

  const rawBody = await request.text()
  const valid = await verifyStripeSignature(request, env, rawBody)
  if (!valid) {
    return json({ ok: false, error: 'invalid_signature' }, { status: 400 })
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const type = event.type
  const object = event.data?.object || {}

  try {
    if (type === 'checkout.session.completed') {
      await handleCheckoutSessionCompleted(env, object)
    }

    if (type === 'checkout.session.expired') {
      const existing = await loadExistingCheckoutRow(env, supabaseRest, object.id)
      if (existing) {
        await upsertCheckout(env, {
          stripe_session_id: object.id,
          plan: existing.plan,
          price_id: existing.price_id,
          mode: existing.mode,
          status: 'expired',
          email: existing.email,
          metadata: {
            ...(existing.metadata || {}),
            stripe_status: object.status || 'expired',
            synced_at: new Date().toISOString(),
          },
        })
      }
    }

    if (type === 'customer.subscription.updated' || type === 'customer.subscription.created') {
      const email = await resolveSubscriberEmail(env, object)
      const status = object.status === 'active'
        ? 'active'
        : object.status === 'trialing'
          ? 'trialing'
          : object.status === 'past_due'
            ? 'past_due'
            : 'canceled'
      const plan = resolveSubscriptionPlan(env, object)
      const eventSubscriptionId = stripeSubscriptionIdFromEvent(type, object)
      const profile = email ? await loadProfileByEmail(env, email) : null
      const applies = Boolean(email && profile && subscriptionStatusEventApplies(profile, eventSubscriptionId))
      if (applies) {
        const patch = {
          subscription_status: status,
          stripe_customer_id: object.customer,
          stripe_subscription_id: eventSubscriptionId,
          updated_at: new Date().toISOString(),
        }
        if (plan) patch.plan = plan
        await supabaseRest(env, `app_profiles?email=eq.${encodeURIComponent(email.toLowerCase())}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        })
      }
      if (applies && status === 'trialing' && type === 'customer.subscription.created') {
        try {
          const { recordMarketingStep } = await import('./marketing-track.js')
          await recordMarketingStep(env, {
            step: 'trial_start',
            surface: 'stripe_webhook',
            detail: String(plan || 'nebula').slice(0, 40),
          })
        } catch {
          // Non-blocking analytics
        }
      }
    }

    if (type === 'customer.subscription.deleted' || type === 'invoice.payment_failed') {
      const email = await resolveSubscriberEmail(env, object)
      const eventSubscriptionId = stripeSubscriptionIdFromEvent(type, object)
      const profile = email ? await loadProfileByEmail(env, email) : null
      if (email && profile && subscriptionStatusEventApplies(profile, eventSubscriptionId)) {
        await supabaseRest(env, `app_profiles?email=eq.${encodeURIComponent(email.toLowerCase())}`, {
          method: 'PATCH',
          body: JSON.stringify({
            subscription_status: type === 'invoice.payment_failed' ? 'past_due' : 'canceled',
            updated_at: new Date().toISOString(),
          }),
        })
      }
    }
  } catch (error) {
    return json({ ok: false, error: 'handler_failed', message: error.message }, { status: 500 })
  }

  return json({ ok: true, received: true })
}

export function onRequestGet() {
  return json({ ok: true, message: 'Stripe webhook endpoint.' })
}
