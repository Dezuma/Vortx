#!/usr/bin/env node
/**
 * Insert and verify a probe row in query_audit_events (no secret values printed).
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const probeQuery = '/ops/audit-probe'

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

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .dev.vars')
  process.exit(1)
}

const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  'content-type': 'application/json',
  prefer: 'return=representation',
}

async function rest(path, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  })
  const body = await response.json().catch(() => null)
  return { response, body }
}

const insert = await rest('query_audit_events', {
  method: 'POST',
  body: JSON.stringify([
    {
      subscriber_email: 'ops-probe@vortxmkt.com',
      surface: 'api',
      query: probeQuery,
      result_count: 0,
    },
  ]),
})

if (!insert.response.ok) {
  console.error(`Insert failed: HTTP ${insert.response.status}`)
  if (insert.body?.message) console.error(insert.body.message)
  console.error('See supabase/query_audit_events.sql for expected columns.')
  process.exit(1)
}

const row = Array.isArray(insert.body) ? insert.body[0] : insert.body
const rowId = row?.id
if (!rowId || row.query !== probeQuery) {
  console.error('Insert response missing expected probe row.')
  process.exit(1)
}

console.log(`Inserted probe audit row: ${rowId}`)

await rest(`query_audit_events?id=eq.${encodeURIComponent(rowId)}`, { method: 'DELETE' })
console.log('Cleaned up probe row.')

console.log('Audit log write path OK.')
