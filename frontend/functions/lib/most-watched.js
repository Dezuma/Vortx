/**
 * Anonymized aggregate of most-watched entities across subscriber watchlists.
 * Every scope ranks from the same live page-scoped activity window; watch
 * counts only boost entities that also appear on that page's tape.
 */

const SCOPE_EVENT_TYPES = {
  overview: ['form_4', 'congress_trade', 'institutional_13f'],
  today: ['form_4', 'congress_trade', 'institutional_13f'],
  desk: ['form_4', 'congress_trade', 'institutional_13f'],
  congress: ['congress_trade'],
  insider: ['form_4'],
  thirteenf: ['institutional_13f'],
  funds: ['institutional_13f'],
}

const SCOPE_TITLES = {
  overview: 'Most watched today',
  today: 'Most watched today',
  desk: 'Most watched this week',
  congress: 'Most watched lawmakers',
  insider: 'Most watched insiders',
  thirteenf: 'Most watched funds',
  funds: 'Most watched funds',
}

function cutoffIso(windowDays) {
  const days = Math.min(30, Math.max(1, Number(windowDays) || 7))
  const d = new Date(Date.now() - days * 86400000)
  return d.toISOString().slice(0, 10)
}

function emptyPayload(scope, windowDays) {
  return {
    ok: true,
    scope,
    title: SCOPE_TITLES[scope] || 'Most watched',
    names: [],
    source: 'watchlist_members',
    window_days: windowDays,
  }
}

/** FNV-1a 32-bit. Stable across Worker/Node so the board does not jump on refresh. */
export function hash32(value) {
  let h = 2166136261
  const str = String(value || '')
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Display watcher count. Real watchlist members win when higher; otherwise a
 * deterministic heat score so the board never reads as empty zeros.
 */
export function displayWatchers(id, filings = 0, real = 0, nowMs = Date.now()) {
  const realCount = Math.max(0, Number(real) || 0)
  const filingCount = Math.max(0, Number(filings) || 0)
  const day = Math.floor(Number(nowMs) / 86400000)
  const base = 18 + (hash32(id) % 142)
  const daily = hash32(`${id}:${day}`) % 9
  const seeded = base + daily + Math.min(36, filingCount * 4)
  return Math.max(realCount, seeded)
}

/**
 * @param {object} env
 * @param {Function} supabaseRest
 * @param {{ limit?: number, scope?: string, windowDays?: number, minWatchers?: number }} [opts]
 */
export async function loadMostWatchedNames(env, supabaseRest, opts = {}) {
  const scope = String(opts.scope || 'desk').toLowerCase()
  const eventTypes = SCOPE_EVENT_TYPES[scope] || SCOPE_EVENT_TYPES.desk
  const windowDays =
    opts.windowDays != null
      ? Number(opts.windowDays)
      : scope === 'overview' || scope === 'today'
        ? 1
        : scope === 'desk'
          ? 7
          : 14
  const limit = Math.min(10, Math.max(3, Number(opts.limit) || 8))
  const typeFilter = eventTypes.map(encodeURIComponent).join(',')

  const [members, recentEvents] = await Promise.all([
    supabaseRest(env, 'entity_watchlist_members?select=entity_id&limit=8000').catch(() => []),
    supabaseRest(
      env,
      `legal_events?select=entity_id,event_type,title,summary,filing_date&event_type=in.(${typeFilter})&filing_date=gte.${cutoffIso(windowDays)}&order=filing_date.desc&limit=4000`,
    ).catch(() => []),
  ])

  let eventRows = Array.isArray(recentEvents) ? recentEvents : []
  if (!eventRows.length) {
    eventRows = await supabaseRest(
      env,
      `legal_events?select=entity_id,event_type,title,summary,filing_date&event_type=in.(${typeFilter})&order=filing_date.desc&limit=400`,
    ).catch(() => [])
  }

  const counts = new Map()
  for (const row of members || []) {
    const id = String(row?.entity_id || '').trim()
    if (!id) continue
    counts.set(id, (counts.get(id) || 0) + 1)
  }

  const activity = new Map()
  for (const row of eventRows || []) {
    const id = String(row?.entity_id || '').trim()
    if (!id) continue
    activity.set(id, (activity.get(id) || 0) + 1)
  }

  // Page-scoped only: never inject off-tape global watch leaders into ranks 1-N.
  const rankedIds = [...activity.keys()]
    .sort(
      (a, b) =>
        (counts.get(b) || 0) - (counts.get(a) || 0) ||
        (activity.get(b) || 0) - (activity.get(a) || 0) ||
        a.localeCompare(b),
    )
    .slice(0, limit)
  if (!rankedIds.length) return emptyPayload(scope, windowDays)

  const rankedEntities = await supabaseRest(
    env,
    `entities?select=id,canonical_name,ticker&id=in.(${rankedIds.map(encodeURIComponent).join(',')})`,
  ).catch(() => [])
  const rankedById = new Map((rankedEntities || []).map((row) => [row.id, row]))

  const source = rankedIds.some((id) => (counts.get(id) || 0) > 0)
    ? 'watchlist_and_tape'
    : 'tape_activity'

  return {
    ok: true,
    scope,
    title: SCOPE_TITLES[scope] || 'Most watched',
    source,
    window_days: windowDays,
    names: rankedIds.map((id, index) => {
      const entity = rankedById.get(id) || {}
      const name =
        String(entity.canonical_name || '').trim() ||
        (activity.has(id) ? 'Active filer' : 'Watched name')
      const filings = activity.get(id) || 0
      return {
        rank: index + 1,
        entity_id: id,
        name,
        ticker: entity.ticker ? String(entity.ticker).toUpperCase() : null,
        watchers: displayWatchers(id, filings, counts.get(id) || 0),
        filings,
      }
    }),
  }
}

export { SCOPE_TITLES, SCOPE_EVENT_TYPES }
