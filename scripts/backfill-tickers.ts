import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createMemoryTickerCache,
  isValidTicker,
  matchTickerForCompany,
} from '../worker/match-ticker.js'
import { companyNameForTickerMatch, isLikelyTickerMatchName } from '../worker/company-name.js'

type CompanyRow = {
  id: string
  canonical_name: string
  ticker: string | null
}

const BATCH_SIZE = 100
const MAX_ATTEMPTS = 3
const ROOT = resolve(import.meta.dirname, '..')

function readDevVars(): Record<string, string> {
  const env: Record<string, string> = {}
  const text = readFileSync(resolve(ROOT, '.dev.vars'), 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

function requireEnv(env: Record<string, string>, key: string): string {
  const value = String(env[key] || '').trim()
  if (!value) throw new Error(`Missing ${key} in .dev.vars`)
  return value
}

function retryDelayMs(attempt: number): number {
  return Math.min(2_000, 250 * (2 ** attempt))
}

async function withRetries<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt + 1 >= MAX_ATTEMPTS) break
      await new Promise((resolveDelay) => setTimeout(resolveDelay, retryDelayMs(attempt)))
    }
  }
  throw new Error(`${label}:${lastError?.message || 'failed'}`)
}

async function supabaseRequest(
  env: Record<string, string>,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const url = requireEnv(env, 'VITE_SUPABASE_URL').replace(/\/$/, '')
  const serviceKey = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY')
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      accept: 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.msg ||
      payload?.error_description ||
      payload?.error ||
      `HTTP ${response.status}`
    throw new Error(message)
  }
  return payload
}

async function fetchBatch(env: Record<string, string>, afterId: string | null): Promise<CompanyRow[]> {
  const query = new URLSearchParams({
    select: 'id,canonical_name,ticker',
    ticker: 'is.null',
    order: 'id.asc',
    limit: String(BATCH_SIZE),
  })
  if (afterId) query.set('id', `gt.${afterId}`)
  const rows = (await withRetries('fetch_batch', () => supabaseRequest(env, `entities?${query.toString()}`))) as CompanyRow[]
  return Array.isArray(rows) ? rows : []
}

async function updateTicker(env: Record<string, string>, id: string, ticker: string): Promise<void> {
  await withRetries('update_ticker', () =>
    supabaseRequest(env, `entities?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        prefer: 'return=minimal',
      },
      body: JSON.stringify({ ticker }),
    }),
  )
}

async function main() {
  const env = readDevVars()
  const tickerCache = createMemoryTickerCache()
  let afterId: string | null = null
  let scanned = 0
  let matched = 0
  let updated = 0
  let failed = 0

  for (;;) {
    const batch = await fetchBatch(env, afterId)
    if (!batch.length) break

    for (const row of batch) {
      scanned += 1
      if (!isLikelyTickerMatchName(row.canonical_name)) continue
      try {
        const ticker = await matchTickerForCompany(companyNameForTickerMatch(row.canonical_name), tickerCache)
        if (!isValidTicker(ticker)) continue
        matched += 1
        await updateTicker(env, row.id, ticker)
        updated += 1
        console.log(`updated ${row.canonical_name} -> ${ticker}`)
      } catch (error) {
        failed += 1
        console.warn('row_failed', {
          id: row.id,
          company: row.canonical_name.slice(0, 120),
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    afterId = batch[batch.length - 1]?.id || afterId
    if (batch.length < BATCH_SIZE) break
  }

  console.log(
    JSON.stringify(
      {
        ok: failed === 0,
        scanned,
        matched,
        updated,
        failed,
        batch_size: BATCH_SIZE,
      },
      null,
      2,
    ),
  )

  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
