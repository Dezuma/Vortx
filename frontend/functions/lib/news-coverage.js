/**
 * Filing-relevant mainstream coverage for "you were early" badges.
 * Prefers persisted rows, then Google News (filing query), then Yahoo ticker RSS.
 * Generic market roundups never qualify.
 */

const FILING_QUERY_TERMS = {
  form_4: ['"Form 4"', 'insider', '"SEC filing"', '"sold shares"', '"bought shares"'],
  congress_trade: ['"STOCK Act"', 'congress', 'lawmaker', 'senator', 'representative'],
  institutional_13f: ['13F', 'holdings', 'institutional', 'stake'],
}

const FILING_BLOB_RE = {
  form_4:
    /\bform\s*4\b|\binsider\b|\bsec filing\b|\bsold shares\b|\bbought shares\b|\breporting owner\b|\bdisposed\b|\bacquired\b|\bofficer\b|\bdirector\b|\bbeneficial owner\b/i,
  congress_trade:
    /\bstock act\b|\bcongress\b|\blawmaker\b|\bsenator\b|\brepresentative\b|\bhouse\b|\bsenate\b|\bpolitician\b|\bdisclosed\b.*\b(trade|shares|stock)\b|\b(trade|shares|stock).*\bdisclosed\b/i,
  institutional_13f:
    /\b13f\b|\binstitutional holdings\b|\breported holdings\b|\bholdings report\b|\bstake\b|\bfiled\b.*\bholdings\b|\bportfolio filing\b/i,
}

const GENERIC_REJECT_RE =
  /\btop analyst reports?\b|\bstocks to watch\b|\bdividend stocks?\b|\bearnings estimates\b|\bready to pay you\b|\bbuy range\b|\bwall street'?s radar\b|\bbull market\b|\bbear market\b|\bshould you (buy|sell)\b(?!.*\b(insider|form\s*4|sold shares|bought shares)\b)/i

const memoryCache = new Map()
const MEMORY_TTL_MS = 6 * 60 * 60 * 1000
const CACHE_PREFIX = 'https://news-coverage.vortx.internal/v4/'

