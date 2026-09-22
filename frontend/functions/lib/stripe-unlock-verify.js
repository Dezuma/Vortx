/** Shared Stripe Checkout session verification for $5 consumer unlock flows. */

export async function loadPaidUnlockSession(env, sessionId, expectedPlan, entityIdHint = '') {
  const id = String(sessionId || '').trim()
  if (!id) {
    return { ok: false, error: 'missing_session', message: 'session_id is required.' }
  }
  if (!env.STRIPE_SECRET_KEY) {
    return { ok: false, error: 'stripe_unconfigured', message: 'Stripe is not configured.' }
  }

  const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  })
  const session = await stripeRes.json().catch(() => ({}))
  if (!stripeRes.ok) {
    return { ok: false, error: 'stripe_lookup_failed', message: 'Could not verify payment.' }
  }

  const paid = session.payment_status === 'paid' || session.status === 'complete'
  const plan = String(session.metadata?.plan || '')
  const metaEntity = String(session.metadata?.entity_id || session.metadata?.scan_entity_ids || '')
    .split(',')[0]
    .trim()
  const entityId = String(entityIdHint || metaEntity || '').trim()
  const state = String(
    session.metadata?.contractor_state ||
      session.metadata?.job_safety_state ||
      session.metadata?.landlord_state ||
      '',
  ).trim()

  if (!paid || plan !== expectedPlan || !entityId || metaEntity !== entityId) {
    return {
      ok: false,
      error: 'payment_not_verified',
      message: 'Payment not verified for this unlock.',
    }
  }

  return { ok: true, entityId, state, session }
}
