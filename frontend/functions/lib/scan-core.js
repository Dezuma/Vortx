import {
  adjacentSignalsFallbackMessage,
  adjacentSignalsMessage,
  entityScanHeadline,
  noSignalsMessage,
} from './compliance-copy.js'

export const SCAN_WINDOW_DAYS = 90
export const ADJACENT_WINDOW_DAYS = 7

const FINANCIAL_SOURCE_TYPES = new Set([
  'bankruptcy_chapter_11',
  'bankruptcy_chapter_7',
  'bankruptcy_docket',
  'bankruptcy_adversary',
  'receivership',
  'creditor_dispute',
])

export function scanCutoffDate(windowDays = SCAN_WINDOW_DAYS) {
  const days = Math.max(1, Number(windowDays) || SCAN_WINDOW_DAYS)
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

export function adjacentWindowCutoff() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - ADJACENT_WINDOW_DAYS)
  return date.toISOString().slice(0, 10)
}

function jurisdictionScopeLabel(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return ''
  const segment = text.split(/[,·|/]/).map((part) => part.trim()).filter(Boolean)[0]
  return segment || text.slice(0, 48)
}

function jurisdictionsOverlap(entityJurisdiction, eventJurisdiction) {
  const entity = String(entityJurisdiction || '').trim().toLowerCase()
  const event = String(eventJurisdiction || '').trim().toLowerCase()
  if (!entity || !event) return false
  if (entity.includes(event) || event.includes(entity)) return true
  const abbrev = entity.match(/\b([a-z]{2})\b/)
  if (abbrev && event.includes(abbrev[1])) return true
  return false
}

export function buildAdjacentSignalStats(recentEvents) {
  const globalEntities = new Set()
  const byScope = new Map()

  for (const event of recentEvents || []) {
    if (!event.entity_id) continue
    globalEntities.add(event.entity_id)
    const scope = jurisdictionScopeLabel(event.jurisdiction)
    if (!scope) continue
    const bucket = byScope.get(scope) || new Set()
    bucket.add(event.entity_id)
    byScope.set(scope, bucket)
  }

  return {
    global_count: globalEntities.size,
    by_scope: Object.fromEntries([...byScope.entries()].map(([scope, ids]) => [scope, ids.size])),
  }
}

export function resolveAdjacentSignals(entity, stats) {
  const globalCount = Number(stats?.global_count) || 0
  if (globalCount <= 0) {
    return {
      count: 0,
      scope_label: 'in our monitored queue',
      window_label: 'this week',
      message: adjacentSignalsFallbackMessage(),
    }
  }

  let count = globalCount
  let scopeLabel = 'in our monitored queue'
  const entityJurisdiction = entity?.jurisdiction

  if (entityJurisdiction) {
    for (const [scope, scopeCount] of Object.entries(stats.by_scope || {})) {
      if (jurisdictionsOverlap(entityJurisdiction, scope)) {
        count = scopeCount
        scopeLabel = `in ${scope}`
        break
      }
    }
  }

  const name = String(entity?.canonical_name || entity?.name || 'This entity').trim()
  return {
    count,
    scope_label: scopeLabel,
    window_label: 'this week',
    message: adjacentSignalsMessage(name, count, scopeLabel),
  }
}

function displayRecordType(value) {
  return String(value || 'public record').replaceAll('_', ' ')
}

function eventRank(event) {
  const severity = Number(event.severity) || 0
  const filing = Date.parse(String(event.filing_date || '')) || 0
  return severity * 1_000_000_000_000 + filing
}

function pickTopEvent(events) {
  if (!events?.length) return null
  return [...events].sort((a, b) => eventRank(b) - eventRank(a))[0]
}

