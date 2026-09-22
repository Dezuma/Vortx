#!/usr/bin/env node
/**
 * Operational health check for Vortx (API + Supabase table probes).
 * Does not print secret values.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

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

const site = process.env.PUBLIC_SITE_URL || 'https://vortxmkt.com'
const env = readDevVars()
const supabaseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

async function probeApi(path, token) {
  const headers = token ? { authorization: `Bearer ${token}` } : {}
  let response
  let body
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(`${site}${path}`, { headers })
    body = await response.json().catch(() => ({}))
    if (response.status !== 404 || attempt > 0) break
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 750))
  }
  return { path, status: response.status, ok: body.ok, error: body.error }
}

async function countTable(table, idColumn = 'id') {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(idColumn)}&limit=1`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      prefer: 'count=exact',
    },
  })
  const range = response.headers.get('content-range') || ''
  const match = range.match(/\/(\d+)$/)
  return { table, status: response.status, count: match ? Number(match[1]) : null }
}

const checks = [
  '/api/health',
  '/api/filer-portrait?type=form_4',
  '/api/friction-feed',
  '/api/source-transparency',
  '/api/customer/dashboard',
  '/api/admin/dashboard',
  '/api/admin/stream-pulse',
  '/api/request-access',
  '/api/scan/match',
  '/api/scan/results',
  '/api/scan/unlock',
  '/api/contractor-check',
  '/api/job-safety-score',
  '/api/enterprise/map/signals',
]

console.log(`Site: ${site}`)
console.log('\nAPI routes:')
for (const path of checks) {
  const result = await probeApi(path, 'invalid-token-test')
  const note =
    path.includes('dashboard') && result.status === 401
      ? 'auth gate ok'
      : path.includes('dashboard') && result.status === 404
        ? 'MISSING ROUTE'
        : result.status === 200 || result.status === 401 || result.status === 403
          ? 'ok'
          : 'check'
  console.log(`  ${path} -> ${result.status} (${note})`)
}

console.log('\nSupabase row counts:')
for (const table of [
  'entities',
  'legal_events',
  'source_catalog',
  'friction_scores',
  'sales_leads',
  'service_requests',
  'checkout_sessions',
  'query_audit_events',
  'app_profiles',
  'map_signal_locations',
  'map_cross_signals',
  'api_subscribers',
]) {
  const idColumn =
    table === 'app_profiles'
      ? 'user_id'
      : table === 'map_signal_locations'
        ? 'event_id'
        : 'id'
  const result = await countTable(table, idColumn)
  const countLabel = result.status === 200 || result.status === 206 ? result.count : 'error ' + result.status
  const auditHint = table === 'query_audit_events' && result.count === 0 ? ' (run npm run ops:verify-audit)' : ''
  console.log(`  ${result.table}: ${countLabel}${auditHint}`)
}

const publicSignals = await fetch(`${site}/api/public-signals`).then((r) => r.json()).catch(() => ({}))
const sampleSlug = publicSignals.signals?.[0]?.signal_slug || ''
const opaqueSlugOk = /^sig-[0-9a-f-]{36}$/i.test(sampleSlug)
console.log(`\nPublic signal slugs: ${opaqueSlugOk ? 'opaque OK' : sampleSlug ? 'legacy name slug — redeploy needed' : 'no signals'}`)
if (sampleSlug && !opaqueSlugOk) {
  console.log('  Expected sig-{uuid} format; legacy name-based URLs leak entity names in paths.')
}

const feed = await fetch(`${site}/api/friction-feed`).then((r) => r.json())
console.log(`\nFriction feed: ${feed.entities?.length ?? 0} entities, ${feed.events?.length ?? 0} events (source=${feed.source})`)

const mapViewport = await fetch(
  `${site}/api/map/signals?bounds=${encodeURIComponent('-125,32,-114,42')}`,
).then((r) => r.json())
const mapSignalId = mapViewport.features?.[0]?.properties?.id || ''
const mapDetail = mapSignalId
  ? await fetch(`${site}/api/map/signal?id=${encodeURIComponent(mapSignalId)}`).then((r) =>
      r.json(),
    )
  : {}
const mapGuestGateOk =
  mapDetail?.access?.masked === true &&
  mapDetail?.signal?.entityName == null &&
  mapDetail?.signal?.sourceUrl == null
if (!mapViewport.ok || !mapSignalId || !mapGuestGateOk) {
  throw new Error('Map viewport/detail gate check failed')
}
console.log(
  `Map: ${mapViewport.features.length} western viewport points; guest detail mask OK`,
)
const mapApiDocs = await fetch(`${site}/docs/map-api.html`)
if (!mapApiDocs.ok) throw new Error('Enterprise map API docs are unavailable')
console.log(`Enterprise map API docs: ${mapApiDocs.status} (ok)`)

const streamPulseProbe = await probeApi('/api/admin/stream-pulse', 'invalid-token-test')
console.log(
  `\nAdmin stream pulse: ${streamPulseProbe.status} (${streamPulseProbe.status === 401 || streamPulseProbe.status === 403 ? 'auth gate ok' : streamPulseProbe.status === 200 ? 'unexpected public access' : 'check'})`,
)

const sources = await fetch(`${site}/api/source-transparency`).then((r) => r.json())
const enabled = (sources.sources || []).filter((s) => s.enabled).length
console.log(`Enabled sources: ${enabled}/${sources.sources?.length ?? 0}`)

console.log('\nAdmin bootstrap: npm run admin:bootstrap (requires VORTX_ADMIN_* in .dev.vars)')
console.log('Audit probe: npm run ops:verify-audit (writes test row to query_audit_events)')
console.log('Funnel report: npm run ops:funnel-report')
console.log('Stripe sync: npm run ops:sync-stripe-checkouts')
console.log('Admin UI: https://vortxmkt.com/?view=admin')
console.log('Customer UI: https://vortxmkt.com/?view=customer')
