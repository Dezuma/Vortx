import { supabaseRest, supabaseRestByIds } from '../lib/supabase-rest.js'
import { attachTrendingLead, fetchTrendingTopics, pickTrendyHashtag } from '../../../worker/marketing-trends.js'
import { opaqueSignalSlug } from '../lib/signal-slugs.js'
import {
  substackAutoPublishRequested,
  substackConfigured,
  substackPublishOnApproveEnabled,
} from '../lib/substack-publish.js'
import { discordCasesDeliveryConfigured } from '../lib/case-discord-targets.js'

function todayUtc() {
  return new Date().toISOString().slice(0, 10)
}

function humanType(value) {
  const text = String(value || 'public record').replaceAll('_', ' ')
  if (/warn/i.test(text)) return 'WARN notice'
  if (/bankruptcy|docket|chapter/i.test(text)) return 'Bankruptcy docket'
  if (/lien/i.test(text)) return 'Lien cluster'
  if (/receivership/i.test(text)) return 'Receivership'
  return text
}

function ageMinutes(iso) {
  if (!iso) return null
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  return Math.max(0, Math.round(ms / 60_000))
}

export function isWarnPulseEvent(event) {
  const text = `${event?.event_type || ''} ${event?.recordType || ''} ${event?.record_type || ''}`
  return /warn|layoff|workforce/.test(text.toLowerCase())
}

/** WARN notices first, then severity desc, then newer filing date. */
export function comparePulseSignals(a, b) {
  const aWarn = isWarnPulseEvent(a) ? 1 : 0
  const bWarn = isWarnPulseEvent(b) ? 1 : 0
  if (aWarn !== bWarn) return bWarn - aWarn
  const aSev = Number(a?.severity ?? a?.score ?? 0) || 0
  const bSev = Number(b?.severity ?? b?.score ?? 0) || 0
  if (aSev !== bSev) return bSev - aSev
  return String(b?.filing_date || b?.filingDate || '').localeCompare(
    String(a?.filing_date || a?.filingDate || ''),
  )
}

/** One event per entity, preferring WARN over a newer 13F for the same name. */
export function selectPulseEventsByEntity(events) {
  const best = new Map()
  for (const event of events || []) {
    if (!event?.entity_id) continue
    const prev = best.get(event.entity_id)
    if (!prev || comparePulseSignals(event, prev) < 0) best.set(event.entity_id, event)
  }
  return [...best.values()].sort(comparePulseSignals)
}

export function buildOpsConfigStatus(env) {
  const discordOk = discordCasesDeliveryConfigured(env)
  const substackOk = substackConfigured(env)
  const publishOnApprove = substackPublishOnApproveEnabled(env)
  const config_warnings = []
  if (!discordOk) {
    config_warnings.push('Discord Cases webhook missing (DISCORD_CASES_WEBHOOK_URL)')
  }
  if (substackAutoPublishRequested(env) && !substackOk) {
    config_warnings.push('Substack session missing (SUBSTACK_SID / SUBSTACK_SESSION_COOKIE)')
  }
  return {
    config_warnings,
    ops_config: {
      discord_cases_configured: discordOk,
      substack_configured: substackOk,
      substack_publish_on_approve: publishOnApprove,
    },
  }
}

