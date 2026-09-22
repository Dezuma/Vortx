#!/usr/bin/env node
/**
 * Conversion funnel snapshot from Supabase (no secrets printed).
 * Usage: node scripts/funnel-report.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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
const supabaseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

async function rest(path, opts = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      accept: 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status}`)
  }
  return response.json()
}

function pct(n, d) {
  if (!d) return '0%'
  return `${((n / d) * 100).toFixed(1)}%`
}

function groupCounts(rows, keyFn) {
  const map = new Map()
  for (const row of rows || []) {
    const key = keyFn(row)
    map.set(key, (map.get(key) || 0) + 1)
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1]))
}

function funnelSteps(rows, surface) {
  const filtered = (rows || []).filter((row) => row.surface === surface)
  const steps = groupCounts(filtered, (row) => String(row.query || '').split(':')[0])
  return steps
}

function stepRate(steps, from, to) {
  const a = steps[from] || 0
  const b = steps[to] || 0
  return { from: a, to: b, rate: pct(b, a) }
}

const [audits, checkouts, leads, profiles] = await Promise.all([
  rest('query_audit_events?select=surface,query,created_at&order=created_at.desc&limit=500'),
  rest('checkout_sessions?select=plan,status,created_at&order=created_at.desc&limit=200'),
  rest('sales_leads?select=use_case,source,created_at,metadata&order=created_at.desc&limit=200'),
  rest('app_profiles?select=plan,subscription_status,created_at&order=created_at.desc&limit=50'),
])

const completedStatuses = new Set(['complete', 'completed', 'paid'])
const completedCheckouts = (checkouts || []).filter((row) =>
  completedStatuses.has(String(row.status || '').toLowerCase()),
)

const contractor = funnelSteps(audits, 'contractor_check')
const jobSafety = funnelSteps(audits, 'job_safety_score')
const landlord = funnelSteps(audits, 'landlord_check')
const marketing = funnelSteps(audits, 'marketing_site')

const scanLeads = (leads || []).filter(
  (row) => String(row.metadata?.scan_funnel || row.use_case || '').includes('scan'),
)

console.log('=== Vortx conversion funnel (recent sample) ===\n')

console.log('Billing')
console.log(`  checkout_sessions (sample): ${checkouts.length}`)
console.log(`  completed/paid: ${completedCheckouts.length} (${pct(completedCheckouts.length, checkouts.length)} of sample)`)
console.log(`  by plan: ${JSON.stringify(groupCounts(checkouts, (r) => r.plan))}`)
console.log(`  active subscribers (profiles): ${(profiles || []).filter((p) => ['active', 'trialing'].includes(p.subscription_status)).length}`)
console.log('')

console.log('Consumer tools (query_audit_events, last 500 rows)')
for (const [label, steps] of [
  ['Contractor Check', contractor],
  ['Job Safety Score', jobSafety],
  ['Landlord Check', landlord],
]) {
  const views = steps.page_view || 0
  const searches = steps.search || 0
  const found = steps.results_found || 0
  const unlockClick = steps.unlock_click || 0
  const unlockPaid = steps.unlock_paid || 0
  console.log(`  ${label}`)
  console.log(`    page_view: ${views}`)
  console.log(`    search: ${searches} (${pct(searches, views)} of views)`)
  console.log(`    results_found: ${found} (${pct(found, searches)} of searches)`)
  console.log(`    unlock_click: ${unlockClick} (${pct(unlockClick, found)} of results)`)
  console.log(`    unlock_paid: ${unlockPaid} (${pct(unlockPaid, unlockClick)} of unlock clicks)`)
}
console.log('')

console.log('Marketing site (new tracking)')
console.log(`  steps: ${JSON.stringify(marketing)}`)
const unlockCta = (marketing.unlock_cta_click || 0) + (marketing.locked_card_click || 0)
const aupShown = marketing.aup_shown || 0
const aupAccept = marketing.aup_accept || 0
const checkoutClick = marketing.checkout_click || 0
const checkoutSuccess = marketing.checkout_success_view || 0
const proofView = marketing.public_proof_view || 0
const alertSubmit = marketing.alert_email_submit || 0
console.log('  Nebula funnel drops (sample)')
console.log(`    public_proof_view: ${proofView}`)
console.log(`    unlock/locked clicks: ${unlockCta} (${pct(unlockCta, proofView)} of proof views)`)
console.log(`    aup_shown: ${aupShown} (${pct(aupShown, unlockCta || checkoutClick)} of unlock interest)`)
console.log(`    aup_accept: ${aupAccept} (${pct(aupAccept, aupShown)} of AUP shown)`)
console.log(`    checkout_click: ${checkoutClick} (${pct(checkoutClick, aupAccept || unlockCta)} after AUP/unlock)`)
console.log(`    checkout_success_view: ${checkoutSuccess} (${pct(checkoutSuccess, checkoutClick)} of checkout clicks)`)
console.log(`    alert_email_submit: ${alertSubmit}`)
console.log(`    unlock_cta → checkout: ${stepRate(marketing, 'unlock_cta_click', 'checkout_click').rate}`)
console.log(`    aup_shown → aup_accept: ${stepRate(marketing, 'aup_shown', 'aup_accept').rate}`)
console.log(`    checkout_click → success view: ${stepRate(marketing, 'checkout_click', 'checkout_success_view').rate}`)
console.log('')

const alertLeads = (leads || []).filter(
  (row) =>
    String(row.source || '') === 'congress_alerts' ||
    String(row.metadata?.intent || '') === 'congress_alerts',
)

console.log('Scan leads')
console.log(`  sales_leads total (sample): ${leads.length}`)
console.log(`  blind_spot_scan leads: ${scanLeads.length}`)
console.log(`  congress/trade alert waitlist: ${alertLeads.length}`)
console.log(`  use_cases: ${JSON.stringify(groupCounts(leads, (r) => r.use_case || 'unknown'))}`)
console.log('')

console.log('Notes')
console.log('  - No GA/Plausible; rates use internal audit tables only.')
console.log('  - Consumer unlock_paid requires Stripe return + verify-unlock.')
console.log('  - Watch unlock_cta_click → aup_shown → checkout_click for Nebula leaks.')
console.log('  - Subscription conversion = completed checkout_sessions / checkout_click (marketing) when tracked.')
