/**
 * Pure helpers for the My Desk trading terminal (filters, grouping, copy).
 * No invented dollar amounts or filing facts.
 */

/** @typedef {'all'|'insider'|'congress'|'institutional'|'distress'} DeskBucket */

/**
 * @param {object} event
 * @returns {Exclude<DeskBucket, 'all'>}
 */
export function deskBucket(event) {
  const type = String(event?.event_type || event?.source_record_type || event?.notice_kind || '').toLowerCase()
  if (type === 'form_4' || type === 'insider' || /form_4|insider/.test(type)) return 'insider'
  if (type === 'congress_trade' || type === 'congress' || /congress|stock.?act/.test(type)) return 'congress'
  if (type === 'institutional_13f' || type === 'institutional' || /13f|institutional/.test(type)) {
    return 'institutional'
  }
  return 'distress'
}

/**
 * @param {Exclude<DeskBucket, 'all'>} bucket
 */
export function deskBucketLabel(bucket) {
  if (bucket === 'insider') return 'INSIDER'
  if (bucket === 'congress') return 'CONGRESS'
  if (bucket === 'institutional') return '13F'
  return 'DISTRESS'
}

/**
 * @param {object[]} events
 */
export function deskMetricCounts(events) {
  const counts = { all: 0, insider: 0, congress: 0, institutional: 0, distress: 0 }
  for (const event of events || []) {
    counts.all += 1
    counts[deskBucket(event)] += 1
  }
  return counts
}