function cleanToken(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function significantNameToken(name) {
  const stop = new Set([
    'inc',
    'llc',
    'ltd',
    'corp',
    'co',
    'the',
    'and',
    'of',
    'fund',
    'trust',
    'company',
    'holdings',
    'group',
    'partners',
    'capital',
    'management',
    'rep',
    'sen',
    'senator',
    'representative',
    'plc',
    'sa',
    'ag',
    'lp',
    'llp',
  ])
  const parts = cleanToken(name)
    .split(/[\s,./]+/)
    .map((part) => part.replace(/[^A-Za-z0-9-]/g, ''))
    .filter((part) => part.length >= 3 && !stop.has(part.toLowerCase()))
  return parts[parts.length - 1] || parts[0] || ''
}

function eventTypeKey(event = {}) {
  return String(event.event_type || event.source_record_type || event.signal_meta?.category || '').toLowerCase()
}

function eventTicker(event = {}) {
  const meta = event.signal_meta || {}
  const direct = cleanToken(meta.ticker_label || event.ticker || '').toUpperCase()
  if (direct && /^[A-Z][A-Z0-9.]{0,7}$/.test(direct)) return direct
  const blob = `${event.title || ''} ${event.summary || ''}`
  const parsed =
    blob.match(/\bTicker on record:\s*([A-Z0-9.\-]{1,8})\b/i)?.[1] ||
    String(event.title || '').match(/\(([A-Z]{1,5})\)/)?.[1] ||
    ''
  return cleanToken(parsed).toUpperCase()
}

function eventIssuer(event = {}) {
  const meta = event.signal_meta || {}
  const direct = cleanToken(meta.issuer_label || '')
  if (direct) return direct
  return cleanToken(String(event.summary || '').match(/Issuer on record:\s*([^./]+)/i)?.[1] || '')
}

export function buildCoverageQuery(event = {}) {
  const meta = event.signal_meta || {}
  const type = eventTypeKey(event)
  const ticker = eventTicker(event)
  const filer = cleanToken(meta.filer_label || event.entity_name || '')
  const issuer = eventIssuer(event)
  const terms = FILING_QUERY_TERMS[type] || ['"SEC filing"']
  const subject = ticker || (issuer ? `"${issuer}"` : filer ? `"${filer}"` : '')
  if (!subject) return null
  return `${subject} (${terms.join(' OR ')})`
}

/**
 * Anchor for "early vs news" comparisons.
 * Prefer explicit detection stamps. When same-day batch ingest lands after
 * afternoon headlines, fall back to a filing-day public-tape anchor so
 * filing-relevant coverage can still qualify without inventing news.
 */
export function detectionTimestamp(event = {}) {
  const explicit =
    event.detected_at ||
    event.first_seen_at ||
    event.signal_meta?.detected_at ||
    null
  const created = event.created_at || null
  const filingDate = String(event.filing_date || '').slice(0, 10)
  const createdMs = Date.parse(String(created || ''))
  const filingAnchorMs = /^\d{4}-\d{2}-\d{2}$/.test(filingDate)
    ? Date.parse(`${filingDate}T14:00:00.000Z`)
    : NaN

  if (explicit) {
    const explicitMs = Date.parse(String(explicit))
    if (
      Number.isFinite(explicitMs) &&
      Number.isFinite(filingAnchorMs) &&
      Number.isFinite(createdMs) &&
      explicitMs > filingAnchorMs &&
      createdMs > filingAnchorMs &&
      String(explicit).slice(0, 10) === filingDate
    ) {
      return new Date(filingAnchorMs).toISOString()
    }
    return explicit
  }

  if (
    Number.isFinite(createdMs) &&
    Number.isFinite(filingAnchorMs) &&
    createdMs > filingAnchorMs &&
    String(created).slice(0, 10) === filingDate
  ) {
    return new Date(filingAnchorMs).toISOString()
  }
  return created
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseRssItems(xml) {
  const blocks = String(xml || '').match(/<item[\s\S]*?<\/item>/gi) || []
  return blocks.map((block) => {
    const title = decodeXml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
    const description = decodeXml(
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || '',
    )
    const pubDate = decodeXml(block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || '')
    return { title, description, pubDate, blob: `${title} ${description}`.toLowerCase() }
  })
}

function hasSubjectMatch(blob, event = {}) {
  const meta = event.signal_meta || {}
  const ticker = eventTicker(event)
  const filerToken = significantNameToken(meta.filer_label || event.entity_name || '').toLowerCase()
  const issuerToken = significantNameToken(
    meta.issuer_label || eventIssuer(event) || '',
  ).toLowerCase()
  if (ticker) {
    const t = ticker.toLowerCase().replace('.', '\\.')
    // Require market-style ticker mentions. Bare-word match false-positives on
    // "PSUs" / "RSUs" style equity jargon (e.g. PSUS ticker vs Playtika PSUs).
    const tickerMention = new RegExp(
      `(\\$${t}\\b|\\(${t}\\)|\\b(?:nyse|nasdaq|otc|ticker)\\s*[:/-]?\\s*${t}\\b)`,
      'i',
    )
    if (tickerMention.test(blob)) {
      const otherTicker = blob.match(/\(([a-z]{1,5})\)/gi) || []
      const foreign = otherTicker
        .map((m) => m.replace(/[()]/g, '').toUpperCase())
        .filter((code) => code && code !== ticker)
      if (!foreign.length || issuerToken || filerToken) {
        if (!foreign.length) return true
        // If another company ticker is primary in the headline, require issuer/filer too.
        if (issuerToken && blob.includes(issuerToken)) return true
        if (filerToken && blob.includes(filerToken)) return true
        if (!issuerToken && !filerToken) return true
      }
    }
  }
  if (issuerToken && blob.includes(issuerToken)) return true
  if (filerToken && blob.includes(filerToken)) return true
  return false
}

function hasFilingLanguage(blob, event = {}) {
  const type = eventTypeKey(event)
  const re = FILING_BLOB_RE[type] || /\bsec\b|\bfiling\b|\bdisclosed\b/i
  return re.test(blob)
}

/**
 * Strict gate: filing language + subject match; reject generic market roundups.
 * Exported for unit tests.
 */
export function isFilingRelevantItem(item, event = {}) {
  const blob = String(item?.blob || `${item?.title || ''} ${item?.description || ''}`).toLowerCase()
  if (!blob.trim()) return false
  if (GENERIC_REJECT_RE.test(blob) && !hasFilingLanguage(blob, event)) return false
  if (!hasFilingLanguage(blob, event)) return false
  if (!hasSubjectMatch(blob, event)) return false
  return true
}

async function readCache(key, cacheApi) {
  const mem = memoryCache.get(key)
  if (mem && Date.now() - mem.storedAt < MEMORY_TTL_MS) return mem.value
  if (!cacheApi?.match) return null
  try {
    const hit = await cacheApi.match(new Request(CACHE_PREFIX + encodeURIComponent(key)))
    if (!hit) return null
    const value = await hit.json()
    memoryCache.set(key, { storedAt: Date.now(), value })
    return value
  } catch {
    return null
  }
}

async function writeCache(key, value, cacheApi) {
  memoryCache.set(key, { storedAt: Date.now(), value })
  if (!cacheApi?.put) return
  try {
    await cacheApi.put(
      new Request(CACHE_PREFIX + encodeURIComponent(key)),
      new Response(JSON.stringify(value), {
        headers: {
          'content-type': 'application/json',
          'cache-control': 'public, max-age=21600',
        },
      }),
    )
  } catch {
    /* ignore */
  }
}

async function fetchRss(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/rss+xml, application/xml, text/xml, */*',
      'user-agent': 'VortxCoverageBot/1.0 (+https://vortxmkt.com)',
    },
    cf: { cacheTtl: 1800, cacheEverything: true },
  })
  if (!response.ok) return ''
  return response.text()
}

function pickCoverageFromItems(items, event, detectedMs, source) {
  const matches = items
    .map((item) => ({ item, ms: Date.parse(item.pubDate) }))
    .filter(
      ({ item, ms }) =>
        Number.isFinite(ms) && ms > detectedMs && isFilingRelevantItem(item, event),
    )
    .sort((a, b) => a.ms - b.ms)
  if (!matches.length) return null
  const best = matches[0]
  return {
    news_mentioned_at: new Date(best.ms).toISOString(),
    source,
    title: best.item.title.slice(0, 160),
  }
}

export async function loadPersistedCoverage(env, supabaseRest, eventIds = []) {
  const ids = [...new Set((eventIds || []).map((id) => String(id || '').trim()).filter(Boolean))].slice(
    0,
    80,
  )
  if (!env || !supabaseRest || !ids.length) return new Map()
  try {
    const rows = await supabaseRest(
      env,
      `event_news_coverage?select=event_id,detected_at,news_mentioned_at,coverage_source,coverage_title&event_id=in.(${ids
        .map(encodeURIComponent)
        .join(',')})`,
    )
    return new Map(
      (rows || []).map((row) => [
        row.event_id,
        {
          detected_at: row.detected_at,
          news_mentioned_at: row.news_mentioned_at,
          coverage_first_seen_at: row.news_mentioned_at,
          coverage_source: row.coverage_source || 'persisted',
          coverage_title: row.coverage_title || null,
          persisted: true,
        },
      ]),
    )
  } catch {
    return new Map()
  }
}

export async function persistCoverage(env, supabaseRest, eventId, coverage) {
  if (!env || !supabaseRest || !eventId || !coverage?.news_mentioned_at || !coverage?.detected_at) {
    return false
  }
  try {
    await supabaseRest(env, 'event_news_coverage?on_conflict=event_id', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        event_id: eventId,
        detected_at: coverage.detected_at,
        news_mentioned_at: coverage.news_mentioned_at,
        coverage_source: coverage.coverage_source || coverage.source || 'rss',
        coverage_title: coverage.coverage_title || coverage.title || null,
        updated_at: new Date().toISOString(),
      }),
    })
    return true
  } catch {
    return false
  }
}

/**
 * @returns {Promise<{ news_mentioned_at: string, source: string, title?: string }|null>}
 */
export async function lookupNewsMention(event, opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch
  const cacheApi = opts.cacheApi || (typeof caches !== 'undefined' ? caches.default : null)
  const detectedRaw = detectionTimestamp(event)
  const detectedMs = Date.parse(String(detectedRaw || ''))
  const ticker = eventTicker(event)
  const query = buildCoverageQuery(event)
  if (!Number.isFinite(detectedMs) || (!ticker && !query)) return null

  const cacheKey = `strict-v4|${ticker || query}|${new Date(detectedMs).toISOString().slice(0, 13)}`
  const cached = await readCache(cacheKey, cacheApi)
  if (cached) {
    if (cached.miss) return null
    // Re-validate: older cache entries can predate tighter relevance rules.
    if (
      cached.news_mentioned_at &&
      isFilingRelevantItem(
        {
          title: cached.title || '',
          description: '',
          blob: String(cached.title || '').toLowerCase(),
        },
        event,
      )
    ) {
      return cached
    }
  }

  try {
    // Prefer filing-shaped Google query first (higher precision than generic ticker feeds).
    if (query) {
      const googleUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
      const googleXml = await fetchRss(googleUrl, fetchImpl)
      const googleHit = pickCoverageFromItems(
        parseRssItems(googleXml),
        event,
        detectedMs,
        'google_news_rss',
      )
      if (googleHit) {
        await writeCache(cacheKey, googleHit, cacheApi)
        return googleHit
      }
    }

    if (ticker && /^[A-Z][A-Z0-9.]{0,7}$/.test(ticker)) {
      const yahooUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`
      const yahooXml = await fetchRss(yahooUrl, fetchImpl)
      const yahooHit = pickCoverageFromItems(
        parseRssItems(yahooXml),
        event,
        detectedMs,
        'yahoo_finance_rss',
      )
      if (yahooHit) {
        await writeCache(cacheKey, yahooHit, cacheApi)
        return yahooHit
      }
    }
  } catch {
    await writeCache(cacheKey, { miss: true }, cacheApi)
    return null
  }

  await writeCache(cacheKey, { miss: true }, cacheApi)
  return null
}

/**
 * Enrich trading events with coverage timestamps when a valid comparison exists.
 */
export async function enrichEventsWithNewsCoverage(events = [], opts = {}) {
  const maxEvents = Math.min(40, Math.max(1, Number(opts.maxEvents) || 20))
  const concurrency = Math.min(6, Math.max(1, Number(opts.concurrency) || 4))
  const budgetMs = Math.min(8000, Math.max(400, Number(opts.budgetMs) || 2000))
  const started = Date.now()
  const trading = (events || []).filter((event) =>
    ['form_4', 'congress_trade', 'institutional_13f'].includes(eventTypeKey(event)),
  )

  const persisted = opts.persistedCoverage instanceof Map
    ? opts.persistedCoverage
    : opts.env && opts.supabaseRest
      ? await loadPersistedCoverage(
          opts.env,
          opts.supabaseRest,
          trading.map((e) => e.id),
        )
      : new Map()

  const byId = new Map()
  for (const event of trading) {
    const hit = persisted.get(event.id)
    if (!hit?.news_mentioned_at) continue
    if (
      !isFilingRelevantItem(
        {
          title: hit.coverage_title || '',
          description: '',
          blob: String(hit.coverage_title || '').toLowerCase(),
        },
        event,
      )
    ) {
      continue
    }
    byId.set(event.id, hit)
  }

  const typeRank = (event) => {
    const key = eventTypeKey(event)
    if (key === 'form_4') return 0
    if (key === 'congress_trade') return 1
    return 2
  }
  const targets = trading
    .filter((event) => !byId.has(event.id))
    .sort((a, b) => typeRank(a) - typeRank(b))
    .slice(0, maxEvents)
  let cursor = 0
  async function worker() {
    while (cursor < targets.length) {
      if (Date.now() - started > budgetMs) return
      const index = cursor
      cursor += 1
      const event = targets[index]
      const detected = detectionTimestamp(event)
      const hit = await lookupNewsMention(
        {
          ...event,
          detected_at: detected,
          signal_meta: {
            ...(event.signal_meta || {}),
            ticker_label: eventTicker(event) || event.signal_meta?.ticker_label || null,
            issuer_label: eventIssuer(event) || event.signal_meta?.issuer_label || null,
          },
        },
        opts,
      )
      if (!hit?.news_mentioned_at) continue
      const coverage = {
        detected_at: detected,
        news_mentioned_at: hit.news_mentioned_at,
        coverage_first_seen_at: hit.news_mentioned_at,
        coverage_source: hit.source,
        coverage_title: hit.title || null,
      }
      byId.set(event.id, coverage)
      if (opts.env && opts.supabaseRest && event.id) {
        void persistCoverage(opts.env, opts.supabaseRest, event.id, coverage)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  return (events || []).map((event) => {
    const coverage = byId.get(event.id)
    if (!coverage) {
      return {
        ...event,
        detected_at: event.detected_at || detectionTimestamp(event),
      }
    }
    return {
      ...event,
      detected_at: coverage.detected_at,
      news_mentioned_at: coverage.news_mentioned_at,
      coverage_first_seen_at: coverage.coverage_first_seen_at,
      signal_meta: {
        ...(event.signal_meta || {}),
        detected_at: coverage.detected_at,
        news_mentioned_at: coverage.news_mentioned_at,
        coverage_first_seen_at: coverage.coverage_first_seen_at,
        coverage_source: coverage.coverage_source,
        coverage_title: coverage.coverage_title,
      },
    }
  })
}
