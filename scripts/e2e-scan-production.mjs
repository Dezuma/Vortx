#!/usr/bin/env node
/**
 * End-to-end production blind spot scan verification.
 * Does not print secrets or PII beyond test email prefix.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = process.env.PUBLIC_SITE_URL || 'https://vortxmkt.com'

function readDevVars() {
  const env = {}
  for (const line of readFileSync(resolve(ROOT, '.dev.vars'), 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...parts] = trimmed.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

async function api(path, body) {
  const response = await fetch(`${SITE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await response.json().catch(() => ({}))
  return { status: response.status, json }
}

async function supabase(env, path) {
  const base = String(env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: key, authorization: `Bearer ${key}`, accept: 'application/json' },
  })
  return response.json()
}

const COMPANIES = ['ESS Tech', 'Janus International', 'Trinseo']
const testEmail = `scan-e2e-${Date.now()}@mailinator.com`

console.log('=== Production 3-company scan E2E ===')
console.log('Site:', SITE)
console.log('Companies:', COMPANIES.join(', '))
console.log('Test email prefix:', testEmail.split('@')[0])

const match = await api('/api/scan/match', { names: COMPANIES, mode: 'holdings' })
if (!match.json.ok) throw new Error(`match failed: ${JSON.stringify(match.json)}`)

const confirmed = []
for (const row of match.json.results || []) {
  const top = row.matches?.[0]
  if (top?.entity_id) {
    confirmed.push({ input: row.input, entity_id: top.entity_id, name: top.canonical_name || top.name })
  }
}
console.log('\n1. Match:', confirmed.length, 'of', COMPANIES.length, 'matched')
for (const c of confirmed) console.log('  -', c.input, '→', c.name || c.entity_id)

if (confirmed.length < 3) {
  console.warn('Warning: fewer than 3 matches; continuing with', confirmed.length)
}
if (!confirmed.length) throw new Error('no entities matched')

const entityIds = confirmed.map((c) => c.entity_id)

const results = await api('/api/scan/results', { entity_ids: entityIds, unlock_level: 'teaser' })
console.log('\n2. Results:', results.status, 'entities:', results.json.entities?.length ?? 0)

const unlock = await api('/api/scan/unlock', {
  email: testEmail,
  entity_ids: entityIds,
  mode: 'holdings',
})
console.log('\n3. Unlock:', {
  status: unlock.status,
  ok: unlock.json.ok,
  unlocked: unlock.json.unlocked,
  email_sent: unlock.json.email_sent,
  entities: unlock.json.entities?.length,
})

const env = readDevVars()
const leads = await supabase(
  env,
  `sales_leads?select=id,email,use_case,source,metadata,created_at&email=eq.${encodeURIComponent(testEmail)}&order=created_at.desc&limit=1`,
)
const lead = leads?.[0]
console.log('\n4. sales_leads row:', lead
  ? {
      use_case: lead.use_case,
      source: lead.source,
      scan_funnel: lead.metadata?.scan_funnel,
      entity_count: lead.metadata?.entity_ids?.length,
    }
  : 'NOT FOUND')

const checkout = await api('/api/stripe-checkout', {
  plan: 'scout',
  owner_email: testEmail,
  acceptable_use_accepted: true,
  acceptable_use_accepted_at: new Date().toISOString(),
  scan_entity_ids: entityIds,
})
console.log('\n5. Checkout metadata wiring:', {
  status: checkout.status,
  ok: checkout.json.ok,
  has_url: Boolean(checkout.json.url),
  error: checkout.json.error,
})

let checkoutMeta = null
if (checkout.json.ok && env.STRIPE_SECRET_KEY) {
  const sessionId = checkout.json.url?.match(/(cs_(?:live|test)_[a-zA-Z0-9]+)/)?.[1]
  if (sessionId) {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    })
    const session = await stripeRes.json()
    checkoutMeta = session.metadata?.scan_entity_ids || null
    console.log('   Stripe metadata.scan_entity_ids count:', checkoutMeta?.split(',')?.filter(Boolean)?.length ?? 0)
  }
}

const report = {
  ok:
    unlock.json.ok &&
    unlock.json.email_sent === true &&
    lead?.use_case === 'blind_spot_scan' &&
    lead?.source === 'blind_spot_scan' &&
    (lead?.metadata?.entity_ids?.length || 0) >= entityIds.length &&
    checkout.json.ok,
  match_count: confirmed.length,
  email_sent: unlock.json.email_sent,
  use_case: lead?.use_case,
  checkout_ok: checkout.json.ok,
  watchlist_ids_in_stripe: checkoutMeta,
}

console.log('\n=== Summary ===')
console.log(JSON.stringify(report, null, 2))
process.exit(report.ok ? 0 : 1)