function searchableBlob(event) {
  return [
    event?.entity_name,
    event?.title,
    event?.summary,
    event?.jurisdiction,
    event?.event_type,
    event?.source_record_type,
    event?.source_name,
    event?.ticker,
    event?.signal_meta?.ticker_label,
    event?.signal_meta?.issuer_label,
    event?.signal_meta?.filer_label,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * @param {{
 *   events?: object[],
 *   bucket?: DeskBucket,
 *   query?: string,
 *   watchlistIds?: Iterable<string>|Set<string>,
 *   watchlistOnly?: boolean,
 * }} opts
 */
export function filterDeskEvents({
  events = [],
  bucket = 'all',
  query = '',
  watchlistIds = [],
  watchlistOnly = false,
} = {}) {
  const q = String(query || '').trim().toLowerCase()
  const watched = watchlistIds instanceof Set ? watchlistIds : new Set(
    [...(watchlistIds || [])].map((id) => String(id || '').trim()).filter(Boolean),
  )
  return (events || []).filter((event) => {
    if (bucket !== 'all' && deskBucket(event) !== bucket) return false
    if (watchlistOnly) {
      const entityId = String(event?.entity_id || '').trim()
      if (!entityId || !watched.has(entityId)) return false
    }
    if (q && !searchableBlob(event).includes(q)) return false
    return true
  })
}

function eventSortKey(event) {
  const severity = Number(event?.severity ?? event?.display_severity) || 0
  const filed = String(event?.filing_date || event?.created_at || '')
  return `${filed}\t${String(1000 - severity).padStart(4, '0')}`
}

/**
 * Group feed rows by entity for composite cards.
 * @param {object[]} events
 */
export function groupDeskEntities(events) {
  const byKey = new Map()
  for (const event of events || []) {
    const entityId = String(event?.entity_id || '').trim()
    const key = entityId || `title:${String(event?.title || event?.id || 'unknown').slice(0, 80)}`
    const row = byKey.get(key) || {
      entityId: entityId || null,
      entityName: String(event?.entity_name || '').trim() || 'Public record entity',
      events: [],
      buckets: new Set(),
      severityMax: 0,
      isComposite: false,
    }
    if (!row.entityName || row.entityName === 'Public record entity') {
      const name = String(event?.entity_name || '').trim()
      if (name) row.entityName = name
    }
    row.events.push(event)
    row.buckets.add(deskBucket(event))
    const severity = Number(event?.severity ?? event?.display_severity) || 0
    if (severity > row.severityMax) row.severityMax = severity
    byKey.set(key, row)
  }

  const groups = [...byKey.values()].map((row) => {
    const buckets = [...row.buckets]
    const eventsSorted = [...row.events].sort((a, b) => eventSortKey(b).localeCompare(eventSortKey(a)))
    return {
      entityId: row.entityId,
      entityName: row.entityName,
      events: eventsSorted,
      buckets,
      severityMax: row.severityMax,
      isComposite: buckets.length > 1,
      compositeLabel: buckets.length > 1
        ? `COMPOSITE: ${buckets.map(deskBucketLabel).join(' + ')}`
        : null,
    }
  })

  return groups.sort((a, b) => {
    if (b.severityMax !== a.severityMax) return b.severityMax - a.severityMax
    const aDate = String(a.events[0]?.filing_date || '')
    const bDate = String(b.events[0]?.filing_date || '')
    return bDate.localeCompare(aDate)
  })
}

/**
 * Clipboard-safe signal string using only present fields.
 * @param {object} event
 */
export function formatCopySignal(event) {
  const bucket = deskBucket(event)
  const who = String(event?.entity_name || event?.signal_meta?.filer_label || 'Name hidden').trim()
  const title = String(event?.title || event?.short_title || 'Public record signal').trim()
  const filed = event?.filing_date ? ` filed ${event.filing_date}` : ''
  const ticker = event?.signal_meta?.ticker_label ? ` $${event.signal_meta.ticker_label}` : ''
  const kind =
    bucket === 'insider'
      ? 'Form 4'
      : bucket === 'congress'
        ? 'STOCK Act'
        : bucket === 'institutional'
          ? '13F'
          : 'Public filing'
  return `VORTX SIGNAL: ${kind} · ${who}${ticker} · ${title}${filed}`.replace(/\s+/g, ' ').trim()
}

/**
 * Watchlist member ids from hydrated dashboard watchlists.
 * @param {object[]} watchlists
 */
export function watchlistEntityIdSet(watchlists) {
  const ids = new Set()
  for (const list of watchlists || []) {
    const members = Array.isArray(list.member_entity_ids)
      ? list.member_entity_ids
      : Array.isArray(list.entity_ids)
        ? list.entity_ids
        : []
    for (const id of members) {
      const key = String(id || '').trim()
      if (key) ids.add(key)
    }
  }
  return ids
}

/** @typedef {'recent'|'amount'|'severity'} TradeSortMode */
/** @typedef {'all'|'buy'|'sell'|'filed'|'holdings'} TradeSideFilter */

/**
 * Session-persisted trade list controls (sort / side / ticker query).
 * @param {string} streamKey
 */
export function readTradeListPrefs(streamKey) {
  try {
    if (typeof sessionStorage === 'undefined') return {}
    const all = JSON.parse(sessionStorage.getItem('vortx_trade_list_prefs_v1') || '{}')
    return all[String(streamKey || '')] || {}
  } catch {
    return {}
  }
}

/**
 * @param {string} streamKey
 * @param {object} prefs
 */
export function writeTradeListPrefs(streamKey, prefs) {
  try {
    if (typeof sessionStorage === 'undefined') return
    const key = 'vortx_trade_list_prefs_v1'
    const all = JSON.parse(sessionStorage.getItem(key) || '{}')
    all[String(streamKey || '')] = prefs || {}
    sessionStorage.setItem(key, JSON.stringify(all))
  } catch {
    /* ignore quota / private mode */
  }
}

function eventAmount(event) {
  const n = Number(event?.amount)
  return Number.isFinite(n) ? n : 0
}

function eventSeverity(event) {
  return Number(event?.severity ?? event?.display_severity ?? event?.confidence) || 0
}

function eventSideKey(event) {
  const metaSide = String(event?.signal_meta?.side || '').toLowerCase()
  if (metaSide === 'buy' || metaSide === 'sell') return metaSide
  if (metaSide === 'institutional') return 'holdings'
  const type = String(event?.event_type || event?.source_record_type || '').toLowerCase()
  if (type === 'institutional_13f') return 'holdings'
  const blob = `${event?.title || ''} ${event?.summary || ''} ${event?.signal_meta?.action_label || ''}`
  if (/Transaction code:\s*P\b|\bpurchase\b|\bbought\b|\bbuy\b/i.test(blob)) return 'buy'
  if (/Transaction code:\s*S\b|\bsale\b|\bsold\b|\bsell\b/i.test(blob)) return 'sell'
  return 'filed'
}

/**
 * @param {object[]} events
 * @param {{ sort?: TradeSortMode, side?: TradeSideFilter, query?: string }} opts
 */
export function applyTradeListControls(events = [], opts = {}) {
  const sort = opts.sort || 'recent'
  const side = opts.side || 'all'
  const q = String(opts.query || '').trim().toLowerCase()
  let rows = [...(events || [])]
  if (side !== 'all') {
    rows = rows.filter((event) => eventSideKey(event) === side)
  }
  if (q) {
    rows = rows.filter((event) => {
      const blob = [
        event?.entity_name,
        event?.title,
        event?.summary,
        event?.signal_meta?.ticker_label,
        event?.signal_meta?.issuer_label,
        event?.signal_meta?.filer_label,
        event?.ticker,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }
  rows.sort((a, b) => {
    if (sort === 'amount') return eventAmount(b) - eventAmount(a)
    if (sort === 'severity') return eventSeverity(b) - eventSeverity(a)
    const byDate = String(b.filing_date || b.created_at || '').localeCompare(
      String(a.filing_date || a.created_at || ''),
    )
    if (byDate) return byDate
    return eventSeverity(b) - eventSeverity(a)
  })
  return rows
}

function startOfLocalDay(ms) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Bucket desk groups into Today / Yesterday / This week / Earlier.
 * @param {object[]} groups
 */
export function groupDeskByRecency(groups = []) {
  const now = Date.now()
  const todayStart = startOfLocalDay(now)
  const yesterdayStart = todayStart - 86400000
  const weekStart = todayStart - 6 * 86400000
  const sections = [
    { id: 'today', label: 'Today', groups: [] },
    { id: 'yesterday', label: 'Yesterday', groups: [] },
    { id: 'week', label: 'This week', groups: [] },
    { id: 'earlier', label: 'Earlier', groups: [] },
  ]
  for (const group of groups || []) {
    const filed = String(group?.events?.[0]?.filing_date || group?.events?.[0]?.created_at || '')
    const ms = Date.parse(filed)
    const bucket = !Number.isFinite(ms)
      ? 'earlier'
      : ms >= todayStart
        ? 'today'
        : ms >= yesterdayStart
          ? 'yesterday'
          : ms >= weekStart
            ? 'week'
            : 'earlier'
    sections.find((s) => s.id === bucket)?.groups.push(group)
  }
  return sections.filter((section) => section.groups.length)
}

/**
 * Sort entity groups for My Desk.
 * @param {object[]} groups
 * @param {TradeSortMode} sort
 */
export function sortDeskGroups(groups = [], sort = 'recent') {
  const rows = [...(groups || [])]
  rows.sort((a, b) => {
    if (sort === 'amount') {
      const aAmt = Math.max(0, ...(a.events || []).map(eventAmount))
      const bAmt = Math.max(0, ...(b.events || []).map(eventAmount))
      return bAmt - aAmt
    }
    if (sort === 'severity') return (b.severityMax || 0) - (a.severityMax || 0)
    const aDate = String(a.events?.[0]?.filing_date || a.events?.[0]?.created_at || '')
    const bDate = String(b.events?.[0]?.filing_date || b.events?.[0]?.created_at || '')
    return bDate.localeCompare(aDate)
  })
  return rows
}

/**
 * Anchor used for early-vs-news badges. Mirrors news-coverage detectionTimestamp
 * so same-day batch ingest still compares against the public filing day.
 * @param {object} event
 */
export function earlyDetectionAnchor(event) {
  const explicit =
    event?.detected_at ||
    event?.first_seen_at ||
    event?.signal_meta?.detected_at ||
    null
  const created = event?.created_at || null
  const filingDate = String(event?.filing_date || '').slice(0, 10)
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

/**
 * Only returns a shareable "you were early" label when both timestamps exist and
 * Vortx detection precedes mainstream coverage by at least 1 hour.
 * @param {object} event
 * @returns {string|null}
 */
export function youWereEarlyLabel(event) {
  const detectedRaw = earlyDetectionAnchor(event)
  const newsRaw =
    event?.news_mentioned_at ||
    event?.coverage_first_seen_at ||
    event?.signal_meta?.news_mentioned_at ||
    event?.signal_meta?.coverage_first_seen_at ||
    null
  const detected = Date.parse(String(detectedRaw || ''))
  const news = Date.parse(String(newsRaw || ''))
  if (!Number.isFinite(detected) || !Number.isFinite(news) || news <= detected) return null
  const hours = Math.floor((news - detected) / 3600000)
  if (hours < 1) return null
  if (hours < 48) {
    return `You saw this ${hours} hour${hours === 1 ? '' : 's'} before the news`
  }
  const days = Math.floor(hours / 24)
  return `Public here ${days} day${days === 1 ? '' : 's'} before broad coverage`
}

/**
 * Count filings Vortx had before mainstream coverage.
 * @param {object[]} events
 * @param {{ monthStartMs?: number|null }} [opts]
 * @returns {number}
 * @example countBeatenTheNews([{ detected_at: '2026-09-01T08:00:00Z', news_mentioned_at: '2026-09-01T14:00:00Z' }])
 */
export function countBeatenTheNews(events = [], { monthStartMs = null } = {}) {
  let n = 0
  for (const event of events || []) {
    if (!youWereEarlyLabel(event)) continue
    if (monthStartMs != null) {
      const ts = Date.parse(
        event.news_mentioned_at ||
          event.coverage_first_seen_at ||
          event.detected_at ||
          event.created_at ||
          '',
      )
      if (Number.isFinite(ts) && ts < monthStartMs) continue
    }
    n += 1
  }
  return n
}
