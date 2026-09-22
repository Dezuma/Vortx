/** Live marketing copy derived from ingestion stats — fallbacks stay compliant and non-fabricated. */

import { buildShortTitle, compactEntityName } from './display-title.js'
import { derivedEntityScore } from './derived-scores.js'

export const FALLBACK_FEATURED = {
  entity: 'Laurel Ridge Treatment Center',
  short_title: 'Laurel Ridge Treatment Center workforce layoff notice',
  source: 'Texas WARN Notices',
  sourceUrl: 'https://data.austintexas.gov/',
  filingDate: '2026-04-27',
  signal: 'WARN notice listed 648 affected workers in Bexar County.',
  routedAs: 'Workforce notice / high-severity review queue',
  score: 88,
  urgency: 'Urgent review',
  action: 'Confirm workforce exposure before renewal or wire release.',
  event_type: 'warn_notice',
  jurisdiction: 'Bexar County, Texas',
  source_live: false,
}

export const FALLBACK_HOW_IT_WORKS_TIMELINE = [
  ['2026-04-27', 'Texas open-data feed published Laurel Ridge Treatment Center WARN notice'],
  ['same day', 'Vortx classified it as a workforce-friction signal and scored severity'],
  ['same day', 'The entity entered the subscriber review queue with source and filing date attached'],
  ['next step', 'Analyst decides whether to monitor litigation, credit, collections, or counterparty exposure'],
]

const LOCKED_ENTITY_NAME = 'locked entity'

const FINANCIAL_SOURCE_TYPES = new Set([
  'bankruptcy_chapter_11',
  'bankruptcy_chapter_7',
  'bankruptcy_docket',
  'bankruptcy_adversary',
  'receivership',
  'creditor_dispute',
])

const EVENT_LABELS = {
  mechanics_lien: 'Lien record',
  notice_of_intent: 'Pre-suit notice',
  bankruptcy_adversary: 'Bankruptcy dispute',
  bankruptcy_docket: 'Bankruptcy docket',
  bankruptcy_chapter_11: 'Chapter 11 docket',
  bankruptcy_chapter_7: 'Chapter 7 docket',
  civil_docket: 'Court record',
  warn_notice: 'WARN notice',
  regulatory_notice: 'Agency record',
  receivership: 'Receivership record',
}

function isUsableEntityName(name) {
  const value = compactEntityName(name)
  if (!value || value.length < 3) return false
  return value.toLowerCase() !== LOCKED_ENTITY_NAME
}

function eventTypeLabel(eventType) {
  const key = String(eventType || '').trim()
  if (EVENT_LABELS[key]) return EVENT_LABELS[key]
  return key.replaceAll('_', ' ') || 'public record'
}

