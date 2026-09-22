#!/usr/bin/env node
/**
 * Safety review run (item 4 of the Cases pipeline spec): generate drafts from
 * real historical feed records in DRY RUN mode and print the raw model output
 * plus validation results. Writes NOTHING to the database and publishes nothing.
 *
 * Usage: node scripts/test-case-generation.mjs [count]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateCaseDraft } from '../frontend/functions/lib/case-draft-generator.js'

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
const count = Math.min(10, Math.max(1, Number(process.argv[2] || 8)))
const supabaseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase config in .dev.vars')
if (!env.GOOGLE_AI_STUDIO_API_KEY) throw new Error('Missing GOOGLE_AI_STUDIO_API_KEY in .dev.vars')

async function rest(path) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  })
  if (!response.ok) throw new Error(`supabase ${response.status} for ${path}`)
  return response.json()
}

const warnMin = Number(env.CASE_DRAFT_WARN_MIN_SEVERITY || 65)
const tradeMin = Number(env.CASE_DRAFT_TRADE_MIN_SEVERITY || env.CASE_DRAFT_MIN_SEVERITY || 78)
const focusTypes = ['warn_notice', 'form_4', 'congress_trade']
const [warnEvents, tradeEvents] = await Promise.all([
  rest(
    `legal_events?select=id,entity_id,source_id,event_type,title,summary,jurisdiction,filing_date,amount,severity,confidence&event_type=eq.warn_notice&severity=gte.${warnMin}&order=filing_date.desc&limit=${count}`,
  ),
  rest(
    `legal_events?select=id,entity_id,source_id,event_type,title,summary,jurisdiction,filing_date,amount,severity,confidence&event_type=in.(form_4,congress_trade)&severity=gte.${Math.min(tradeMin, 70)}&order=filing_date.desc&limit=${count * 2}`,
  ),
])
const events = [...(warnEvents || []), ...(tradeEvents || [])].filter((event) =>
  focusTypes.includes(String(event.event_type || '')),
)

// Prefer a mix of WARN + trading types for the review sample.
const byType = new Map()
for (const event of events) {
  const rows = byType.get(event.event_type) || []
  rows.push(event)
  byType.set(event.event_type, rows)
}
const sample = []
while (sample.length < count) {
  let added = false
  for (const type of focusTypes) {
    const rows = byType.get(type) || []
    if (rows.length && sample.length < count) {
      sample.push(rows.shift())
      added = true
    }
  }
  if (!added) break
}

const entityIds = [...new Set(sample.map((event) => event.entity_id).filter(Boolean))]
const sourceIds = [...new Set(sample.map((event) => event.source_id).filter(Boolean))]
const [entities, sources, evidence] = await Promise.all([
  entityIds.length ? rest(`entities?select=id,canonical_name&id=in.(${entityIds.join(',')})`) : [],
  sourceIds.length ? rest(`source_catalog?select=id,name,record_type,source_url&id=in.(${sourceIds.join(',')})`) : [],
  rest(`event_evidence?select=event_id,source_url&event_id=in.(${sample.map((event) => event.id).join(',')})`).catch(() => []),
])
const entityById = new Map(entities.map((row) => [row.id, row]))
const sourceById = new Map(sources.map((row) => [row.id, row]))
const evidenceByEvent = new Map()
for (const row of evidence || []) {
  if (row.source_url && !evidenceByEvent.has(row.event_id)) evidenceByEvent.set(row.event_id, row.source_url)
}

console.log(`Running ${sample.length} DRY RUN generations (severity >= ${minSeverity}). Nothing is saved or published.\n`)

const outputs = []
let pass = 0
for (const [index, event] of sample.entries()) {
  if (index > 0) await new Promise((resolve) => setTimeout(resolve, 14_000))
  const label = `${index + 1}/${sample.length} · ${event.event_type} · severity ${event.severity}`
  try {
    const result = await generateCaseDraft(env, {
      event,
      entity: entityById.get(event.entity_id),
      source: sourceById.get(event.source_id),
      evidenceUrl: evidenceByEvent.get(event.id) || null,
    })
    outputs.push({ label, event_id: event.id, ...result })
    if (result.ok) pass += 1
    console.log(`=== ${label} · ${result.ok ? 'VALIDATION PASS' : 'VALIDATION FAIL'} ===`)
    console.log(`SOURCE: ${JSON.stringify(result.source_fields)}`)
    if (!result.ok) console.log(`ISSUES: ${result.issues.join(' | ')}`)
    console.log(`RAW MODEL OUTPUT:\n${result.raw}\n`)
  } catch (error) {
    outputs.push({ label, event_id: event.id, ok: false, error: error.message })
    console.log(`=== ${label} · ERROR ===\n${error.message}\n`)
  }
}

const outPath = resolve(root, '.case-generation-review.json')
writeFileSync(outPath, JSON.stringify(outputs, null, 2))
console.log(`\n${pass}/${sample.length} drafts passed validation. Full raw outputs saved to ${outPath}`)
console.log('Review the outputs above; nothing was written to case_stories.')
