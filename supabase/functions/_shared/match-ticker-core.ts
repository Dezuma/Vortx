export const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json'
export const SEC_USER_AGENT = 'VortxMkt contact@vortxmkt.com'
export const TICKER_CACHE_KEY = 'sec:company_tickers:v1'
export const TICKER_CACHE_TTL_SECONDS = 86_400
export const SEC_FETCH_TIMEOUT_MS = 20_000
export const SEC_FETCH_MAX_ATTEMPTS = 3
export const MIN_SEC_ENTRY_COUNT = 1_000
/** Minimum normalized similarity score (0–1) before returning a ticker match. */
export const MATCH_CONFIDENCE_THRESHOLD = 0.94
/** Required gap between best and second-best match unless best is near-exact. */
export const MATCH_CONFIDENCE_MARGIN = 0.05
export const MATCH_NEAR_EXACT_SCORE = 0.97

export type SecTickerEntry = {
  cik_str: number
  ticker: string
  title: string
}

export type TickerCachePayload = {
  fetchedAt: number
  entries: SecTickerEntry[]
}

export type TickerCacheStore = {
  get(): Promise<TickerCachePayload | null>
  put(payload: TickerCachePayload): Promise<void>
}

const LEGAL_SUFFIX_RE =
  /\b(llc|l\.l\.c\.?|inc\.?|incorporated|corp\.?|corporation|co\.?|company|ltd\.?|limited|lp|l\.p\.|llp|l\.l\.p\.?|pllc|plc|holdings?|group)\b/gi

const VALID_TICKER_RE = /^[A-Z]{1,5}([.-][A-Z]{1,2})?$/

let secFetchInFlight: Promise<SecTickerEntry[]> | null = null

/** Lowercase, strip legal suffixes and punctuation for fuzzy comparison. */
export function normalizeCompanyName(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(LEGAL_SUFFIX_RE, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isValidTicker(value: string | null | undefined): value is string {
  return typeof value === 'string' && VALID_TICKER_RE.test(value.trim())
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeCompanyName(value).split(' ').filter(Boolean))
}

function tokenJaccard(a: string, b: string): number {
  const left = tokenSet(a)
  const right = tokenSet(b)
  if (!left.size || !right.size) return 0
  let intersection = 0
  for (const token of left) {
    if (right.has(token)) intersection += 1
  }
  const union = left.size + right.size - intersection
  return union ? intersection / union : 0
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  const rows = a.length + 1
  const cols = b.length + 1
  const matrix = Array.from({ length: rows }, () => new Array<number>(cols).fill(0))
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }
  const distance = matrix[a.length][b.length]
  return 1 - distance / Math.max(a.length, b.length)
}

export function matchConfidence(companyName: string, secTitle: string): number {
  const query = normalizeCompanyName(companyName)
  const candidate = normalizeCompanyName(secTitle)
  if (!query || !candidate) return 0
  if (query === candidate) return 1
  if (candidate.includes(query) || query.includes(candidate)) {
    const shorter = Math.min(query.length, candidate.length)
    const longer = Math.max(query.length, candidate.length)
    const containment = shorter / longer
    return Math.max(containment, tokenJaccard(query, candidate))
  }
  const jaccard = tokenJaccard(query, candidate)
  const edit = levenshteinRatio(query, candidate)
  return Math.max(jaccard, edit * 0.95)
}

function cacheIsFresh(payload: TickerCachePayload | null): payload is TickerCachePayload {
  if (!payload?.entries?.length) return false
  const ageMs = Date.now() - payload.fetchedAt
  return ageMs >= 0 && ageMs < TICKER_CACHE_TTL_SECONDS * 1000
}

