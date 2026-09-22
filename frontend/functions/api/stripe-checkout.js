import { parseEntityIdList } from '../lib/scan-watchlist.js'
import { upsertCheckoutSessionRow } from '../lib/checkout-session-store.js'

const plans = {
  scout: {
    priceEnv: 'STRIPE_SCOUT_PRICE_ID',
    mode: 'subscription',
  },
  sentinel: {
    priceEnv: 'STRIPE_SENTINEL_PRICE_ID',
    mode: 'subscription',
  },
  nebula: {
    priceEnv: 'STRIPE_NEBULA_PRICE_ID',
    mode: 'subscription',
  },
  pulsar: {
    priceEnv: 'STRIPE_PULSAR_PRICE_ID',
    mode: 'subscription',
  },
  supernova: {
    priceEnv: 'STRIPE_SUPERNOVA_PRICE_ID',
    mode: 'subscription',
  },
  galactic: {
    priceEnv: 'STRIPE_GALACTIC_PRICE_ID',
    mode: 'subscription',
  },
  custom: {
    priceEnv: 'STRIPE_CUSTOM_PRICE_ID',
    modeEnv: 'STRIPE_CUSTOM_MODE',
    mode: 'payment',
  },
  contractor_unlock: {
    priceEnv: 'STRIPE_CONTRACTOR_CHECK_PRICE_ID',
    mode: 'payment',
  },
  job_safety_unlock: {
    priceEnv: 'STRIPE_JOB_SAFETY_SCORE_PRICE_ID',
    mode: 'payment',
  },
  landlord_unlock: {
    priceEnv: 'STRIPE_LANDLORD_CHECK_PRICE_ID',
    fallbackPriceEnv: 'STRIPE_CONTRACTOR_CHECK_PRICE_ID',
    mode: 'payment',
  },
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  })
}

function getOrigin(request, env) {
  const explicit = String(env.PUBLIC_SITE_URL || '').trim()
  if (explicit) {
    try {
      const url = new URL(explicit)
      if (url.protocol === 'https:' || url.hostname === 'localhost') {
        return url.origin
      }
    } catch {
      // Fall through to request origin for local/dev previews.
    }
  }
  const requestOrigin = new URL(request.url).origin
  return requestOrigin.replace(/\/$/, '')
}

