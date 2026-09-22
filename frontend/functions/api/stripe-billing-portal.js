/**
 * POST /api/stripe-billing-portal
 * Creates a Stripe Customer Portal session for Manage billing.
 */
import { bearerToken, hasSupabase, json, supabaseAuthUser, supabaseRest } from '../lib/supabase-rest.js'

function originFrom(request, env) {
  const configured = String(env.PUBLIC_SITE_URL || '').replace(/\/$/, '')
  if (configured) return configured
  try {
    return new URL(request.url).origin
  } catch {
    return 'https://vortxmkt.com'
  }
}

async function resolveStripeCustomerId(env, { email, profileCustomerId }) {
  if (profileCustomerId) return String(profileCustomerId).trim()
  const key = String(env.STRIPE_SECRET_KEY || '').trim()
  const safeEmail = String(email || '')
    .trim()
    .toLowerCase()
  if (!key || !safeEmail) return ''
  const res = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(safeEmail)}&limit=1`,
    { headers: { authorization: `Bearer ${key}` } },
  )
  const payload = await res.json().catch(() => ({}))
  return String(payload?.data?.[0]?.id || '').trim()
}

export async function onRequestPost({ request, env }) {
  const secret = String(env.STRIPE_SECRET_KEY || '').trim()
  if (!secret) {
    return json({ ok: false, error: 'stripe_unconfigured', message: 'Billing portal unavailable.' }, { status: 503 })
  }

  const token = bearerToken(request)
  if (!token) {
    return json({ ok: false, error: 'auth_required', message: 'Sign in to manage billing.' }, { status: 401 })
  }
  if (!hasSupabase(env)) {
    return json({ ok: false, error: 'supabase_unconfigured' }, { status: 503 })
  }

  let user
  try {
    user = await supabaseAuthUser(env, token)
  } catch {
    return json({ ok: false, error: 'invalid_session', message: 'Session is expired or invalid.' }, { status: 401 })
  }

  const profiles = await supabaseRest(
    env,
    `app_profiles?select=user_id,email,stripe_customer_id&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
  ).catch(() => [])
  const profile = profiles?.[0]
  if (!profile?.email) {
    return json({ ok: false, error: 'profile_missing', message: 'Account profile not found.' }, { status: 404 })
  }

  const customerId = await resolveStripeCustomerId(env, {
    email: profile.email,
    profileCustomerId: profile.stripe_customer_id,
  })
  if (!customerId) {
    return json(
      {
        ok: false,
        error: 'no_customer',
        message: 'No Stripe customer found for this account yet. Complete checkout first.',
      },
      { status: 404 },
    )
  }

  const origin = originFrom(request, env)
  const returnUrl = `${origin}/?view=customer`

  const form = new URLSearchParams()
  form.set('customer', customerId)
  form.set('return_url', returnUrl)

  const stripeRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form,
  })
  const payload = await stripeRes.json().catch(() => ({}))
  if (!stripeRes.ok) {
    return json(
      {
        ok: false,
        error: 'stripe_error',
        message: payload?.error?.message || 'Could not open billing portal.',
      },
      { status: stripeRes.status || 502 },
    )
  }

  return json({ ok: true, url: payload.url })
}

export async function onRequestGet() {
  return json({ ok: true, usage: 'POST /api/stripe-billing-portal with Bearer session' })
}