export async function buildAdminStreamPulse(env) {
  const site = String(env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
  const today = todayUtc()

  const [events, sources] = await Promise.all([
    supabaseRest(
      env,
      `legal_events?select=id,entity_id,event_type,jurisdiction,filing_date,severity,confidence&order=filing_date.desc&limit=120`,
    ),
    supabaseRest(
      env,
      'source_catalog?select=slug,name,enabled,record_type,last_success_at&enabled=eq.true&order=last_success_at.desc',
    ),
  ])

  const entityIds = [...new Set((events || []).map((row) => row.entity_id).filter(Boolean))]
  const entities = await supabaseRestByIds(env, {
    table: 'entities',
    select: 'id,canonical_name,jurisdiction',
    ids: entityIds,
  })
  const entityById = new Map((entities || []).map((row) => [row.id, row]))
  const signalCandidates = []

  for (const event of selectPulseEventsByEntity(events || [])) {
    const entity = entityById.get(event.entity_id)
    if (!entity?.canonical_name || !event.entity_id) continue
    const slug = opaqueSignalSlug(event.entity_id)
    signalCandidates.push({
      name: entity.canonical_name,
      entity_id: event.entity_id,
      slug,
      recordType: humanType(event.event_type),
      event_type: event.event_type,
      jurisdiction: event.jurisdiction || entity.jurisdiction,
      filingDate: event.filing_date,
      filing_date: event.filing_date,
      severity: Number(event.severity || 0),
      score: Number(event.severity || 0),
      confidence: Number(event.confidence || 0),
    })
  }

  const latestFilingDate = events?.[0]?.filing_date || null
  const filingsToday = (events || []).filter((event) => event.filing_date === today).length

  const trending = await fetchTrendingTopics(env)
  const warnPool = signalCandidates.filter((row) => isWarnPulseEvent(row))
  const trendPool = warnPool.length ? warnPool : signalCandidates
  const trendPick = await attachTrendingLead(
    { signalCandidates: trendPool, spotlight: trendPool[0] || null },
    env,
    {},
    () => trendPool[0] || null,
  )
  const lead = trendPick.lead

  const activeIngestRuns = (sources || []).slice(0, 10).map((row) => ({
    name: row.name,
    slug: row.slug,
    record_type: row.record_type,
    last_success_at: row.last_success_at,
    minutes_since_run: ageMinutes(row.last_success_at),
    status:
      !row.last_success_at
        ? 'never'
        : ageMinutes(row.last_success_at) <= 120
          ? 'active'
          : ageMinutes(row.last_success_at) <= 1440
            ? 'stale'
            : 'offline',
  }))

  const topSignals = signalCandidates.slice(0, 5).map((row) => ({
    company: row.name,
    slug: row.slug,
    type: row.recordType,
    filed: row.filingDate,
    jurisdiction: row.jurisdiction,
    score: row.score,
    url: `${site}/signal/${row.slug}`,
  }))

  const trendTerm = trending.terms[0] || 'public records'
  const streamHook = lead
    ? `Trending now: ${trendTerm}. Public record already filed for ${lead.name}.`
    : `Trending: ${trendTerm}. Live public-record queue updating.`

  const pulseLine =
    filingsToday > 0
      ? `${filingsToday} filing${filingsToday === 1 ? '' : 's'} dated today (${today})`
      : latestFilingDate
        ? `Latest filing ${latestFilingDate} · none dated today yet`
        : 'No filings in queue yet'

  const { config_warnings, ops_config } = buildOpsConfigStatus(env)

  return {
    refreshed_at: new Date().toISOString(),
    today_utc: today,
    latest_filing_date: latestFilingDate,
    filings_today: filingsToday,
    pulse_line: pulseLine,
    stream_hook: streamHook,
    trendy_hashtag: pickTrendyHashtag(trending),
    trending_terms: trending.terms.slice(0, 8),
    news_spotlight: lead
      ? {
          company: lead.name,
          slug: lead.slug,
          type: humanType(lead.event_type || lead.recordType),
          filed: lead.filingDate,
          jurisdiction: lead.jurisdiction,
          score: lead.score,
          trend_matched: trendPick.matchedTrending,
          signal_url: `${site}/signal/${lead.slug}`,
          pricing_url: `${site}/?view=pricing`,
        }
      : null,
    top_signals: topSignals,
    active_ingest_runs: activeIngestRuns,
    config_warnings,
    ops_config,
    overlay_lines: [
      streamHook,
      lead
        ? `${humanType(lead.event_type || lead.recordType)} · ${lead.filingDate} · score ${lead.score || 'n/a'}`
        : null,
      `Active feeds: ${activeIngestRuns.length} · ${pickTrendyHashtag(trending)}`,
      lead ? `Unlock source trail → ${site}/signal/${lead.slug}` : `Live queue → ${site}`,
      ...config_warnings.map((w) => `Config: ${w}`),
    ].filter(Boolean),
  }
}
