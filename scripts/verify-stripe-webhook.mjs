#!/usr/bin/env node
/**
 * Verify Stripe webhook wiring and checkout_sessions completion tracking.
 * Does not print secret values.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkoutSessionStatusBreakdown } from '../frontend/functions/lib/checkout-session-store.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const site = process.env.PUBLIC_SITE_URL || 'https://vortxmkt.com'

function readDevVars() {
  const env = {}
  try {
    const text = readFileSync(resolve(root, '.dev.vars'), 'utf8')
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#') || !line.includes('=')) continue
      const [key, ...parts] = line.split('=')
      env[key.trim()] = parts.join('=').trim()
    }
  } catch {
    // optional local file
  }
  return env
}

const env = readDevVars()
env.PUBLIC_SITE_URL = site
env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

async function listStripeWebhookEndpoints(stripeKey) {
  if (!stripeKey) return []
  const response = await fetch('https://api.stripe.com/v1/webhook_endpoints?limit=10', {
    headers: { authorization: `Bearer ${stripeKey}` },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) return []
  return payload.data || []
}

let failed = 0
function check(label, fn) {
  try {
    fn()
    console.log(`ok ${label}`)
  } catch (error) {
    failed += 1
    console.error(`fail ${label}:`, error instanceof Error ? error.message : error)
  }
}

const webhookRes = await fetch(`${site}/api/stripe-webhook`)
const webhookBody = await webhookRes.json().catch(() => ({}))
check('webhook endpoint reachable', () => {
  if (!webhookRes.ok || !webhookBody.ok) throw new Error(`status ${webhookRes.status}`)
})

check('STRIPE_WEBHOOK_SECRET configured locally', () => {
  if (!String(env.STRIPE_WEBHOOK_SECRET || '').trim()) {
    throw new Error('Set STRIPE_WEBHOOK_SECRET in Worker secrets and .dev.vars for local checks')
  }
})

let breakdown = { total: 0, by_status: {}, by_plan: {} }
if (env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  breakdown = await checkoutSessionStatusBreakdown(env)
  console.log('\ncheckout_sessions breakdown (latest 500):')
  console.log(`  total: ${breakdown.total}`)
  console.log(`  by_status: ${JSON.stringify(breakdown.by_status)}`)
  console.log(`  by_plan: ${JSON.stringify(breakdown.by_plan)}`)
  const completed = Number(breakdown.by_status.completed || 0)
  const expired = Number(breakdown.by_status.expired || 0)
  const open = Number(breakdown.by_status.open || 0)
  if (breakdown.total > 0 && completed === 0 && expired > 0) {
    console.log('\nnote: all stored checkout sessions are expired/abandoned (no successful payments in sample yet)')
  } else if (breakdown.total > 10 && completed === 0) {
    console.warn(
      '\nwarn: no completed rows — confirm Stripe Dashboard webhook sends checkout.session.completed to',
    )
    console.warn(`      ${site}/api/stripe-webhook`)
    console.warn('      Events needed: checkout.session.completed, customer.subscription.updated')
  }
} else {
  console.log('\nnote: Supabase not configured locally; skipping checkout_sessions query')
}

const target = `${site.replace(/\/$/, '')}/api/stripe-webhook`
const endpoints = await listStripeWebhookEndpoints(env.STRIPE_SECRET_KEY)
const matched = endpoints.filter((row) => String(row.url || '').replace(/\/$/, '') === target)
if (matched.length) {
  console.log(`\nStripe webhook registered: ${matched.length} endpoint(s) → ${target}`)
  for (const row of matched) {
    console.log(`  id=${row.id} status=${row.status}`)
  }
} else if (env.STRIPE_SECRET_KEY) {
  console.warn(`\nwarn: no Stripe webhook endpoint registered for ${target}`)
  console.warn('      Run: npm run ops:register-stripe-webhook')
}

console.log('\nStripe Dashboard checklist:')
console.log(`  1. Developers → Webhooks → endpoint ${site}/api/stripe-webhook`)
console.log('  2. Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted')
console.log('  3. Signing secret stored as STRIPE_WEBHOOK_SECRET in Worker')
console.log('  4. After a test payment, run: npm run ops:funnel-report')

if (failed) process.exit(1)