function parseSecPayload(payload: unknown): SecTickerEntry[] {
  if (!payload || typeof payload !== 'object') return []
  return Object.values(payload as Record<string, SecTickerEntry>).filter(
    (row) =>
      row &&
      typeof row.ticker === 'string' &&
      typeof row.title === 'string' &&
      isValidTicker(row.ticker.trim().toUpperCase()),
  ).map((row) => ({
    cik_str: row.cik_str,
    ticker: row.ticker.trim().toUpperCase(),
    title: row.title,
  }))
}

function retryDelayMs(attempt: number): number {
  return Math.min(2_000, 250 * (2 ** attempt))
}

async function fetchSecPayloadFromNetwork(): Promise<SecTickerEntry[]> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < SEC_FETCH_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SEC_FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(SEC_TICKERS_URL, {
        headers: {
          'User-Agent': SEC_USER_AGENT,
          Accept: 'application/json',
        },
        signal: controller.signal,
      })

      if (response.status === 429 || response.status >= 500) {
        throw new Error(`sec_ticker_fetch_failed:${response.status}`)
      }
      if (!response.ok) {
        throw new Error(`sec_ticker_fetch_failed:${response.status}`)
      }

      const payload = await response.json()
      const entries = parseSecPayload(payload)
      if (entries.length < MIN_SEC_ENTRY_COUNT) {
        throw new Error(`sec_ticker_payload_too_small:${entries.length}`)
      }
      return entries
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt + 1 >= SEC_FETCH_MAX_ATTEMPTS) break
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)))
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError || new Error('sec_ticker_fetch_failed')
}

async function loadSecTickerEntries(cache: TickerCacheStore): Promise<SecTickerEntry[]> {
  let cached: TickerCachePayload | null = null
  try {
    cached = await cache.get()
  } catch {
    cached = null
  }

  if (cacheIsFresh(cached)) {
    return cached.entries
  }

  try {
    const entries = await fetchSecPayloadFromNetwork()
    try {
      await cache.put({ fetchedAt: Date.now(), entries })
    } catch {
      // Cache write failures must not block matching.
    }
    return entries
  } catch (error) {
    if (cached?.entries?.length) {
      return cached.entries
    }
    throw error
  }
}

export async function fetchSecTickerEntries(cache: TickerCacheStore): Promise<SecTickerEntry[]> {
  if (!secFetchInFlight) {
    secFetchInFlight = loadSecTickerEntries(cache).finally(() => {
      secFetchInFlight = null
    })
  }
  return secFetchInFlight
}

export function findBestTickerMatch(
  companyName: string,
  entries: SecTickerEntry[],
  threshold = MATCH_CONFIDENCE_THRESHOLD,
): string | null {
  const query = normalizeCompanyName(companyName)
  if (!query || query.length < 2) return null

  const rawTokens = String(companyName || '').trim().split(/\s+/).filter(Boolean)
  if (rawTokens.length < 2 && query.length < 10) return null

  const queryTokens = query.split(' ').filter(Boolean)
  const allowFuzzy = queryTokens.length >= 2 || query.length >= 10

  let bestTicker: string | null = null
  let bestScore = 0
  let secondScore = 0

  for (const entry of entries) {
    const candidate = normalizeCompanyName(entry.title)
    const score = matchConfidence(companyName, entry.title)
    if (!allowFuzzy && candidate !== query) continue
    if (score > bestScore) {
      secondScore = bestScore
      bestScore = score
      bestTicker = entry.ticker
    } else if (score > secondScore) {
      secondScore = score
    }
  }

  if (!bestTicker || bestScore < threshold) return null
  const margin = bestScore - secondScore
  if (bestScore >= MATCH_NEAR_EXACT_SCORE || margin >= MATCH_CONFIDENCE_MARGIN) {
    return isValidTicker(bestTicker) ? bestTicker : null
  }
  return null
}

export async function matchTickerForCompanyWithCache(
  companyName: string,
  cache: TickerCacheStore,
): Promise<string | null> {
  const name = String(companyName || '').trim()
  if (!name) return null
  const entries = await fetchSecTickerEntries(cache)
  return findBestTickerMatch(name, entries)
}
