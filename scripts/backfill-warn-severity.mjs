#!/usr/bin/env node
/** Recompute WARN notice severity/titles from worker counts in existing legal_events rows. */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildWarnTitle,
  extractAffectedWorkers,
  warnConfidenceFromWorkers,
  warnSeverityFromWorkers,
} from '../frontend/functions/lib/warn-notice.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readDevVars() {
  const env = {}
  for (const rawLine of readFileSync(resolve(root, '.dev.vars'), 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

const env = readDevVars()
const base = String(env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!base || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .dev.vars')
  process.exit(1)
}

const headers = {
  apikey: key,
  authorization: `Bearer ${key}`,
  'content-type': 'application/json',
  prefer: 'return=minimal',
}

async function fetchAllWarnEvents() {
  const rows = []
  let offset = 0
  const pageSize = 500
  while (true) {
    const res = await fetch(
      `${base}/rest/v1/legal_events?select=id,entity_id,title,summary,severity,confidence,amount&event_type=eq.warn_notice&order=filing_date.desc&limit=${pageSize}&offset=${offset}`,
      { headers: { apikey: key, authorization: `Bearer ${key}` } },
    )
    const batch = await res.json()
    if (!res.ok) throw new Error(JSON.stringify(batch))
    if (!batch.length) break
    rows.push(...batch)
    if (batch.length < pageSize) break
    offset += pageSize
  }
  return rows
}

const events = await fetchAllWarnEvents()
let updated = 0
let skipped = 0

for (const event of events) {
  const workers = extractAffectedWorkers(event.summary) || (event.amount ? Number(event.amount) : null)
  const severity = warnSeverityFromWorkers(workers)
  const confidence = warnConfidenceFromWorkers(workers)
  const titleMatch = String(event.title || '').match(/^WARN notice references (.+)$/)
  const entityName = titleMatch?.[1] || null
  const title = entityName ? buildWarnTitle(entityName, workers) : event.title

  if (event.severity === severity && event.confidence === confidence && event.title === title) {
    skipped += 1
    continue
  }

  const patch = await fetch(`${base}/rest/v1/legal_events?id=eq.${encodeURIComponent(event.id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      severity,
      confidence,
      title,
      amount: workers ?? event.amount ?? null,
    }),
  })
  if (!patch.ok) {
    console.error('patch failed', event.id, await patch.text())
    continue
  }
  updated += 1

  if (event.entity_id) {
    await fetch(`${base}/rest/v1/friction_scores?entity_id=eq.${encodeURIComponent(event.entity_id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        score: Math.min(100, Math.max(severity, 35)),
        confidence: Math.min(100, confidence),
      }),
    }).catch(() => undefined)
  }
}

console.log(JSON.stringify({ ok: true, total: events.length, updated, skipped }, null, 2))
