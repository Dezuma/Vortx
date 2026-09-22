#!/usr/bin/env node
/**
 * Sync checkout_sessions.status from Stripe (backfill + reliability repair).
 * Does not print secret values.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { upsertCheckoutSessionRow, checkoutSessionStatusBreakdown } from '../frontend/functions/lib/checkout-session-store.js'
import { buildCheckoutSessionRow, fetchStripeCheckoutSession } from '../frontend/functions/lib/stripe-checkout-sync.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const site = process.env.PUBLIC_SITE_URL || 'https://vortxmkt.com'

function readDevVars() {
  const env = { PUBLIC_SITE_URL: site }
  try {
    const text = readFileSync(resolve(root, '.dev.vars'), 'utf8')
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#') || !line.includes('=')) continue
      const [key, ...parts] = line.split('=')
      env[key.trim()] = parts.join('=').trim()
    }
  } catch {
    // optional
  }
  return env
}

const env = readDevVars()
if (!env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY in .dev.vars')
  process.exit(1)
}
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .dev.vars')
  process.exit(1)
}

async function listStripeWebhookEndpoints() {
  const response = await fetch('https://api.stripe.com/v1/webhook_endpoints?limit=10', {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Stripe webhook list ${response.status}`)
  }
  return payload.data || []
}

const before = await checkoutSessionStatusBreakdown(env)
console.log('Before sync:', before.by_status)

const endpoints = await listStripeWebhookEndpoints()
const target = `${site.replace(/\/$/, '')}/api/stripe-webhook`
const matched = endpoints.filter((row) => String(row.url || '').replace(/\/$/, '') === target)
console.log(`\nStripe webhook endpoints matching ${target}: ${matched.length}`)
for (const row of matched) {
  console.log(`  id=${row.id} status=${row.status} events=${(row.enabled_events || []).join(', ')}`)
}
if (!matched.length) {
  console.warn('\nwarn: no Stripe webhook endpoint registered for production URL')
  console.warn('      Create one in Stripe Dashboard or via API for checkout.session.completed')
}

let updated = 0
let completed = 0
let expired = 0
let failed = 0

for (const row of before.rows || []) {
  const sessionId = row.stripe_session_id
  if (!sessionId) continue
  const stripeSession = await fetchStripeCheckoutSession(env, sessionId)
  if (!stripeSession?.id) {
    failed += 1
    continue
  }
  const next = buildCheckoutSessionRow(env, stripeSession, row)
  if (next.status === row.status && next.status !== 'completed') continue
  const result = await upsertCheckoutSessionRow(env, next)
  if (!result.ok) {
    failed += 1
    continue
  }
  updated += 1
  if (next.status === 'completed') completed += 1
  if (next.status === 'expired') expired += 1
}

const after = await checkoutSessionStatusBreakdown(env)
console.log('\nSync results:')
console.log(`  rows_updated: ${updated}`)
console.log(`  newly_completed: ${completed}`)
console.log(`  marked_expired: ${expired}`)
console.log(`  fetch_or_upsert_failed: ${failed}`)
console.log('After sync:', after.by_status)