function detectedLabel(eventType) {
  const label = eventTypeLabel(eventType)
  if (/^warn/i.test(label)) return 'Workforce notice detected'
  if (/bankruptcy|chapter|receivership/i.test(label)) return `${label} detected`
  if (/lien/i.test(label)) return 'Lien signal detected'
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} detected`
}

function formatJurisdiction(value) {
  const text = String(value || '').trim()
  if (!text) return 'monitored jurisdiction'
  if (/^https?:\/\//i.test(text)) {
    const match = text.match(/\/courts\/([^/?#]+)/i)
    if (match?.[1]) return `Court record (${match[1].replace(/\/$/, '').toUpperCase()})`
    return 'Federal or state court record'
  }
  return text
}

function eventRank(event) {
  const severity = Number(event.severity) || 0
  const filing = Date.parse(String(event.filing_date || '')) || 0
  return severity * 1_000_000_000_000 + filing
}

function extractWorkerDetail(summary) {
  const text = String(summary || '').trim()
  if (!text) return null
  const match = text.match(/(\d[\d,]*)\s+(?:affected\s+)?workers?/i)
  if (match) return `${match[1]} affected workers`
  return null
}

function buildSignalLine(event, entity, source) {
  const jurisdiction = formatJurisdiction(event.jurisdiction || entity.jurisdiction)
  const label = eventTypeLabel(event.event_type || source?.record_type)
  const workers = extractWorkerDetail(event.summary || event.title)
  if (event.event_type === 'warn_notice') {
    return workers
      ? `WARN notice listed ${workers} in ${jurisdiction}.`
      : `WARN notice filed in ${jurisdiction} on ${event.filing_date || 'recent'}.`
  }
  if (/bankruptcy|receivership|chapter/i.test(String(event.event_type || source?.record_type || ''))) {
    return `${label} filed in ${jurisdiction} on ${event.filing_date || 'recent'}.`
  }
  const summary = String(event.summary || '').trim()
  if (summary && summary.length > 20 && !/subscribe for/i.test(summary)) {
    return summary.length > 180 ? `${summary.slice(0, 177)}…` : summary
  }
  return `${label} surfaced in ${jurisdiction} on ${event.filing_date || 'recent'}.`
}

function recommendedAction(eventType) {
  if (eventType === 'warn_notice') {
    return 'Confirm workforce exposure before renewal or wire release.'
  }
  if (/bankruptcy|receivership|chapter/i.test(String(eventType || ''))) {
    return 'Review receivables and contract exposure before the next payment run.'
  }
  if (/lien|notice_of_intent|adversary/i.test(String(eventType || ''))) {
    return 'Pull source documents and add the counterparty to a watchlist.'
  }
  return 'Review source documents and decide whether to monitor ongoing exposure.'
}

function urgencyLabel(score, severity) {
  const value = Number(score) || Number(severity) || 0
  if (value >= 85) return 'Urgent review'
  if (value >= 65) return 'Building pressure'
  return 'Monitored'
}

export function sevenDayCutoff() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 7)
  return date.toISOString().slice(0, 10)
}

export function summarizeRecentActivity(events, windowDays = 7) {
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays)
  const cutoffMs = cutoff.getTime()
  const recent = (events || []).filter((event) => {
    const filed = Date.parse(String(event.filing_date || ''))
    return Number.isFinite(filed) && filed >= cutoffMs
  })
  const companies = new Set(recent.map((event) => event.entity_id).filter(Boolean))
  const warnNotices = recent.filter((event) => event.event_type === 'warn_notice').length
  const bankruptcyDockets = recent.filter((event) =>
    /bankruptcy|receivership|chapter/i.test(String(event.event_type || '')),
  ).length
  return {
    records_surfaced_7d: recent.length,
    companies_flagged_7d: companies.size,
    warn_notices_7d: warnNotices,
    bankruptcy_dockets_7d: bankruptcyDockets,
  }
}

function normalizeEventForScoring(event, source) {
  if (!source?.record_type || !FINANCIAL_SOURCE_TYPES.has(source.record_type)) {
    return { ...event, source_record_type: source?.record_type || null }
  }
  return {
    ...event,
    event_type: source.record_type,
    source_record_type: source.record_type,
  }
}

function entityLatestScore(entity, scores = [], events = []) {
  const scoreRow = (scores || []).find((row) => row.entity_id === entity.id)
  const entityEvents = (events || []).filter((event) => event.entity_id === entity.id)
  return derivedEntityScore(scoreRow, entityEvents, entity)
}

function buildFeaturedRecord({ entity, event, source, scoreRow }) {
  const score = Number(scoreRow?.score ?? event.severity ?? 0)
  const name = compactEntityName(entity.canonical_name)
  const eventType = event.event_type || source?.record_type || 'record'
  const sourceName = source?.name || 'Public source feed'
  const sourceUrl = source?.source_url || event.source_url || null
  const shortTitle = buildShortTitle({
    entityName: name,
    eventType,
    rawCaption: event.title || entity.canonical_name,
  })

  return {
    entity_id: entity.id,
    entity: name,
    short_title: shortTitle,
    raw_caption: event.title || null,
    source: sourceName,
    sourceUrl,
    filingDate: event.filing_date || null,
    signal: buildSignalLine(event, entity, source),
    routedAs: `${eventTypeLabel(eventType)} / ${urgencyLabel(score, event.severity).toLowerCase()} queue`,
    score,
    urgency: urgencyLabel(score, event.severity),
    action: recommendedAction(eventType),
    event_type: eventType,
    jurisdiction: formatJurisdiction(event.jurisdiction || entity.jurisdiction),
    source_live: true,
    selection_basis: 'highest_severity_score',
  }
}

export function pickFeaturedSignal({ entities = [], events = [], sources = [], scores = [] }) {
  const sourceById = new Map((sources || []).map((source) => [source.id, source]))
  const scoreByEntity = new Map()
  for (const row of scores || []) {
    if (!scoreByEntity.has(row.entity_id)) scoreByEntity.set(row.entity_id, row)
  }

  const normalizedEvents = (events || []).map((event) =>
    normalizeEventForScoring(event, sourceById.get(event.source_id)),
  )

  const eventsByEntity = new Map()
  for (const event of normalizedEvents) {
    const rows = eventsByEntity.get(event.entity_id) || []
    rows.push(event)
    eventsByEntity.set(event.entity_id, rows)
  }

  const rankedEntities = [...(entities || [])]
    .filter((entity) => isUsableEntityName(entity.canonical_name))
    .map((entity) => ({
      entity,
      latestScore: entityLatestScore(entity, scores, eventsByEntity.get(entity.id) || []),
      events: eventsByEntity.get(entity.id) || [],
    }))
    .sort((a, b) => b.latestScore - a.latestScore)

  for (const { entity, events: entityEvents } of rankedEntities) {
    const event = [...entityEvents].sort((a, b) => eventRank(b) - eventRank(a))[0]
    if (!event) continue
    const source = sourceById.get(event.source_id)
    const scoreRow = scoreByEntity.get(entity.id)
    const derivedScore = entityLatestScore(entity, scores, entityEvents)
    return buildFeaturedRecord({
      entity,
      event,
      source,
      scoreRow: { ...(scoreRow || {}), score: derivedScore },
    })
  }

  return { ...FALLBACK_FEATURED, source_live: false }
}

export function buildHowItWorksTimeline(featured) {
  if (!featured?.source_live) return FALLBACK_HOW_IT_WORKS_TIMELINE
  const source = featured.source || 'Public source feed'
  const entity = featured.entity || 'This entity'
  const filingDate = featured.filingDate || 'recent'
  const score = Number(featured.score) || 0
  return [
    [filingDate, `${source} published a ${eventTypeLabel(featured.event_type).toLowerCase()} for ${entity}`],
    ['same day', `Vortx scored it ${score}/100 and attached source metadata to the review queue`],
    ['same day', `${entity} entered subscriber watchlists with filing date and jurisdiction attached`],
    ['next step', featured.action || recommendedAction(featured.event_type)],
  ]
}

export function buildDeskTeaserLocked(latestLockedEvent) {
  if (!latestLockedEvent) {
    return {
      title: 'Bankruptcy docket detected',
      copy: 'Entity name, evidence URL, and export columns unlock on your plan.',
    }
  }
  return {
    title: detectedLabel(latestLockedEvent.event_type),
    copy: `${formatJurisdiction(latestLockedEvent.jurisdiction)} · filed ${latestLockedEvent.filing_date || 'recent'} · entity name unlocks on subscribe`,
  }
}

export function buildMarketingContext({
  companiesTracked = 0,
  recordsSurfaced = 0,
  recordsSurfaced7d = 0,
  companiesFlagged7d = 0,
  warnNotices7d = 0,
  bankruptcyDockets7d = 0,
  activeSources = 0,
  sourceFeeds = [],
  featured = FALLBACK_FEATURED,
  latestLockedEvent = null,
}) {
  const feeds = (sourceFeeds || []).filter(Boolean)
  const feedShort = feeds.slice(0, 3).join(' · ')
  const featuredName = featured.short_title || featured.entity || FALLBACK_FEATURED.entity
  const featuredDate = featured.filingDate || 'recent'
  const featuredJurisdiction = featured.jurisdiction || 'monitored jurisdiction'

  let heroRelief = `You're never the last to know a position turned bad.`
  if (featured.source_live) {
    if (featured.event_type === 'warn_notice') {
      heroRelief = `${featuredName} was public ${featuredDate} in ${featuredJurisdiction}, before the layoff headline cycle.`
    } else if (/bankruptcy|receivership|chapter/i.test(String(featured.event_type || ''))) {
      heroRelief = `${featuredName} was public ${featuredDate}, before the restructuring story ran.`
    } else {
      heroRelief = `${featuredName} hit the public record on ${featuredDate} in ${featuredJurisdiction}, before the narrative hardened.`
    }
  }

  const heroCopy = feeds.length
    ? `${feedShort}${feeds.length > 3 ? ' · …' : ''} · ${Number(activeSources) || feeds.length} active feeds · ${Number(recordsSurfaced7d).toLocaleString()} filings surfaced in the last 7 days across ${Number(companiesFlagged7d).toLocaleString()} companies.`
    : `${Number(recordsSurfaced7d).toLocaleString()} public filings surfaced in the last 7 days across ${Number(companiesFlagged7d).toLocaleString()} monitored companies.`

  const statsHeadline =
    recordsSurfaced7d > 0
      ? `${Number(recordsSurfaced7d).toLocaleString()} filings surfaced this week across ${Number(companiesFlagged7d).toLocaleString()} companies, before mainstream coverage.`
      : `${Number(recordsSurfaced).toLocaleString()} filings indexed across ${Number(companiesTracked).toLocaleString()} companies in the live queue.`

  const howItWorksSubcopy = featured.source_live
    ? `${featured.source} → scored ${Number(featured.score) || 0}/100 → review queue with filing date attached. Premium workflows route urgent cases first.`
    : `Public feeds are collected daily, scored by recency and severity, and routed to subscriber watchlists the same day they publish.`

  const sourcesIntro = feeds.length
    ? `${feeds.slice(0, 4).join(' · ')} · ${Number(activeSources) || feeds.length} active feeds refreshed daily. Disabled feeds stay off the list until terms are approved.`
    : `Active sources are listed plainly. Review-gated feeds stay disabled until terms, credentials, and collection scope are approved.`

  const segmentHooks = {
    journalism: featured.source_live
      ? `Latest queue filing: ${featuredDate} · ${featuredJurisdiction} · ${eventTypeLabel(featured.event_type)}.`
      : `Dated public filings arrive before press releases. Verify source and jurisdiction on every row.`,
    hr: warnNotices7d > 0
      ? `${Number(warnNotices7d).toLocaleString()} WARN notices flagged this week across monitored state workforce feeds.`
      : `Monitor competitor WARN filings and sector layoff notices from public state workforce feeds.`,
    smb: bankruptcyDockets7d > 0
      ? `${Number(bankruptcyDockets7d).toLocaleString()} bankruptcy dockets surfaced this week. Run counterparty checks before you sign.`
      : `Run WARN, lien, and bankruptcy checks on vendors before six-figure contracts.`,
  }

  return {
    featured,
    hero_relief: heroRelief,
    hero_copy: heroCopy,
    stats_headline: statsHeadline,
    how_it_works_subcopy: howItWorksSubcopy,
    how_it_works_timeline: buildHowItWorksTimeline(featured),
    sources_intro: sourcesIntro,
    desk_teaser_locked: buildDeskTeaserLocked(latestLockedEvent),
    segment_hooks: segmentHooks,
  }
}