function eventsByType(events) {
  const counts = {}
  for (const event of events || []) {
    const key = String(event.event_type || event.source_record_type || 'record')
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

function sourceTrust(source, event) {
  const recordType = String(source?.record_type || event?.event_type || '').toLowerCase()
  const name = `${source?.name || ''} ${source?.slug || ''}`.toLowerCase()
  const terms = String(source?.terms_status || '').toLowerCase()

  const sourceCategory =
    /pacer|recap|courtlistener|bankruptcy|civil_docket/.test(`${name} ${recordType}`)
      ? 'Federal PACER'
      : /warn|dol|department of labor|workforce/.test(`${name} ${recordType}`)
        ? 'State DOL'
        : /county|recorder|clerk|lien|notice_of_intent/.test(`${name} ${recordType}`)
          ? 'County recorder'
          : 'Public source'

  const trustLabel =
    terms === 'approved' || terms === 'licensed' ? 'Verified' : source?.id && event?.source_id ? 'Matched' : 'Inferred'

  return {
    source_category_label: sourceCategory,
    source_trust_label: trustLabel,
  }
}

export function formatEventDetail(event, sourceById) {
  const source = sourceById.get(event.source_id)
  const sourceRecordType = source?.record_type || event.event_type
  const trust = sourceTrust(source, event)
  const isFinancial = FINANCIAL_SOURCE_TYPES.has(sourceRecordType)

  return {
    id: event.id,
    event_type: displayRecordType(isFinancial ? sourceRecordType : event.event_type),
    record_type: displayRecordType(sourceRecordType),
    title: event.title || displayRecordType(sourceRecordType),
    summary: event.summary || null,
    jurisdiction: event.jurisdiction || null,
    filing_date: event.filing_date || null,
    severity: Number(event.severity) || 0,
    confidence: Number(event.confidence) || 0,
    source_name: source?.name || null,
    source_url: event.source_url || source?.source_url || null,
    ...trust,
  }
}

function lockedEventPreview(event, sourceById) {
  const source = sourceById.get(event.source_id)
  const sourceRecordType = source?.record_type || event.event_type
  return {
    id: event.id,
    record_type: displayRecordType(sourceRecordType),
    filing_date: event.filing_date || null,
    jurisdiction: event.jurisdiction || null,
    locked: true,
  }
}

function pickFreeTasteEntityId(entityRows) {
  let bestId = null
  let bestRank = -1
  for (const row of entityRows) {
    if (!row.events?.length) continue
    const top = pickTopEvent(row.events)
    const rank = eventRank(top)
    if (rank > bestRank) {
      bestRank = rank
      bestId = row.entity.id
    }
  }
  return bestId
}

export async function fetchScanData(env, supabaseRest, entityIds, options = {}) {
  const ids = [...new Set((entityIds || []).map((id) => String(id || '').trim()).filter(Boolean))]
  if (!ids.length) return { entities: [], events: [], scores: [], sources: [] }

  const idFilter = ids.map((id) => encodeURIComponent(id)).join(',')
  const cutoff = scanCutoffDate(options.windowDays)

  const [entities, events, scores, sources] = await Promise.all([
    supabaseRest(env, `entities?select=id,canonical_name,jurisdiction,ticker&id=in.(${idFilter})`),
    supabaseRest(
      env,
      `legal_events?select=*&entity_id=in.(${idFilter})&filing_date=gte.${cutoff}&order=filing_date.desc&limit=500`,
    ),
    supabaseRest(env, `friction_scores?select=entity_id,score,confidence,computed_at&entity_id=in.(${idFilter})&order=computed_at.desc`),
    supabaseRest(env, 'source_catalog?select=id,slug,name,record_type,terms_status,source_url'),
  ])

  return {
    entities: entities || [],
    events: events || [],
    scores: scores || [],
    sources: sources || [],
  }
}

export function buildScanResults(data, { unlockLevel = 'teaser' } = {}) {
  const sourceById = new Map((data.sources || []).map((source) => [source.id, source]))
  const entityById = new Map((data.entities || []).map((entity) => [entity.id, entity]))
  const scoreByEntity = new Map()
  for (const score of data.scores || []) {
    if (!scoreByEntity.has(score.entity_id)) scoreByEntity.set(score.entity_id, score)
  }

  const eventsByEntity = new Map()
  for (const event of data.events || []) {
    const rows = eventsByEntity.get(event.entity_id) || []
    rows.push(event)
    eventsByEntity.set(event.entity_id, rows)
  }

  const entityRows = [...entityById.values()].map((entity) => ({
    entity,
    events: eventsByEntity.get(entity.id) || [],
  }))

  const freeTasteEntityId = unlockLevel === 'full' ? null : pickFreeTasteEntityId(entityRows)
  const fullUnlock = unlockLevel === 'full'

  return entityRows.map(({ entity, events }) => {
    const scoreRow = scoreByEntity.get(entity.id)
    const topEvent = pickTopEvent(events)
    const additionalCount = Math.max(0, events.length - (topEvent ? 1 : 0))
    const isFreeTaste = fullUnlock || entity.id === freeTasteEntityId

    if (!events.length) {
      return {
        entity_id: entity.id,
        name: entity.canonical_name,
        jurisdiction: entity.jurisdiction || null,
        ticker: entity.ticker || null,
        score: Number(scoreRow?.score ?? 0),
        event_count_90d: 0,
        events_by_type: {},
        headline: entityScanHeadline(entity.canonical_name, 0),
        no_signals_message: noSignalsMessage(entity.canonical_name),
        adjacent_signals: null,
        top_event: null,
        additional_events: [],
        additional_locked_count: 0,
        teaser_unlocked: false,
      }
    }

    const rest = topEvent ? events.filter((event) => event.id !== topEvent.id) : []

    return {
      entity_id: entity.id,
      name: entity.canonical_name,
      jurisdiction: entity.jurisdiction || null,
      ticker: entity.ticker || null,
      score: Number(scoreRow?.score ?? 0),
      event_count_90d: events.length,
      events_by_type: eventsByType(events),
      headline: entityScanHeadline(entity.canonical_name, events.length),
      top_event: topEvent
        ? isFreeTaste
          ? { ...formatEventDetail(topEvent, sourceById), locked: false }
          : { ...lockedEventPreview(topEvent, sourceById), locked: true }
        : null,
      additional_events: isFreeTaste
        ? rest.map((event) =>
            fullUnlock
              ? { ...formatEventDetail(event, sourceById), locked: false }
              : lockedEventPreview(event, sourceById),
          )
        : rest.map((event) => lockedEventPreview(event, sourceById)),
      additional_locked_count: additionalCount,
      locked_summary:
        !fullUnlock && additionalCount > 0
          ? `+${additionalCount} more record${additionalCount === 1 ? '' : 's'} in the last 90 days; unlock to see all`
          : null,
      teaser_unlocked: isFreeTaste,
    }
  })
}

export function blindSpotScanSummary(salesLeads) {
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 86_400_000
  const scans = (salesLeads || []).filter(
    (row) =>
      String(row.source || '') === 'blind_spot_scan' ||
      String(row.metadata?.scan_funnel || '') === 'blind_spot_scan',
  )
  const recentScans = scans.filter((row) => {
    const ts = Date.parse(String(row.created_at || row.metadata?.scanned_at || ''))
    return Number.isFinite(ts) && ts >= sevenDaysAgo
  })

  const entityCounts = new Map()
  let entityTotal = 0
  let resultsOnly = 0

  for (const row of scans) {
    const ids = row.metadata?.entity_ids
    if (Array.isArray(ids) && ids.length) {
      entityTotal += ids.length
      for (const id of ids) {
        entityCounts.set(id, (entityCounts.get(id) || 0) + 1)
      }
    }
  }

  for (const row of recentScans) {
    if (row.metadata?.results_viewed) resultsOnly += 1
  }

  const topEntities = [...entityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([entity_id, count]) => ({ entity_id, scan_count: count }))

  const emailCaptures = scans.length
  const teaserViewsEstimate = Math.max(emailCaptures, resultsOnly)

  return {
    scans_last_7d: recentScans.length,
    avg_entities_per_scan: scans.length ? Math.round((entityTotal / scans.length) * 10) / 10 : 0,
    email_capture_rate: teaserViewsEstimate
      ? Math.round((emailCaptures / teaserViewsEstimate) * 1000) / 1000
      : 0,
    top_scanned_entities: topEntities,
  }
}