function isMode(value) {
  return value === 'payment' || value === 'subscription'
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

async function persistCheckoutSession(env, row) {
  await upsertCheckoutSessionRow(env, row)
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) {
    return json(
      {
        ok: false,
        error: 'missing_stripe_secret',
        message: 'Set STRIPE_SECRET_KEY in Cloudflare Pages environment variables.',
      },
      { status: 503 },
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const planId = String(body.plan || '').trim()
  const plan = plans[planId]
  if (!plan) {
    return json({ ok: false, error: 'invalid_plan' }, { status: 400 })
  }

  if (body.acceptable_use_accepted !== true) {
    return json(
      {
        ok: false,
        error: 'acceptable_use_required',
        message: 'Acceptable-use acknowledgement is required before checkout.',
      },
      { status: 400 },
    )
  }

  const priceId = String(env[plan.priceEnv] || (plan.fallbackPriceEnv ? env[plan.fallbackPriceEnv] : '') || '').trim()
  if (!priceId) {
    return json(
      {
        ok: false,
        error: 'missing_price',
        message: `Set ${plan.priceEnv}${plan.fallbackPriceEnv ? ` or ${plan.fallbackPriceEnv}` : ''} in Cloudflare Pages environment variables.`,
      },
      { status: 503 },
    )
  }

  const customMode = plan.modeEnv ? String(env[plan.modeEnv] || '').trim() : ''
  const mode = isMode(customMode) ? customMode : plan.mode
  const origin = getOrigin(request, env)
  const ownerEmail = validEmail(body.owner_email) ? String(body.owner_email).trim().toLowerCase() : ''
  const scanEntityIds = parseEntityIdList(body.scan_entity_ids || body.entity_ids || [])
  const acceptedAt = String(body.acceptable_use_accepted_at || new Date().toISOString())
  const returnPath = String(body.return_path || '').trim() || '/pricing'
  const contractorState = String(body.contractor_state || '').trim()
  const jobSafetyState = String(body.job_safety_state || '').trim()
  const landlordState = String(body.landlord_state || '').trim()
  const primaryEntityId = scanEntityIds[0] || ''

  const consumerReturnPlans = new Set(['contractor_unlock', 'job_safety_unlock', 'landlord_unlock'])
  const safeReturnPath = returnPath.startsWith('/') ? returnPath : `/${returnPath}`
  const pricingReturnBase = `${origin}/?view=pricing`

  const successUrl = consumerReturnPlans.has(planId)
    ? `${origin}${safeReturnPath}?unlock=success&session_id={CHECKOUT_SESSION_ID}`
    : returnPath.startsWith('/') && returnPath !== '/pricing'
      ? `${origin}${safeReturnPath}?checkout=success&plan=${encodeURIComponent(planId)}`
      : `${pricingReturnBase}&checkout=success&plan=${encodeURIComponent(planId)}`
  const cancelUrl = consumerReturnPlans.has(planId)
    ? `${origin}${safeReturnPath}?unlock=cancelled`
    : returnPath.startsWith('/') && returnPath !== '/pricing'
      ? `${origin}${safeReturnPath}?checkout=cancelled&plan=${encodeURIComponent(planId)}`
      : `${pricingReturnBase}&checkout=cancelled&plan=${encodeURIComponent(planId)}`

  const form = new URLSearchParams()
  form.set('mode', mode)
  form.set('line_items[0][price]', priceId)
  form.set('line_items[0][quantity]', '1')
  form.set('success_url', successUrl)
  form.set('cancel_url', cancelUrl)
  form.set('allow_promotion_codes', 'true')
  if (mode === 'subscription') {
    form.set('saved_payment_method_options[payment_method_save]', 'enabled')
  }
  // Nebula retail path: 7-day trial with card collected at checkout.
  if (mode === 'subscription' && planId === 'nebula') {
    form.set('subscription_data[trial_period_days]', '7')
  }
  form.set('metadata[plan]', planId)
  form.set('metadata[acceptable_use_accepted]', 'true')
  form.set('metadata[acceptable_use_accepted_at]', acceptedAt)
  if (ownerEmail) {
    form.set('customer_email', ownerEmail)
    form.set('metadata[owner_email]', ownerEmail)
    if (mode === 'subscription') {
      form.set('subscription_data[metadata][owner_email]', ownerEmail)
      form.set('subscription_data[metadata][plan]', planId)
      if (scanEntityIds.length) {
        form.set('subscription_data[metadata][scan_entity_ids]', scanEntityIds.join(','))
      }
    }
  }
  if (scanEntityIds.length) {
    form.set('metadata[scan_entity_ids]', scanEntityIds.join(','))
  }
  if (primaryEntityId) {
    form.set('metadata[entity_id]', primaryEntityId)
  }
  if (contractorState) {
    form.set('metadata[contractor_state]', contractorState)
  }
  if (jobSafetyState) {
    form.set('metadata[job_safety_state]', jobSafetyState)
  }
  if (landlordState) {
    form.set('metadata[landlord_state]', landlordState)
  }
  if (env.STRIPE_PRODUCT_ID) form.set('metadata[product_id]', env.STRIPE_PRODUCT_ID)

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form,
  })

  const payload = await stripeRes.json()
  if (!stripeRes.ok) {
    return json(
      {
        ok: false,
        error: 'stripe_error',
        message: payload?.error?.message || 'Stripe checkout session failed.',
      },
      { status: stripeRes.status },
    )
  }

  await persistCheckoutSession(env, {
    stripe_session_id: payload.id,
    plan: planId,
    price_id: priceId,
    mode,
    status: payload.status || 'created',
    email: ownerEmail || null,
    metadata: {
      payment_status: payload.payment_status || null,
      acceptable_use_accepted: true,
      acceptable_use_accepted_at: acceptedAt,
      scan_entity_ids: scanEntityIds,
    },
  })

  return json({ ok: true, url: payload.url })
}

export function onRequestGet() {
  return json(
    {
      ok: false,
      error: 'method_not_allowed',
      message: 'POST { "plan": "scout" | "sentinel" | "nebula" | "pulsar" | "supernova" | "galactic" | "custom" | "contractor_unlock" | "job_safety_unlock" | "landlord_unlock" }',
    },
    { status: 405 },
  )
}
