/**
 * Cross-run dedup for Discord/Twitter marketing posts.
 * Skips entity+event+filing_date combinations posted within MARKETING_DEDUP_DAYS (default 14).
 *
 * Storage (first available):
 * - Cloudflare KV binding MARKETING_DEDUP
 * - Workers Cache API (deployed Worker)
 * - .marketing-post-history.json (local Node dry-run scripts)
 */

const HISTORY_CACHE_URL = 'https://vortx-internal/marketing-post-history'
const LOCAL_HISTORY_FILE = '.marketing-post-history.json'
const MAX_HISTORY_ENTRIES = 400

export function isNodeRuntime() {
  return typeof process !== 'undefined' && Boolean(process.versions?.node)
}

export function marketingDedupDays(env) {
  const days = Number(env?.MARKETING_DEDUP_DAYS ?? 14)
  return Number.isFinite(days) && days > 0 ? Math.floor(days) : 14
}

/** Stable key: same company + record type + filing date. */
export function marketingDedupKey(lead) {
  const entityId = String(lead?.entity_id || '').trim()
  if (!entityId) return null
  const eventType = String(lead?.event_type || lead?.recordType || lead?.record_type || 'unknown')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .trim()
  const filingDate = String(lead?.filingDate || lead?.filing_date || '').slice(0, 10) || 'unknown'
  return `${entityId}|${eventType}|${filingDate}`
}

function parseHistory(raw) {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed?.entries) ? parsed.entries : Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function pruneHistory(entries, days) {
  const cutoff = Date.now() - days * 86_400_000
  return entries
    .filter((row) => row?.key && Number(row?.postedAt || 0) >= cutoff)
    .sort((a, b) => Number(b.postedAt) - Number(a.postedAt))
    .slice(0, MAX_HISTORY_ENTRIES)
}

export function isRecentlyPosted(key, history, days) {
  if (!key) return false
  const cutoff = Date.now() - days * 86_400_000
  return (history || []).some((row) => row.key === key && Number(row.postedAt || 0) >= cutoff)
}

export function filterByMarketingDedup(pool, history, days) {
  return (pool || []).filter((lead) => !isRecentlyPosted(marketingDedupKey(lead), history, days))
}

async function loadFromKv(env) {
  const kv = env?.MARKETING_DEDUP
  if (!kv?.get) return null
  const raw = await kv.get('history')
  return parseHistory(raw)
}

async function saveToKv(env, entries) {
  const kv = env?.MARKETING_DEDUP
  if (!kv?.put) return false
  await kv.put('history', JSON.stringify({ entries, updatedAt: new Date().toISOString() }))
  return true
}

async function loadFromCache() {
  if (typeof caches === 'undefined' || !caches.default) return null
  const response = await caches.default.match(HISTORY_CACHE_URL)
  if (!response) return null
  return parseHistory(await response.text())
}

async function saveToCache(entries, days) {
  if (typeof caches === 'undefined' || !caches.default) return false
  const body = JSON.stringify({ entries, updatedAt: new Date().toISOString() })
  await caches.default.put(
    HISTORY_CACHE_URL,
    new Response(body, {
      headers: { 'cache-control': `max-age=${Math.max(days, 1) * 86_400}` },
    }),
  )
  return true
}

async function loadFromLocalFile() {
  if (!isNodeRuntime()) return null
  try {
    const { readFileSync, existsSync } = await import('node:fs')
    if (!existsSync(LOCAL_HISTORY_FILE)) return null
    return parseHistory(readFileSync(LOCAL_HISTORY_FILE, 'utf8'))
  } catch {
    return null
  }
}

async function saveToLocalFile(entries) {
  if (!isNodeRuntime()) return false
  try {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(LOCAL_HISTORY_FILE, JSON.stringify({ entries, updatedAt: new Date().toISOString() }, null, 2))
    return true
  } catch {
    return false
  }
}

export async function loadMarketingPostHistory(env) {
  const days = marketingDedupDays(env)
  const sources = [await loadFromKv(env), await loadFromCache(), await loadFromLocalFile()]
  const merged = []
  const seen = new Set()
  for (const batch of sources) {
    for (const row of batch || []) {
      if (!row?.key || seen.has(row.key)) continue
      seen.add(row.key)
      merged.push(row)
    }
  }
  return pruneHistory(merged, days)
}

export async function recordMarketingPost(
  env,
  lead,
  channel = 'marketing',
  { dryRun = false, history: historyOverride = null } = {},
) {
  if (dryRun) return
  const key = marketingDedupKey(lead)
  if (!key) return

  const days = marketingDedupDays(env)
  const history = pruneHistory(
    historyOverride ?? (await loadMarketingPostHistory(env)),
    days,
  )
  const next = [
    {
      key,
      channel: String(channel || 'marketing'),
      entityId: lead?.entity_id || null,
      name: lead?.name || null,
      eventType: lead?.event_type || lead?.recordType || null,
      filingDate: lead?.filingDate || lead?.filing_date || null,
      postedAt: Date.now(),
    },
    ...history.filter((row) => row.key !== key),
  ]

  const pruned = pruneHistory(next, days)
  if (!(await saveToKv(env, pruned))) {
    await saveToCache(pruned, days)
  }
  await saveToLocalFile(pruned)
}
