#!/usr/bin/env node
/**
 * Verify Stripe + Resend config without printing secrets.
 * Reads .dev.vars from repo root.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const devVarsPath = resolve(root, '.dev.vars')

function readDevVars() {
  if (!existsSync(devVarsPath)) return {}
  const env = {}
  for (const rawLine of readFileSync(devVarsPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

const env = readDevVars()
const site = env.PUBLIC_SITE_URL || 'https://vortxmkt.com'

const checks = [
  ['STRIPE_SECRET_KEY', Boolean(env.STRIPE_SECRET_KEY)],
  ['STRIPE_WEBHOOK_SECRET', Boolean(env.STRIPE_WEBHOOK_SECRET)],
  ['STRIPE_NEBULA_PRICE_ID', Boolean(env.STRIPE_NEBULA_PRICE_ID)],
  ['RESEND_API_KEY', Boolean(env.RESEND_API_KEY)],
  ['SCAN_EMAIL_FROM', Boolean(env.SCAN_EMAIL_FROM || env.SUBSCRIPTION_EMAIL_FROM)],
  ['SUPABASE_SERVICE_ROLE_KEY', Boolean(env.SUPABASE_SERVICE_ROLE_KEY)],
]

console.log('Vortx subscription + email config\n')
for (const [name, ok] of checks) {
  console.log(`  ${ok ? 'OK' : 'MISSING'}  ${name}`)
}

console.log('\nStripe webhook endpoint (register in Stripe Dashboard):')
console.log(`  ${site.replace(/\/$/, '')}/api/stripe-webhook`)

console.log('\nLive probes:')
const webhookGet = await fetch(`${site}/api/stripe-webhook`).then((r) => r.json()).catch(() => ({}))
console.log(`  GET /api/stripe-webhook -> ${webhookGet.ok ? 'ok' : 'check'}`)

const checkoutProbe = await fetch(`${site}/api/stripe-checkout`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ plan: 'nebula', acceptable_use_accepted: true }),
}).then((r) => r.json()).catch(() => ({}))
console.log(
  `  POST /api/stripe-checkout (no auth) -> ${checkoutProbe.error === 'missing_stripe_secret' ? 'STRIPE_SECRET_KEY missing on Worker' : checkoutProbe.url ? 'checkout session ok' : checkoutProbe.error || 'check'}`,
)

if (env.RESEND_API_KEY) {
  const resendDomains = await fetch('https://api.resend.com/domains', {
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}` },
  })
    .then((r) => r.json())
    .catch(() => ({}))
  const verified = (resendDomains.data || []).filter((d) => d.status === 'verified').map((d) => d.name)
  console.log(`  Resend verified domains: ${verified.length ? verified.join(', ') : 'none (verify vortxmkt.com in Resend)'}`)
}

console.log('\nWhere emails live:')
console.log('  - Outbound mail: Resend (not stored in Supabase inbox)')
console.log('  - User accounts: Supabase Auth → Authentication → Users')
console.log('  - Leads: sales_leads table · Subscriptions: app_profiles + checkout_sessions')
console.log('  - Stripe receipts: Stripe Dashboard → Customers')
