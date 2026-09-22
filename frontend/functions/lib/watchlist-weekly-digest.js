/**
 * Weekly email of new filings (+ early badges) for watched entities only.
 */
import { isTradingEventType, tradingRecordLabel } from './trading-filings.js'
import { sendWatchedWeeklyDigestEmail } from './transactional-email.js'

const LOOKBACK_DAYS = 7
const MAX_USERS = 80
const MAX_ROWS_PER_USER = 12

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400 * 1000).toISOString()
}

function weekKeyUtc(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function isEarlyBadge(event) {
  const detected = Date.parse(String(event.detected_at || event.created_at || ''))
  const news = Date.parse(String(event.news_mentioned_at || event.coverage_first_seen_at || ''))
  if (!Number.isFinite(detected) || !Number.isFinite(news)) return false
  return detected + 30 * 60 * 1000 < news
}

/**
 * @returns {Promise<{ ok: boolean, sent: number, skipped: number, errors: string[] }>}
 */
export async function runWatchedWeeklyDigestJob(env, supabaseRest, { dryRun = false } = {}) {
  const result = { ok: true, sent: 0, skipped: 0, errors: [] }
  const key = weekKeyUtc()

  // Prefer Monday UTC; allow late catch-up through Tuesday 06:00 UTC if Monday cron was missed.
  const now = new Date()
  const day = now.getUTCDay()
  const hour = now.getUTCHours()
  const inWindow = day === 1 || (day === 2 && hour < 6)
  if (!inWindow && !dryRun) {
    result.skipped += 1
    return result
  }

  let members = []
  try {
    members = await supabaseRest(
      env,
      `entity_watchlist_members?select=watchlist_id,entity_id&order=created_at.desc&limit=2000`,
    )
  } catch (error) {
    result.ok = false
    result.errors.push(error instanceof Error ? error.message : String(error))
    return result
  }
  if (!members?.length) return result

  const watchlistIds = [...new Set(members.map((m) => m.watchlist_id).filter(Boolean))]
  let watchlists = []
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

  const userEntityMap = new Map()
  const watchlistById = new Map((watchlists || []).map((w) => [w.id, w]))
  for (const member of members || []) {
    const wl = watchlistById.get(member.watchlist_id)
    if (!wl?.user_id || !member.entity_id) continue
    const meta = wl.metadata && typeof wl.metadata === 'object' ? wl.metadata : {}
    if (meta.weekly_digest_week === key) continue
    const set = userEntityMap.get(wl.user_id) || new Set()
    set.add(member.entity_id)
    userEntityMap.set(wl.user_id, set)
  }

  const userIds = [...userEntityMap.keys()].slice(0, MAX_USERS)
  if (!userIds.length) return result

  let profiles = []
  try {
    profiles = await supabaseRest(
      env,
      `app_profiles?select=user_id,email,plan,role,subscription_status&user_id=in.(${userIds.map((id) => encodeURIComponent(id)).join(',')})`,
    )
  } catch (error) {
    result.ok = false
    result.errors.push(error instanceof Error ? error.message : String(error))
    return result
  }

  const entityIds = [...new Set([...userEntityMap.values()].flatMap((set) => [...set]))]
  let events = []
  try {
    events = await supabaseRest(
      env,
      `legal_events?select=id,entity_id,event_type,title,summary,filing_date,created_at,detected_at,news_mentioned_at,coverage_first_seen_at&entity_id=in.(${entityIds.map((id) => encodeURIComponent(id)).join(',')})&event_type=in.(form_4,congress_trade,institutional_13f)&created_at=gte.${encodeURIComponent(isoDaysAgo(LOOKBACK_DAYS))}&order=created_at.desc&limit=400`,
    )
  } catch (error) {
    result.ok = false
    result.errors.push(error instanceof Error ? error.message : String(error))
    return result
  }

  events = (events || []).filter((e) => isTradingEventType(e.event_type))
  let entities = []
  try {
    entities = await supabaseRest(
      env,
      `entities?select=id,canonical_name&id=in.(${entityIds.map((id) => encodeURIComponent(id)).join(',')})`,
    )
  } catch {
    entities = []
  }
  const nameById = new Map((entities || []).map((e) => [e.id, e.canonical_name]))

  for (const profile of profiles || []) {
    const status = String(profile.subscription_status || '').toLowerCase()
    const email = String(profile.email || '').trim().toLowerCase()
    if (!email) {
      result.skipped += 1
      continue
    }
    if (
      profile.role !== 'admin' &&
      profile.plan !== 'galactic' &&
      status &&
      !['active', 'trialing'].includes(status)
    ) {
      result.skipped += 1
      continue
    }

    const watched = userEntityMap.get(profile.user_id) || new Set()
    const rows = events
      .filter((e) => watched.has(e.entity_id))
      .slice(0, MAX_ROWS_PER_USER)
      .map((e) => ({
        name: nameById.get(e.entity_id) || 'Watched name',
        kind: tradingRecordLabel(e.event_type),
        detail: [e.filing_date ? `Filed ${e.filing_date}` : null, String(e.title || '').slice(0, 120)]
          .filter(Boolean)
          .join(' · '),
        early: isEarlyBadge(e),
      }))

    if (!rows.length) {
      result.skipped += 1
      continue
    }

    if (dryRun) {
      result.sent += 1
      continue
    }

    const send = await sendWatchedWeeklyDigestEmail(env, {
      email,
      subject: `Watched filings this week · ${rows.length} update${rows.length === 1 ? '' : 's'}`,
      headline: `${rows.length} new filing${rows.length === 1 ? '' : 's'} on names you watch`,
      rows,
      siteUrl: env.PUBLIC_SITE_URL,
    })

    if (!send.sent) {
      result.skipped += 1
      if (send.reason === 'email_unconfigured') {
        result.errors.push('RESEND_API_KEY missing on worker')
        result.ok = false
        return result
      }
      continue
    }

    // Mark desk watchlists for this user so we do not re-send the same week.
    const userLists = (watchlists || []).filter((w) => w.user_id === profile.user_id)
    for (const wl of userLists) {
      const meta = wl.metadata && typeof wl.metadata === 'object' ? { ...wl.metadata } : {}
      meta.weekly_digest_week = key
      await supabaseRest(env, `entity_watchlists?id=eq.${encodeURIComponent(wl.id)}`, {
        method: 'PATCH',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ metadata: meta }),
      }).catch(() => null)
    }

    result.sent += 1
  }

  return result
}
