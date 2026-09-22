import {
  hasSupabase,
  isActiveSubscription,
  json,
  supabaseRest,
  supabaseRestByIds,
  supabaseTableCount,
} from '../lib/supabase-rest.js'
import {
  buildMarketingContext,
  pickFeaturedSignal,
  sevenDayCutoff,
  summarizeRecentActivity,
} from '../lib/marketing-context.js'

const FRESHNESS_DAYS = 180
const DEFAULT_DISPLAY_SUBSCRIBERS = 50

function cutoffDate() {
  const date = new Date()
  date.setDate(date.getDate() - FRESHNESS_DAYS)
  return date.toISOString().slice(0, 10)
}

function displaySubscriberCount(env, activeTeams, companiesWithSignals, salesLeads) {
  const override = Number(env.VORTX_DISPLAY_SUBSCRIBER_COUNT || 0)
  if (Number.isFinite(override) && override > 0) {
    return { count: Math.round(override), source: 'display_override' }
  }
  const computed = Math.max(
    DEFAULT_DISPLAY_SUBSCRIBERS,
    activeTeams + Math.min(18, Math.floor((salesLeads || 0) / 2)),
    Math.floor((companiesWithSignals || 0) / 6),
  )
  return { count: computed, source: 'computed_display' }
}

function teamsLine(subscriberCount, companiesTracked) {
  return `Join ${subscriberCount.toLocaleString()}+ subscribers tracking ${companiesTracked.toLocaleString()} companies in the live queue`
}

function resolveCompaniesTracked(env, totalEntities, entitiesWithRecentSignals) {
  const override = Number(env.VORTX_DISPLAY_COMPANIES_TRACKED || 0)
  if (Number.isFinite(override) && override > 0) {
    return { count: Math.round(override), source: 'display_override' }
  }
  return {
    count: totalEntities || entitiesWithRecentSignals,
    source: totalEntities ? 'entity_catalog' : 'recent_signals',
  }
}


async function loadMarketingInputs(env, windowEvents, sources) {
  const weekCutoff = sevenDayCutoff()
  const feedCutoff = cutoffDate()
  let weekEvents = windowEvents || []
  let feedEvents = []
  try {
    weekEvents = await supabaseRest(
      env,
      `legal_events?select=id,entity_id,event_type,filing_date,jurisdiction,severity,summary,title,source_id&filing_date=gte.${weekCutoff}&order=severity.desc,filing_date.desc&limit=120`,
    )
    feedEvents = await supabaseRest(
      env,
      `legal_events?select=id,entity_id,event_type,filing_date,jurisdiction,severity,confidence,summary,title,source_id,updated_at,created_at&filing_date=gte.${feedCutoff}&order=filing_date.desc&limit=100`,
    )
  } catch {
    weekEvents = (windowEvents || []).filter((event) => String(event.filing_date || '') >= weekCutoff)
    feedEvents = (windowEvents || []).filter((event) => String(event.filing_date || '') >= feedCutoff).slice(0, 100)
  }

  const entityIds = [...new Set(feedEvents.map((event) => event.entity_id).filter(Boolean))]
  let entities = []
  let scores = []
  if (entityIds.length) {
    ;[entities, scores] = await Promise.all([
      supabaseRestByIds(env, {
        table: 'entities',
        select: 'id,canonical_name,jurisdiction',
        ids: entityIds,
      }).catch(() => []),
      supabaseRestByIds(env, {
        table: 'friction_scores',
        select: 'entity_id,score,confidence,computed_at',
        ids: entityIds,
        idColumn: 'entity_id',
      }).catch(() => []),
    ])
  }

  const featured = pickFeaturedSignal({
    entities,
    events: feedEvents,
    sources: sources || [],
    scores,
  })

  const lockedName = (id) => {
    const row = (entities || []).find((entity) => entity.id === id)
    const name = String(row?.canonical_name || '').trim().toLowerCase()
    return !name || name === 'locked entity'
  }

  const latestLockedEvent =
    weekEvents.find((event) => lockedName(event.entity_id)) ||
    weekEvents.find((event) => /bankruptcy|receivership|chapter/i.test(String(event.event_type || ''))) ||
    null

  return { weekEvents, featured, latestLockedEvent }
}

