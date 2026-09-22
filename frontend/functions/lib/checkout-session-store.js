import { supabaseRest } from './supabase-rest.js'

function compactRow(row) {
  const payload = { ...row, updated_at: new Date().toISOString() }
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key]
  }
  return payload
}

/** Upsert checkout_sessions by stripe_session_id (matches stripe-checkout persist). */
export async function upsertCheckoutSessionRow(env, row) {
  const stripeSessionId = String(row.stripe_session_id || '').trim()
  if (!stripeSessionId) return { ok: false, error: 'missing_stripe_session_id' }

  const payload = compactRow(row)
  if (!payload.price_id) {
    delete payload.price_id
  }

  try {
    await supabaseRest(env, `checkout_sessions?on_conflict=stripe_session_id`, {
      method: 'POST',
      headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([payload]),
    })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Fall back to PATCH when merge insert fails (e.g. missing price_id on first insert).
    try {
      const patch = { ...payload }
      delete patch.stripe_session_id
      await supabaseRest(
        env,
        `checkout_sessions?stripe_session_id=eq.${encodeURIComponent(stripeSessionId)}`,
        {
          method: 'PATCH',
          headers: { prefer: 'return=minimal' },
          body: JSON.stringify(patch),
        },
      )
      return { ok: true, via: 'patch' }
    } catch (patchError) {
      const patchMessage = patchError instanceof Error ? patchError.message : String(patchError)
      return { ok: false, error: patchMessage || message }
    }
  }
}

export async function checkoutSessionStatusBreakdown(env) {
  const rows = await supabaseRest(
    env,
    'checkout_sessions?select=status,plan,created_at,stripe_session_id&order=created_at.desc&limit=500',
  ).catch(() => [])

  const byStatus = {}
  const byPlan = {}
  for (const row of rows || []) {
    const status = String(row.status || 'unknown')
    const plan = String(row.plan || 'unknown')
    byStatus[status] = (byStatus[status] || 0) + 1
    byPlan[plan] = (byPlan[plan] || 0) + 1
  }

  return {
    total: (rows || []).length,
    by_status: byStatus,
    by_plan: byPlan,
    latest_at: rows?.[0]?.created_at || null,
    rows: rows || [],
  }
}
