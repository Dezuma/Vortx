/**
 * Watch → email when a watched entity gets a new trading filing.
 * Runs after ingest. Dedupes via watchlist_alert_deliveries.
 */
import { isTradingEventType, tradingRecordLabel } from './trading-filings.js'
import { entitlementForPlan } from './plan-entitlements.js'
import { sendWatchlistTradeAlertEmail } from './transactional-email.js'
import { recordMarketingStep } from '../api/marketing-track.js'

const LOOKBACK_HOURS = 18
const MAX_EVENTS_PER_RUN = 80
const MAX_SENDS_PER_RUN = 80
/** past_due: keep alerts for this grace window, then skip. */
const PAST_DUE_GRACE_HOURS = 72

const PLAN_ALERT_LIMITS = {
  scout: 2,
  sentinel: 5,
  nebula: 10,
  pulsar: 40,
  supernova: 100,
  galactic: null,
  custom: null,
}

function isoHoursAgo(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString()
}

function monthStartIso() {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

function alertLimitForPlan(plan, entitlementRow) {
  const fromEnt =
    entitlementRow?.alert_limit == null || entitlementRow.alert_limit === ''
      ? null
      : Number(entitlementRow.alert_limit)
  if (fromEnt === 0) return PLAN_ALERT_LIMITS[plan] ?? 0
  if (Number.isFinite(fromEnt) && fromEnt > 0) return fromEnt
  if (entitlementRow?.alert_limit == null && PLAN_ALERT_LIMITS[plan] === null) return null
  const override = entitlementForPlan(plan)
  if (override && (override.alert_limit == null || Number(override.alert_limit) === 0)) {
    return PLAN_ALERT_LIMITS[plan] ?? null
  }
  if (override && Number.isFinite(Number(override.alert_limit))) return Number(override.alert_limit)
  return PLAN_ALERT_LIMITS[plan] ?? 0
}

function tradeKindLabel(eventType) {
  const key = String(eventType || '').toLowerCase()
  if (key === 'form_4') return 'Insider Form 4'
  if (key === 'congress_trade') return 'Congress trade'
  if (key === 'institutional_13f') return 'Fund 13F'
  return tradingRecordLabel(eventType)
}

export function buildWatchAlertCopy(event, entityName) {
  const who = String(entityName || 'A watched name').trim() || 'A watched name'
  const kind = tradeKindLabel(event?.event_type)
  const filed = event?.filing_date ? `Filed ${event.filing_date}.` : 'Filing date pending.'
  const title = String(event?.title || event?.short_title || '').trim()
  return {
    subject: `${who} filed again · ${kind}`,
    headline: `${who} has a new ${kind.toLowerCase()}`,
    body: [filed, title ? title.slice(0, 180) : ''].filter(Boolean).join(' '),
    kind,
    who,
  }
}

async function loadEntitlementMap(env, supabaseRest, plans) {
  const unique = [...new Set((plans || []).filter(Boolean))]
  if (!unique.length) return new Map()
  try {
    const rows = await supabaseRest(
      env,
      `entitlements?select=plan,alert_limit&plan=in.(${unique.map((p) => encodeURIComponent(p)).join(',')})`,
    )
    return new Map((rows || []).map((row) => [row.plan, row]))
  } catch {
    return new Map()
  }
}

async function countAlertsThisMonth(env, supabaseRest, userId) {
  try {
    const rows = await supabaseRest(
      env,
      `watchlist_alert_deliveries?select=id&user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(monthStartIso())}`,
    )
    return (rows || []).length
  } catch {
    return 0
  }
}

function shouldSkipSubscriptionStatus(profile) {
  const status = String(profile?.subscription_status || '').toLowerCase()
  const isAdmin = profile?.role === 'admin'
  if (isAdmin || profile?.plan === 'galactic') return false
  if (!status || ['active', 'trialing'].includes(status)) return false
  if (['canceled', 'cancelled', 'unpaid', 'incomplete_expired'].includes(status)) return true
  if (status === 'past_due') {
    const updatedMs = Date.parse(String(profile.updated_at || '')) || 0
    if (!updatedMs) return true
    const graceMs = PAST_DUE_GRACE_HOURS * 3600 * 1000
    return Date.now() - updatedMs > graceMs
  }
  return false
}

/**
 * Expand watch members: entity_id match plus auto-linked issuer ids stored on watchlist metadata.
 */
function expandMemberEntityIds(members, watchlists) {
  const byEntity = new Map()
  for (const member of members || []) {
    const key = String(member.entity_id || '')
    if (!key) continue
    const list = byEntity.get(key) || []
    list.push(member)
    byEntity.set(key, list)
  }
  // Linked issuers are already stored as members when starring; also index reverse from metadata.
  for (const wl of watchlists || []) {
    const auto = wl?.metadata?.auto_linked_issuers
    if (!auto || typeof auto !== 'object') continue
    for (const [filerId, issuerId] of Object.entries(auto)) {
      const issuer = String(issuerId || '').trim()
      const filer = String(filerId || '').trim()
      if (!issuer || !filer) continue
      const filerMembers = byEntity.get(filer) || []
      for (const member of filerMembers) {
        if (String(member.watchlist_id) !== String(wl.id)) continue
        const issuerList = byEntity.get(issuer) || []
        if (!issuerList.some((m) => m.watchlist_id === member.watchlist_id && m.entity_id === issuer)) {
          issuerList.push({ ...member, entity_id: issuer, linked_from: filer })
          byEntity.set(issuer, issuerList)
        }
      }
    }
  }
  return byEntity
}

/**
 * @returns {Promise<{ ok: boolean, scanned: number, candidates: number, sent: number, skipped: number, backlog: number, capped: boolean, errors: string[] }>}
 */
export async function runWatchlistAlertJob(env, supabaseRest, { dryRun = false } = {}) {
  const result = {
    ok: true,
    scanned: 0,
    candidates: 0,
    sent: 0,
    skipped: 0,
    backlog: 0,
    capped: false,
    errors: [],
  }

  let events = []
  try {
    events = await supabaseRest(
      env,
      `legal_events?select=id,entity_id,event_type,title,summary,filing_date,created_at,updated_at&event_type=in.(form_4,congress_trade,institutional_13f)&created_at=gte.${encodeURIComponent(isoHoursAgo(LOOKBACK_HOURS))}&order=created_at.desc&limit=${MAX_EVENTS_PER_RUN}`,
    )
  } catch (error) {
    result.ok = false
    result.errors.push(error instanceof Error ? error.message : String(error))
    return result
  }

  events = (events || []).filter((row) => isTradingEventType(row.event_type) && row.entity_id && row.id)
  result.scanned = events.length
  if (!events.length) return result

  const entityIds = [...new Set(events.map((e) => e.entity_id))]
  let members = []
  try {
    members = await supabaseRest(
      env,
      `entity_watchlist_members?select=watchlist_id,entity_id,created_at&entity_id=in.(${entityIds.map((id) => encodeURIComponent(id)).join(',')})`,
    )
  } catch (error) {
    result.ok = false
    result.errors.push(error instanceof Error ? error.message : String(error))
    return result
  }

  if (!members?.length) {
    // No direct member hits; still check desk lists with issuer links for these event entities.
  }

  let watchlistIds = [...new Set((members || []).map((m) => m.watchlist_id).filter(Boolean))]
  let watchlists = []
  if (watchlistIds.length) {
    try {
      watchlists = await supabaseRest(
        env,
        `entity_watchlists?select=id,user_id,metadata&id=in.(${watchlistIds.map((id) => encodeURIComponent(id)).join(',')})`,
      )
    } catch (error) {
      result.ok = false
      result.errors.push(error instanceof Error ? error.message : String(error))
      return result
    }
  }

  // Desk lists with auto_linked_issuers: alert when issuer entity files even if issuer is not a member.
  let linkedWatchlists = []
  try {
    linkedWatchlists = await supabaseRest(
      env,
      `entity_watchlists?select=id,user_id,metadata&source=eq.desk_star&order=created_at.desc&limit=300`,
    )
  } catch {
    linkedWatchlists = []
  }
  const synthetic = []
  const seenSyn = new Set()
  for (const wl of linkedWatchlists || []) {
    const auto = wl?.metadata?.auto_linked_issuers
    if (!auto || typeof auto !== 'object') continue
    for (const [filerId, issuerId] of Object.entries(auto)) {
      const issuer = String(issuerId || '').trim()
      const filer = String(filerId || '').trim()
      if (!issuer || !entityIds.includes(issuer)) continue
      const key = `${wl.id}|${issuer}`
      if (seenSyn.has(key)) continue
      seenSyn.add(key)
      synthetic.push({
        watchlist_id: wl.id,
        entity_id: issuer,
        created_at: null,
        linked_from: filer,
      })
      if (!watchlistIds.includes(wl.id)) watchlistIds.push(wl.id)
    }
  }
  if (synthetic.length) {
    const missingWl = synthetic
      .map((m) => m.watchlist_id)
      .filter((id) => !(watchlists || []).some((w) => w.id === id))
    if (missingWl.length) {
      try {
        const extra = await supabaseRest(
          env,
          `entity_watchlists?select=id,user_id,metadata&id=in.(${[...new Set(missingWl)].map((id) => encodeURIComponent(id)).join(',')})`,
        )
        watchlists = [...(watchlists || []), ...(extra || [])]
      } catch {
        // keep existing
      }
    }
  }
  members = [...(members || []), ...synthetic]
  if (!members.length) return result

  const watchlistById = new Map((watchlists || []).map((w) => [w.id, w]))
  const userIds = [...new Set((watchlists || []).map((w) => w.user_id).filter(Boolean))]
  if (!userIds.length) return result

  let profiles = []
  try {
    profiles = await supabaseRest(
      env,
      `app_profiles?select=user_id,email,plan,role,subscription_status,updated_at&user_id=in.(${userIds.map((id) => encodeURIComponent(id)).join(',')})`,
    )
  } catch (error) {
    result.ok = false
    result.errors.push(error instanceof Error ? error.message : String(error))
    return result
  }

  const profileById = new Map((profiles || []).map((p) => [p.user_id, p]))
  const entitlementMap = await loadEntitlementMap(
    env,
    supabaseRest,
    [...profileById.values()].map((p) => p.plan),
  )

  let entities = []
  try {
    entities = await supabaseRest(
      env,
      `entities?select=id,canonical_name&id=in.(${entityIds.map((id) => encodeURIComponent(id)).join(',')})`,
    )
  } catch {
    entities = []
  }
  const entityNameById = new Map((entities || []).map((e) => [e.id, e.canonical_name]))

  const membersByEntity = expandMemberEntityIds(members, watchlists)

  const monthlyCountCache = new Map()
  const alreadySentCache = new Set()
  let pendingAfterCap = 0

  for (const event of events) {
    const entityMembers = membersByEntity.get(String(event.entity_id)) || []
    const eventCreatedMs = Date.parse(String(event.created_at || '')) || Date.now()

    for (const member of entityMembers) {
      if (result.sent >= MAX_SENDS_PER_RUN) {
        pendingAfterCap += 1
        continue
      }
      const watchlist = watchlistById.get(member.watchlist_id)
      if (!watchlist?.user_id) {
        result.skipped += 1
        continue
      }
      const profile = profileById.get(watchlist.user_id)
      const email = String(profile?.email || '').trim().toLowerCase()
      if (!email || !profile) {
        result.skipped += 1
        continue
      }
      if (shouldSkipSubscriptionStatus(profile)) {
        result.skipped += 1
        continue
      }

      const watchedAtMs = Date.parse(String(member.created_at || '')) || 0
      if (watchedAtMs && eventCreatedMs && eventCreatedMs < watchedAtMs - 60_000) {
        result.skipped += 1
        continue
      }

      const dedupeKey = `${profile.user_id}|${event.id}`
      if (alreadySentCache.has(dedupeKey)) {
        result.skipped += 1
        continue
      }

      try {
        const prior = await supabaseRest(
          env,
          `watchlist_alert_deliveries?select=id&user_id=eq.${encodeURIComponent(profile.user_id)}&event_id=eq.${encodeURIComponent(event.id)}&limit=1`,
        )
        if (prior?.length) {
          alreadySentCache.add(dedupeKey)
          result.skipped += 1
          continue
        }
      } catch (error) {
        result.ok = false
        result.errors.push(
          error instanceof Error
            ? `delivery_lookup: ${error.message}`
            : 'delivery_lookup_failed',
        )
        return result
      }

      const plan = String(profile.plan || 'scout')
      const limit = alertLimitForPlan(plan, entitlementMap.get(plan))
      if (limit != null) {
        let used = monthlyCountCache.get(profile.user_id)
        if (used == null) {
          used = await countAlertsThisMonth(env, supabaseRest, profile.user_id)
          monthlyCountCache.set(profile.user_id, used)
        }
        if (used >= limit) {
          result.skipped += 1
          continue
        }
      }

      result.candidates += 1
      const entityName = entityNameById.get(event.entity_id) || 'Watched name'
      const copy = buildWatchAlertCopy(event, entityName)

      if (dryRun) {
        result.sent += 1
        alreadySentCache.add(dedupeKey)
        continue
      }

      const send = await sendWatchlistTradeAlertEmail(env, {
        email,
        entityName: copy.who,
        kind: copy.kind,
        subject: copy.subject,
        headline: copy.headline,
        body: copy.body,
        filingDate: event.filing_date || null,
        siteUrl: env.PUBLIC_SITE_URL,
      })

      if (!send.sent) {
        result.skipped += 1
        if (send.reason && send.reason !== 'email_unconfigured') {
          result.errors.push(`${email}: ${send.reason}`)
        }
        if (send.reason === 'email_unconfigured') {
          result.errors.push('RESEND_API_KEY missing on worker')
          result.ok = false
          return result
        }
        continue
      }

      try {
        await supabaseRest(env, 'watchlist_alert_deliveries', {
          method: 'POST',
          headers: { prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify([
            {
              user_id: profile.user_id,
              entity_id: event.entity_id,
              event_id: event.id,
              email,
              plan,
            },
          ]),
        })
      } catch (error) {
        result.errors.push(
          error instanceof Error ? `delivery_write: ${error.message}` : 'delivery_write_failed',
        )
      }

      alreadySentCache.add(dedupeKey)
      monthlyCountCache.set(profile.user_id, (monthlyCountCache.get(profile.user_id) || 0) + 1)
      result.sent += 1
      await recordMarketingStep(env, {
        step: 'alert_email_sent',
        surface: 'watchlist_alerts',
        detail: String(event.event_type || 'trade').slice(0, 40),
      }).catch(() => null)
    }
  }

  result.backlog = pendingAfterCap
  result.capped = pendingAfterCap > 0
  if (result.capped) {
    result.errors.push(`alert_backlog:${pendingAfterCap}_pending_after_cap_${MAX_SENDS_PER_RUN}`)
  }

  return result
}

export async function loadAlertSummaryForUser(env, supabaseRest, userId, plan) {
  const empty = {
    sent_this_month: 0,
    last_alert_at: null,
    alert_limit: alertLimitForPlan(plan, entitlementForPlan(plan)),
  }
  if (!userId) return empty
  try {
    const [monthRows, lastRows] = await Promise.all([
      supabaseRest(
        env,
        `watchlist_alert_deliveries?select=id,created_at&user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(monthStartIso())}&order=created_at.desc`,
      ),
      supabaseRest(
        env,
        `watchlist_alert_deliveries?select=created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`,
      ),
    ])
    return {
      sent_this_month: (monthRows || []).length,
      last_alert_at: lastRows?.[0]?.created_at || null,
      alert_limit: alertLimitForPlan(plan, entitlementForPlan(plan)),
    }
  } catch {
    return empty
  }
}