export async function onRequestGet({ env }) {
  if (!hasSupabase(env)) {
    const count = Number(env.VORTX_DISPLAY_SUBSCRIBER_COUNT || DEFAULT_DISPLAY_SUBSCRIBERS)
    const companies = Number(env.VORTX_DISPLAY_COMPANIES_TRACKED || 0)
    const marketing = buildMarketingContext({
      companiesTracked: companies,
      recordsSurfaced: 0,
      activeSources: 0,
      sourceFeeds: [],
    })
    return json({
      ok: true,
      source: 'unconfigured',
      companies_tracked: companies,
      companies_with_recent_signals: 0,
      records_surfaced: 0,
      records_surfaced_7d: 0,
      companies_flagged_7d: 0,
      warn_notices_7d: 0,
      bankruptcy_dockets_7d: 0,
      active_sources: 0,
      subscriber_count: count,
      subscriber_count_source: 'display_override',
      teams_line: teamsLine(count, companies),
      source_feeds: [],
      marketing,
    })
  }

  const cutoff = cutoffDate()
  try {
    const [events, sources, profiles, salesLeads, totalEntities] = await Promise.all([
      supabaseRest(
        env,
        `legal_events?select=entity_id,event_type,filing_date&filing_date=gte.${cutoff}&order=filing_date.desc&limit=500`,
      ),
      supabaseRest(env, 'source_catalog?select=id,name,enabled,record_type,source_url&order=name.asc'),
      supabaseRest(
        env,
        'app_profiles?select=user_id,role,subscription_status&subscription_status=in.(active,trialing)',
      ),
      supabaseRest(env, 'sales_leads?select=id&order=created_at.desc&limit=200'),
      supabaseTableCount(env, 'entities'),
    ])

    const companiesWithRecentSignals = new Set((events || []).map((row) => row.entity_id).filter(Boolean)).size
    const { count: companiesTracked, source: companiesSource } = resolveCompaniesTracked(
      env,
      totalEntities,
      companiesWithRecentSignals,
    )
    const enabledSources = (sources || []).filter((row) => row.enabled)
    const activeTeams = (profiles || []).filter(
      (row) => row.role !== 'admin' && isActiveSubscription(row.subscription_status),
    ).length
    const { count: subscriberCount, source: subscriberSource } = displaySubscriberCount(
      env,
      activeTeams,
      companiesWithRecentSignals,
      (salesLeads || []).length,
    )

    const { weekEvents, featured, latestLockedEvent } = await loadMarketingInputs(env, events, enabledSources)
    const weekActivity = summarizeRecentActivity(weekEvents, 7)

    const marketing = buildMarketingContext({
      companiesTracked,
      recordsSurfaced: (events || []).length,
      recordsSurfaced7d: weekActivity.records_surfaced_7d,
      companiesFlagged7d: weekActivity.companies_flagged_7d,
      warnNotices7d: weekActivity.warn_notices_7d,
      bankruptcyDockets7d: weekActivity.bankruptcy_dockets_7d,
      activeSources: enabledSources.length,
      sourceFeeds: enabledSources.slice(0, 6).map((row) => row.name),
      featured,
      latestLockedEvent,
    })

    return json(
      {
        ok: true,
        source: 'supabase',
        companies_tracked: companiesTracked,
        companies_tracked_source: companiesSource,
        companies_with_recent_signals: companiesWithRecentSignals,
        records_surfaced: (events || []).length,
        records_surfaced_7d: weekActivity.records_surfaced_7d,
        companies_flagged_7d: weekActivity.companies_flagged_7d,
        warn_notices_7d: weekActivity.warn_notices_7d,
        bankruptcy_dockets_7d: weekActivity.bankruptcy_dockets_7d,
        active_sources: enabledSources.length,
        subscriber_count: subscriberCount,
        subscriber_count_source: subscriberSource,
        active_teams: activeTeams,
        teams_line: teamsLine(subscriberCount, companiesTracked),
        source_feeds: enabledSources.slice(0, 6).map((row) => row.name),
        refreshed_daily: true,
        marketing,
      },
      {
        headers: {
          'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=300',
        },
      },
    )
  } catch {
    const count = Number(env.VORTX_DISPLAY_SUBSCRIBER_COUNT || DEFAULT_DISPLAY_SUBSCRIBERS)
    return json(
      {
        ok: false,
        error: 'stats_unavailable',
        subscriber_count: count,
        teams_line: teamsLine(count, 0),
      },
      { status: 503 },
    )
  }
}
