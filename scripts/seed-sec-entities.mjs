#!/usr/bin/env node
/**
 * Seed public.entities from SEC company_tickers.json (~12k US-listed names/tickers).
 * Skips tickers already present in entities. Safe to re-run.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMemoryTickerCache, fetchSecTickerEntries, isValidTicker } from '../worker/match-ticker.js'
import { dedupeSecEntries, filterNewSecRows } from '../worker/sec-entity-seed.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BATCH_SIZE = Number(process.env.SEED_BATCH_SIZE || 200)
const DRY_RUN = process.env.DRY_RUN === '1'

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

function requireEnv(env, key) {
  const value = String(env[key] || '').trim()
  if (!value) throw new Error(`Missing ${key} in .dev.vars`)
  return value
}

async function supabaseRequest(env, path, init = {}) {
  const url = requireEnv(env, 'VITE_SUPABASE_URL').replace(/\/$/, '')
  const key = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY')
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: 'application/json',
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`)
  }
  return payload
}

async function loadExistingTickers(env) {
  const tickers = new Set()
  let offset = 0
  const pageSize = 1000

  for (;;) {
    const rows = await supabaseRequest(
      env,
      `entities?select=ticker&ticker=not.is.null&order=ticker.asc&limit=${pageSize}&offset=${offset}`,
    )
    if (!Array.isArray(rows) || !rows.length) break
    for (const row of rows) {
      const ticker = String(row.ticker || '').trim().toUpperCase()
      if (isValidTicker(ticker)) tickers.add(ticker)
    }
    offset += rows.length
    if (rows.length < pageSize) break
  }

  return tickers
}

async function insertBatch(env, rows) {
  if (!rows.length) return 0
  if (DRY_RUN) return rows.length
  await supabaseRequest(env, 'entities', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  })
  return rows.length
}

async function main() {
  const env = readDevVars()
  const cache = createMemoryTickerCache()
  const secEntries = await fetchSecTickerEntries(cache)
  const secRows = dedupeSecEntries(secEntries)
  const existingTickers = await loadExistingTickers(env)
  const toInsert = filterNewSecRows(secRows, existingTickers)

  console.log(
    JSON.stringify(
      {
        sec_entries: secEntries.length,
        sec_unique_tickers: secRows.length,
        existing_tickers: existingTickers.size,
        to_insert: toInsert.length,
        dry_run: DRY_RUN,
      },
      null,
      2,
    ),
  )

  let inserted = 0
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    inserted += await insertBatch(env, batch)
    if ((i / BATCH_SIZE) % 5 === 0 || i + BATCH_SIZE >= toInsert.length) {
      console.log(`progress: ${Math.min(i + batch.length, toInsert.length)}/${toInsert.length}`)
    }
  }

  console.log(JSON.stringify({ ok: true, inserted, dry_run: DRY_RUN }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
