/** Resolve Stripe price id from plan slug using Worker env vars. */

const PLAN_PRICE_ENV = {
  scout: 'STRIPE_SCOUT_PRICE_ID',
  sentinel: 'STRIPE_SENTINEL_PRICE_ID',
  nebula: 'STRIPE_NEBULA_PRICE_ID',
  pulsar: 'STRIPE_PULSAR_PRICE_ID',
  supernova: 'STRIPE_SUPERNOVA_PRICE_ID',
  galactic: 'STRIPE_GALACTIC_PRICE_ID',
  custom: 'STRIPE_CUSTOM_PRICE_ID',
  contractor_unlock: 'STRIPE_CONTRACTOR_CHECK_PRICE_ID',
  job_safety_unlock: 'STRIPE_JOB_SAFETY_SCORE_PRICE_ID',
  landlord_unlock: 'STRIPE_LANDLORD_CHECK_PRICE_ID',
}

export function priceIdForPlan(env, plan) {
  const key = PLAN_PRICE_ENV[String(plan || '').trim()]
  if (!key) return null
  const value = String(env[key] || '').trim()
  return value || null
}

export function normalizeCheckoutStatus(stripeSession) {
  const paymentStatus = String(stripeSession?.payment_status || '').toLowerCase()
  const sessionStatus = String(stripeSession?.status || '').toLowerCase()
  if (paymentStatus === 'paid' || sessionStatus === 'complete') return 'completed'
  if (sessionStatus === 'expired') return 'expired'
  if (sessionStatus === 'open') return 'open'
  return sessionStatus || 'open'
}

export async function fetchStripeCheckoutSession(env, sessionId) {
  const id = String(sessionId || '').trim()
  if (!id || !env.STRIPE_SECRET_KEY) return null
  const url = new URL(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`)
  url.searchParams.set('expand[]', 'line_items')
  const response = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) return null
  return payload
}

export async function loadExistingCheckoutRow(env, supabaseRest, sessionId) {
  const rows = await supabaseRest(
    env,
    `checkout_sessions?select=stripe_session_id,plan,price_id,mode,status,email,metadata&stripe_session_id=eq.${encodeURIComponent(sessionId)}&limit=1`,
  ).catch(() => [])
  return rows?.[0] || null
}

export function buildCheckoutSessionRow(env, stripeSession, existing = null) {
  const metadata = stripeSession?.metadata || {}
  const plan = String(metadata.plan || existing?.plan || '').trim()
  const linePriceId = stripeSession?.line_items?.data?.[0]?.price?.id || null
  const priceId = existing?.price_id || linePriceId || priceIdForPlan(env, plan)
  const status = normalizeCheckoutStatus(stripeSession)

  return {
    stripe_session_id: stripeSession.id,
    plan: plan || existing?.plan || 'nebula',
    price_id: priceId,
    mode: stripeSession.mode || existing?.mode || 'subscription',
    status,
    email:
      String(
        stripeSession.customer_details?.email ||
          stripeSession.customer_email ||
          metadata.owner_email ||
          existing?.email ||
          '',
      ).trim() || null,
    metadata: {
      ...(existing?.metadata || {}),
      ...(metadata || {}),
      payment_status: stripeSession.payment_status || null,
      stripe_status: stripeSession.status || null,
      synced_at: new Date().toISOString(),
    },
  }
}
