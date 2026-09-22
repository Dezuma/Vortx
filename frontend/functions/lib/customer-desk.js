import { derivedEntityScore, derivedEventSeverity, urgencyFromScore } from './derived-scores.js'

function normalizeDedupeKey(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.-]/g, '')
    .trim()
}

/** Remove duplicate feed rows (same entity + title + filing date). */
export function dedupeLiveFeedEvents(events) {
  const seen = new Set()
  const result = []
  for (const event of events || []) {
    const key = [
      event.entity_id || '',
      normalizeDedupeKey(event.title),
      event.filing_date || '',
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    result.push(event)
  }
  return result
}

export function buildWatchlistIndex(watchlists) {
  const entityToWatchlists = new Map()
  for (const watchlist of watchlists || []) {
    const label = watchlist.label || watchlist.name || 'Watchlist'
    // Prefer junction-table members when present; fall back to denormalized entity_ids[].
    const ids = Array.isArray(watchlist.member_entity_ids)
      ? watchlist.member_entity_ids
      : Array.isArray(watchlist.entity_ids)
        ? watchlist.entity_ids
        : []
    for (const entityId of ids) {
      const key = String(entityId || '').trim()
      if (!key) continue
      const rows = entityToWatchlists.get(key) || []
      rows.push(label)
      entityToWatchlists.set(key, rows)
    }
  }
  return entityToWatchlists
}

/** Attach member_entity_ids from entity_watchlist_members (preferred source of truth). */
export async function hydrateWatchlistMembers(env, supabaseRest, watchlists) {
  const rows = Array.isArray(watchlists) ? watchlists : []
  if (!rows.length) return rows
  const ids = rows.map((row) => row.id).filter(Boolean)
  if (!ids.length) return rows
  let members = []
  try {
    members = await supabaseRest(
      env,
      `entity_watchlist_members?select=watchlist_id,entity_id&watchlist_id=in.(${ids.map((id) => encodeURIComponent(id)).join(',')})`,
    )
  } catch {
    return rows.map((row) => ({
      ...row,
      member_entity_ids: Array.isArray(row.entity_ids) ? row.entity_ids : [],
    }))
  }
  const byWatchlist = new Map()
  for (const member of members || []) {
    const key = String(member.watchlist_id || '')
    if (!key) continue
    const list = byWatchlist.get(key) || []
    list.push(member.entity_id)
    byWatchlist.set(key, list)
  }
  return rows.map((row) => {
    const fromMembers = byWatchlist.get(String(row.id)) || []
    return {
      ...row,
      member_entity_ids: fromMembers.length ? fromMembers : Array.isArray(row.entity_ids) ? row.entity_ids : [],
      entity_ids: fromMembers.length ? fromMembers : row.entity_ids,
    }
  })
}

export function watchlistMatchNote(entityId, entityName, watchlistIndex) {
  const labels = watchlistIndex.get(String(entityId || '').trim())
  if (!labels?.length) return null
  const unique = [...new Set(labels)]
  if (unique.length === 1) {
    return `This company is on your "${unique[0]}" watchlist.`
  }
  if (entityName) {
    return `Matched because you're tracking ${entityName}.`
  }
  return `Matched ${unique.length} of your active watchlists.`
}

export async function loadPreviousDeskVisit(env, supabaseRest, email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return null
  try {
    const rows = await supabaseRest(
      env,
      `query_audit_events?select=created_at&subscriber_email=eq.${encodeURIComponent(normalized)}&query=eq.${encodeURIComponent('/api/customer/dashboard')}&order=created_at.desc&limit=1`,
    )
    return rows?.[0]?.created_at || null
  } catch {
    return null
  }
}

export async function loadSubscriptionStartedAt(env, supabaseRest, profile) {
  const email = String(profile?.email || '').trim().toLowerCase()
  if (!email) return profile?.created_at || profile?.updated_at || null
  try {
    const rows = await supabaseRest(
      env,
      `checkout_sessions?select=created_at,status&email=eq.${encodeURIComponent(email)}&status=eq.completed&order=created_at.asc&limit=1`,
    )
    return rows?.[0]?.created_at || profile?.created_at || profile?.updated_at || null
  } catch {
    return profile?.created_at || profile?.updated_at || null
  }
}

function eventTimestamp(event) {
  const filed = Date.parse(String(event.filing_date || ''))
  if (Number.isFinite(filed)) return filed
  const created = Date.parse(String(event.created_at || ''))
  return Number.isFinite(created) ? created : 0
}

export function buildVisitSummary(events, lastVisitAt, activeSourcesCount) {
  const lastVisitMs = Date.parse(String(lastVisitAt || ''))
  const hasLastVisit = Number.isFinite(lastVisitMs)
  const recent = hasLastVisit
    ? (events || []).filter((event) => eventTimestamp(event) > lastVisitMs)
    : events || []

  const urgentCount = recent.filter((event) => urgencyFromScore(event.display_severity ?? event.severity) === 'urgent').length
  const newCount = recent.length

  return {
    last_visit_at: hasLastVisit ? lastVisitAt : null,
    new_since_visit: newCount,
    urgent_since_visit: urgentCount,
    has_urgent: urgentCount > 0,
    quiet: hasLastVisit && newCount === 0,
    active_sources_checked: Number(activeSourcesCount) || 0,
    headline:
      !hasLastVisit
        ? null
        : newCount === 0
          ? `Quiet since your last visit. We still email you when watched names file.`
          : urgentCount > 0
            ? `${newCount} new trade${newCount === 1 ? '' : 's'} since your last visit.`
            : `${newCount} new trade${newCount === 1 ? '' : 's'} since your last visit.`,
  }
}

export function buildSinceSubscribedStat(events, subscriptionStartedAt, watchlistIndex) {
  const startMs = Date.parse(String(subscriptionStartedAt || ''))
  const sinceEvents = Number.isFinite(startMs)
    ? (events || []).filter((event) => eventTimestamp(event) >= startMs)
    : events || []

  const watchlistEntityIds = new Set(watchlistIndex?.keys?.() || [])
  const watchlistHits = sinceEvents.filter((event) => watchlistEntityIds.has(String(event.entity_id || '').trim()))

  if (watchlistHits.length > 0) {
    return {
      label: 'watchlist signals surfaced',
      value: watchlistHits.length,
      copy: `Your watchlist has surfaced ${watchlistHits.length} signal${watchlistHits.length === 1 ? '' : 's'} your team would have otherwise missed.`,
    }
  }

  const count = sinceEvents.length
  return {
    label: 'filings before public news',
    value: count,
    copy: `You've been notified of ${count} filing${count === 1 ? '' : 's'} since you subscribed.`,
  }
}

export function scoreLiveFeedRow(event, entity, entityScore, entityEvents) {
  const frictionScore = derivedEntityScore(entityScore, entityEvents, entity)
  const displaySeverity = derivedEventSeverity(event, entityScore, entity)
  const urgency = urgencyFromScore(displaySeverity)
  return {
    severity: displaySeverity,
    raw_severity: event.severity,
    friction_score: frictionScore,
    urgency,
  }
}

export function planUpgradeHint(capabilities, locks, event) {
  const hints = []
  if (locks?.source_url && !event.source_url) {
    hints.push({ feature: 'source_url', message: 'Upgrade to Operator to see the source document.' })
  }
  if (locks?.entity_names && !event.entity_name) {
    hints.push({ feature: 'entity_names', message: 'Upgrade to Nebula to unlock entity names on every row.' })
  }
  if (locks?.csv_export) {
    hints.push({ feature: 'csv_export', message: 'Upgrade to Operator for CSV export with evidence URLs.' })
  }
  return hints[0] || null
}
