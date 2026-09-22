#!/usr/bin/env node
/**
 * Register production Stripe webhook for vortxmkt.com (idempotent).
 * Prints endpoint id only; writes whsec to a local gitignored file for wrangler upload.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const site = (process.env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
const targetUrl = `${site}/api/stripe-webhook`
const events = [
  'checkout.session.completed',
  'checkout.session.expired',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]

function readDevVars() {
  const env = {}
  const text = readFileSync(resolve(root, '.dev.vars'), 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

const env = readDevVars()
const key = env.STRIPE_SECRET_KEY
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY in .dev.vars')
  process.exit(1)
}

async function stripeForm(path, form) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error?.message || `${path} failed (${response.status})`)
  }
  return payload
}

const listRes = await fetch('https://api.stripe.com/v1/webhook_endpoints?limit=20', {
  headers: { authorization: `Bearer ${key}` },
})
const listPayload = await listRes.json().catch(() => ({}))
if (!listRes.ok) {
  console.error('Could not list Stripe webhook endpoints:', listPayload?.error?.message || listRes.status)
  process.exit(1)
}

let endpoint = (listPayload.data || []).find(
  (row) => String(row.url || '').replace(/\/$/, '') === targetUrl,
)

if (endpoint) {
  console.log(`ok existing webhook endpoint ${endpoint.id} (${endpoint.status})`)
} else {
  const form = new URLSearchParams()
  form.set('url', targetUrl)
  for (const event of events) form.append('enabled_events[]', event)
  endpoint = await stripeForm('webhook_endpoints', form)
  console.log(`ok created webhook endpoint ${endpoint.id}`)
}

const secretPath = resolve(root, '.stripe-webhook-secret.local')
writeFileSync(secretPath, `${endpoint.secret}\n`, { mode: 0o600 })
console.log(`ok wrote signing secret to ${secretPath} (gitignored)`)

const put = spawnSync('npx', ['wrangler', 'secret', 'put', 'STRIPE_WEBHOOK_SECRET'], {
  cwd: root,
  input: `${endpoint.secret}\n`,
  encoding: 'utf8',
  stdio: ['pipe', 'inherit', 'inherit'],
})
if (put.status !== 0) {
  console.error('warn: wrangler secret put failed — run manually:')
  console.error(`  npx wrangler secret put STRIPE_WEBHOOK_SECRET  # paste secret from ${secretPath}`)
  process.exit(put.status || 1)
}

console.log('ok STRIPE_WEBHOOK_SECRET updated on Cloudflare Worker')
console.log(`endpoint url: ${targetUrl}`)
console.log(`enabled events: ${(endpoint.enabled_events || events).join(', ')}`)
