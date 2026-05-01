const plans = {
  nebula: {
    priceEnv: 'STRIPE_NEBULA_PRICE_ID',
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
  if (explicit) return explicit.replace(/\/$/, '')
  return new URL(request.url).origin
}

function isMode(value) {
  return value === 'payment' || value === 'subscription'
}

async function persistCheckoutSession(env, row) {
  const url = String(env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return

  await fetch(`${url}/rest/v1/checkout_sessions?on_conflict=stripe_session_id`, {
    method: 'POST',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify([row]),
  }).catch(() => undefined)
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

  const priceId = String(env[plan.priceEnv] || '').trim()
  if (!priceId) {
    return json(
      {
        ok: false,
        error: 'missing_price',
        message: `Set ${plan.priceEnv} in Cloudflare Pages environment variables.`,
      },
      { status: 503 },
    )
  }

  const customMode = plan.modeEnv ? String(env[plan.modeEnv] || '').trim() : ''
  const mode = isMode(customMode) ? customMode : plan.mode
  const origin = getOrigin(request, env)

  const form = new URLSearchParams()
  form.set('mode', mode)
  form.set('line_items[0][price]', priceId)
  form.set('line_items[0][quantity]', '1')
  form.set('success_url', `${origin}/pricing?checkout=success&plan=${encodeURIComponent(planId)}`)
  form.set('cancel_url', `${origin}/pricing?checkout=cancelled&plan=${encodeURIComponent(planId)}`)
  form.set('allow_promotion_codes', 'true')
  form.set('metadata[plan]', planId)
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
    metadata: {
      payment_status: payload.payment_status || null,
    },
  })

  return json({ ok: true, url: payload.url })
}

export function onRequestGet() {
  return json(
    {
      ok: false,
      error: 'method_not_allowed',
      message: 'POST { "plan": "nebula" | "supernova" | "galactic" | "custom" }',
    },
    { status: 405 },
  )
}
