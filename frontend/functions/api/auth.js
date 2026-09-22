import {
  adminEmails,
  bearerToken,
  hasSupabase,
  isActiveSubscription,
  json,
  PAID_PLANS,
  supabaseAuthUser,
  supabaseRest,
} from '../lib/supabase-rest.js'
import { capabilityLocks, planCapabilities } from '../lib/plan-capabilities.js'
import {
  buildSinceSubscribedStat,
  buildVisitSummary,
  buildWatchlistIndex,
  hydrateWatchlistMembers,
  dedupeLiveFeedEvents,
  loadPreviousDeskVisit,
  loadSubscriptionStartedAt,
  planUpgradeHint,
  scoreLiveFeedRow,
  watchlistMatchNote,
} from '../lib/customer-desk.js'
import {
  customerActionHint,
  attachFilingIdentifiers,
  isPublicRecordFilingUrl,
  loadEventEvidenceUrls,
  noticeKindForEvent,
  resolveEventSourceUrl,
  resolveRecordType,
  urgencyLabel,
} from '../lib/event-evidence.js'
import { entitlementForPlan } from '../lib/plan-entitlements.js'
import { blindSpotScanSummary } from '../lib/scan-core.js'
import { getSupabasePublishableKey, getSupabaseServiceRoleKey, getSupabaseUrl } from '../lib/worker-env.js'
import {
  deriveTradingSignalMeta,
  isTradingEventType,
  selectBalancedTradingFeed,
} from '../lib/trading-filings.js'
import { loadAlertSummaryForUser } from '../lib/watchlist-alerts.js'
import { detectionTimestamp } from '../lib/news-coverage.js'

const DESK_WATCHLIST_LABEL = 'Desk watchlist'

const FRESHNESS_DAYS = 180
const FINANCIAL_SOURCE_TYPES = new Set([
  'bankruptcy_chapter_11',
  'bankruptcy_chapter_7',
  'bankruptcy_docket',
  'bankruptcy_adversary',
  'receivership',
  'creditor_dispute',
])
const REQUIRED_TABLES = [
  ['entities', 'id'],
  ['legal_events', 'id'],
  ['source_catalog', 'id'],
  ['friction_scores', 'id'],
  ['sales_leads', 'id'],
  ['service_requests', 'id'],
  ['checkout_sessions', 'id'],
  ['query_audit_events', 'id'],
  ['app_profiles', 'user_id'],
]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SUBSCRIPTION_STATUSES = new Set(['none', 'trialing', 'active', 'past_due', 'canceled'])
const CUSTOMER_ROLES = new Set(['customer', 'admin'])

function cutoffDate() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - FRESHNESS_DAYS)
  return date.toISOString().slice(0, 10)
}

function boolStatus(value) {
  return value ? 'ok' : 'missing'
}

function ageLabel(value) {
  const timestamp = Date.parse(String(value || ''))
  if (!Number.isFinite(timestamp)) return 'unknown'
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000))
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

async function countRows(env, table, idColumn = 'id') {
  const url = getSupabaseUrl(env)
  const key = getSupabaseServiceRoleKey(env)
  if (!url || !key) return { table, status: 'missing_supabase', count: null }
  const response = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(idColumn)}&limit=1`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      prefer: 'count=exact',
    },
  })
  const range = response.headers.get('content-range') || ''
  const match = range.match(/\/(\d+)$/)
  return {
    table,
    status: response.ok || response.status === 206 ? 'ok' : `error_${response.status}`,
    count: match ? Number(match[1]) : null,
  }
}

async function marketingHealth() {
  try {
    const response = await fetch('https://vortx-marketing-bot.debaezu.workers.dev/health', {
      headers: { accept: 'application/json' },
    })
    const payload = await response.json()
    return {
      ok: response.ok && payload?.ok === true,
      status: response.status,
      enabled: Boolean(payload?.enabled),
      dry_run: Boolean(payload?.dry_run),
      image_mode: payload?.image_mode || null,
      has_x_oauth1: Boolean(payload?.has_x_oauth1),
      has_supabase: Boolean(payload?.has_supabase),
      has_google_image_key: Boolean(payload?.has_google_image_key),
    }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}

async function opsSnapshot(env, lists = {}) {
  const [tableCounts, latestEvents, scoreRows, marketing] = await Promise.all([
    Promise.all(REQUIRED_TABLES.map(([table, idColumn]) => countRows(env, table, idColumn))),
    supabaseRest(env, 'legal_events?select=id,event_type,filing_date,created_at,updated_at,severity,confidence&order=filing_date.desc&limit=100'),
    supabaseRest(env, 'friction_scores?select=score,confidence,computed_at&order=computed_at.desc&limit=100'),
    marketingHealth(),
  ])

  const sources = lists.sources || []
  const checkouts = lists.checkouts || []
  const salesLeads = lists.salesLeads || []
  const serviceRequests = lists.serviceRequests || []
  const profiles = lists.profiles || []
  const events = latestEvents || []
  const latestEvent = events[0] || null
  const scores = (scoreRows || []).map((row) => Number(row.score)).filter((score) => Number.isFinite(score))
  const scoreDistribution = scores.reduce((acc, score) => {
    const band = score >= 80 ? '80_plus' : score >= 65 ? '65_79' : score > 0 ? '1_64' : 'zero'
    acc[band] = (acc[band] || 0) + 1
    return acc
  }, { zero: 0, '1_64': 0, '65_79': 0, '80_plus': 0 })

  return {
    generated_at: new Date().toISOString(),
    ops_health: {
      supabase_url: boolStatus(getSupabaseUrl(env)),
      supabase_service_role: boolStatus(getSupabaseServiceRoleKey(env)),
      stripe_secret: boolStatus(env.STRIPE_SECRET_KEY),
      public_site_url: boolStatus(env.PUBLIC_SITE_URL),
      marketing_run_token: boolStatus(env.MARKETING_BOT_RUN_TOKEN),
      admin_email_count: adminEmails(env).length,
    },
    data_health: {
      table_counts: Object.fromEntries(tableCounts.map((row) => [row.table, row.count])),
      table_status: Object.fromEntries(tableCounts.map((row) => [row.table, row.status])),
      latest_event_date: latestEvent?.filing_date || null,
      latest_event_age: ageLabel(latestEvent?.updated_at || latestEvent?.created_at || latestEvent?.filing_date),
      recent_events_loaded: events.length,
      score_distribution: scoreDistribution,
      score_unique_count: new Set(scores).size,
      score_min: scores.length ? Math.min(...scores) : null,
      score_max: scores.length ? Math.max(...scores) : null,
    },
    source_freshness: {
      total_sources: sources.length,
      enabled_sources: sources.filter((source) => source.enabled).length,
      disabled_sources: sources.filter((source) => !source.enabled).length,
      terms: sources.reduce((acc, source) => {
        const key = source.terms_status || 'unknown'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {}),
      stale_sources: sources
        .filter((source) => source.enabled && source.last_success_at && Date.now() - Date.parse(source.last_success_at) > 36 * 60 * 60 * 1000)
        .map((source) => ({ slug: source.slug, name: source.name, last_success_at: source.last_success_at })),
      never_succeeded_sources: sources
        .filter((source) => source.enabled && !source.last_success_at)
        .map((source) => ({
          slug: source.slug,
          name: source.name,
          notes: source.notes || null,
        })),
      degraded_sources: sources
        .filter((source) => /ingest degraded|zero_rows|stale_mirror|unavailable/i.test(String(source.notes || '')))
        .map((source) => ({
          slug: source.slug,
          name: source.name,
          enabled: Boolean(source.enabled),
          last_success_at: source.last_success_at || null,
          notes: source.notes || null,
        })),
      recent_sources: sources
        .filter((source) => source.enabled)
        .slice(0, 12)
        .map((source) => ({
          slug: source.slug,
          name: source.name,
          record_type: source.record_type,
          enabled: Boolean(source.enabled),
          terms_status: source.terms_status,
          last_success_at: source.last_success_at || null,
          freshness: source.last_success_at ? ageLabel(source.last_success_at) : 'never succeeded',
          notes: source.notes || null,
        })),
    },
    marketing_health: marketing,
    billing_health: {
      stripe_secret: boolStatus(env.STRIPE_SECRET_KEY),
      configured_prices: {
        scout: boolStatus(env.STRIPE_SCOUT_PRICE_ID),
        sentinel: boolStatus(env.STRIPE_SENTINEL_PRICE_ID),
        nebula: boolStatus(env.STRIPE_NEBULA_PRICE_ID),
        pulsar: boolStatus(env.STRIPE_PULSAR_PRICE_ID),
        supernova: boolStatus(env.STRIPE_SUPERNOVA_PRICE_ID),
        galactic: boolStatus(env.STRIPE_GALACTIC_PRICE_ID),
        custom: boolStatus(env.STRIPE_CUSTOM_PRICE_ID),
      },
      recent_checkouts: checkouts.length,
      completed_or_paid_checkouts: checkouts.filter((row) => ['complete', 'completed', 'paid'].includes(String(row.status || row.payment_status || '').toLowerCase())).length,
    },
    customer_health: {
      profiles: profiles.length,
      active_profiles: profiles.filter((row) => isActiveSubscription(row.subscription_status)).length,
      sales_leads: salesLeads.length,
      open_service_requests: serviceRequests.filter((row) => !['closed', 'delivered'].includes(String(row.status || '').toLowerCase())).length,
    },
    safe_tests: [
      'health',
      'data_freshness',
      'source_freshness',
      'marketing_health',
      'billing_config',
      'public_signals',
      'lead_capture_validation',
      'blind_spot_scan',
    ],
    blind_spot_scan_summary: blindSpotScanSummary(salesLeads),
  }
}

async function profileFor(env, user) {
  const email = String(user.email || '').toLowerCase()
  const rows = await supabaseRest(
    env,
    `app_profiles?select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
  )
  let profile = rows?.[0] || null

  const admins = adminEmails(env)
  const shouldBeAdmin = admins.includes(email)

  if (!profile) {
    const emailRows = await supabaseRest(
      env,
      `app_profiles?select=*&email=eq.${encodeURIComponent(email)}&limit=1`,
    )
    const emailProfile = emailRows?.[0] || null
    if (emailProfile) {
      const updated = await supabaseRest(env, `app_profiles?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: user.id,
          role: shouldBeAdmin ? 'admin' : emailProfile.role || 'customer',
          plan: shouldBeAdmin ? 'custom' : emailProfile.plan || 'nebula',
          subscription_status: shouldBeAdmin ? 'active' : emailProfile.subscription_status || 'none',
          updated_at: new Date().toISOString(),
        }),
      })
      profile = updated?.[0] || emailProfile
    }
  }

  if (!profile) {
    const insert = await supabaseRest(env, 'app_profiles', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify([
        {
          user_id: user.id,
          email,
          role: shouldBeAdmin ? 'admin' : 'customer',
          plan: shouldBeAdmin ? 'custom' : 'nebula',
          subscription_status: shouldBeAdmin ? 'active' : 'none',
        },
      ]),
    })
    profile = insert?.[0] || null
  } else if (
    shouldBeAdmin &&
    (profile.role !== 'admin' || !isActiveSubscription(profile.subscription_status))
  ) {
    const updated = await supabaseRest(env, `app_profiles?user_id=eq.${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        role: 'admin',
        plan: 'custom',
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      }),
    })
    profile = updated?.[0] || profile
  }

  return profile
}

async function requireSession(request, env) {
  const token = bearerToken(request)
  if (!token) {
    const error = new Error('missing_bearer_token')
    error.status = 401
    error.body = {
      ok: false,
      error: 'missing_bearer_token',
      message: 'Log in to continue.',
    }
    throw error
  }

  if (!hasSupabase(env)) {
    const error = new Error('supabase_unconfigured')
    error.status = 503
    error.body = { ok: false, error: 'supabase_unconfigured' }
    throw error
  }

  let user
  try {
    user = await supabaseAuthUser(env, token)
  } catch {
    const error = new Error('invalid_session')
    error.status = 401
    error.body = {
      ok: false,
      error: 'invalid_session',
      message: 'Session is expired or invalid.',
    }
    throw error
  }

  const profile = await profileFor(env, user)
  return { token, user, profile }
}

function requireAdmin(profile) {
  if (profile?.role !== 'admin') {
    const error = new Error('admin_required')
    error.status = 403
    error.body = {
      ok: false,
      error: 'admin_required',
      message: 'Admin role required.',
    }
    throw error
  }
}

/** Same admin gate as /api/admin/* routes: session + profileFor sync + admin role. */
export async function requireAdminSession(request, env) {
  const session = await requireSession(request, env)
  requireAdmin(session.profile)
  return session
}

function requireSubscriber(profile) {
  if (profile?.role === 'admin') {
    return
  }

  if (
    !profile ||
    !PAID_PLANS.has(profile.plan) ||
    !isActiveSubscription(profile.subscription_status)
  ) {
    const error = new Error('subscription_required')
    error.status = 403
    error.body = {
      ok: false,
      error: 'subscription_required',
      message: 'An active subscription is required for this feature.',
    }
    throw error
  }
}

async function auditQuery(env, profile, route, meta = {}) {
  const resultCount = Number(meta.result_count ?? meta.rows ?? meta.tests?.length ?? 0) || 0
  try {
    await supabaseRest(env, 'query_audit_events', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify([
        {
          subscriber_email: profile?.email || null,
          surface: 'api',
          query: route,
          result_count: resultCount,
        },
      ]),
    })
    return true
  } catch (error) {
    console.error('audit_query_failed', route, error?.message || error)
    return false
  }
}

async function findAuthUserByEmail(env, email) {
  const response = await fetch(`${getSupabaseUrl(env)}/auth/v1/admin/users?per_page=1000`, {
    headers: {
      apikey: getSupabaseServiceRoleKey(env),
      authorization: `Bearer ${getSupabaseServiceRoleKey(env)}`,
      accept: 'application/json',
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || payload?.msg || `auth_user_lookup_failed_${response.status}`)
  return (payload.users || []).find((user) => String(user.email || '').toLowerCase() === email.toLowerCase()) || null
}

async function createAuthUser(env, email, password) {
  const response = await fetch(`${getSupabaseUrl(env)}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: getSupabaseServiceRoleKey(env),
      authorization: `Bearer ${getSupabaseServiceRoleKey(env)}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'customer' },
      app_metadata: { role: 'customer' },
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || payload?.msg || payload?.error || `auth_user_create_failed_${response.status}`)
  return payload
}

async function parseRequestBody(request) {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    return Object.fromEntries((await request.formData()).entries())
  }
  return request.json()
}

function wantsHtmlResponse(request) {
  const accept = String(request.headers.get('accept') || '')
  if (accept.includes('text/html')) return true
  const contentType = String(request.headers.get('content-type') || '')
  return (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  )
}

function signupRedirect(origin, query) {
  return Response.redirect(`${origin}/signup?${query}`, 303)
}

export function publicSiteOrigin(env, request) {
  const explicit = String(env.PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')
  if (explicit) return explicit
  return new URL(request.url).origin
}

async function passwordGrant(env, email, password) {
  const url = getSupabaseUrl(env)
  const apikey = getSupabasePublishableKey(env)
  if (!url || !apikey) {
    return { ok: false, error: 'supabase_auth_unconfigured', message: 'Sign-in is not available right now.' }
  }

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      ok: false,
      error: 'invalid_credentials',
      message: payload?.error_description || payload?.msg || payload?.message || 'Invalid login credentials',
    }
  }

  const accessToken = String(payload.access_token || '').trim()
  if (!accessToken) {
    return { ok: false, error: 'auth_failed', message: 'No access token returned.' }
  }

  return {
    ok: true,
    access_token: accessToken,
    refresh_token: payload.refresh_token || null,
    user: payload.user || null,
  }
}

function authHandoffCookieValue(tokens) {
  return encodeURIComponent(
    JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
      exp: Date.now() + 120_000,
    }),
  )
}

export async function onAuthConsumeHandoff({ request, env }) {
  try {
    const cookie = String(request.headers.get('cookie') || '')
    const match = cookie.match(/(?:^|;\s*)vortx_auth_handoff=([^;]+)/)
    if (!match) {
      return json({ ok: false, error: 'handoff_missing', message: 'Sign-in handoff expired. Log in again.' }, { status: 401 })
    }

    let payload
    try {
      payload = JSON.parse(decodeURIComponent(match[1]))
    } catch {
      return json({ ok: false, error: 'handoff_invalid', message: 'Sign-in handoff invalid.' }, { status: 400 })
    }

    if (!payload?.access_token || Number(payload.exp || 0) < Date.now()) {
      return json({ ok: false, error: 'handoff_expired', message: 'Sign-in handoff expired. Log in again.' }, { status: 401 })
    }

    const headers = new Headers({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'set-cookie': 'vortx_auth_handoff=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    })

    return new Response(
      JSON.stringify({
        ok: true,
        access_token: payload.access_token,
        refresh_token: payload.refresh_token || null,
      }),
      { status: 200, headers },
    )
  } catch (error) {
    return json({ ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onAuthLogin({ request, env }) {
  try {
    const url = getSupabaseUrl(env)
    const apikey = getSupabasePublishableKey(env)
    if (!url || !apikey) {
      return json({ ok: false, error: 'supabase_auth_unconfigured', message: 'Sign-in is not available right now.' }, { status: 503 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }

    const email = String(body.email || '').trim().toLowerCase().slice(0, 254)
    const password = String(body.password || '')
    if (!EMAIL_RE.test(email) || !password) {
      return json(
        { ok: false, error: 'invalid_credentials', message: 'Email and password are required.' },
        { status: 400 },
      )
    }

    const session = await passwordGrant(env, email, password)
    if (!session.ok) {
      return json(session, { status: session.error === 'invalid_credentials' ? 401 : 503 })
    }

    return json({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: session.user || null,
    })
  } catch (error) {
    return json({ ok: false, error: error.message }, { status: error.status || 500 })
  }
}

const OAUTH_PROVIDERS = new Set(['google', 'azure', 'apple'])

function sameOriginRedirect(request, redirectTo, fallback, env) {
  const canonical = publicSiteOrigin(env, request)
  const requestOrigin = new URL(request.url).origin
  try {
    const parsed = new URL(String(redirectTo || fallback), canonical)
    const allowedOrigins = new Set([canonical, requestOrigin])
    if (!allowedOrigins.has(parsed.origin)) return fallback
    return parsed.toString()
  } catch {
    return fallback
  }
}

export async function onAuthOAuthStart({ request, env }) {
  try {
    const url = new URL(request.url)
    const provider = String(url.searchParams.get('provider') || 'google').toLowerCase()
    if (!OAUTH_PROVIDERS.has(provider)) {
      return json({ ok: false, error: 'invalid_provider', message: 'Unsupported sign-in provider.' }, { status: 400 })
    }

    const supabaseUrl = getSupabaseUrl(env)
    const apikey = getSupabasePublishableKey(env)
    if (!supabaseUrl || !apikey) {
      return json(
        { ok: false, error: 'supabase_auth_unconfigured', message: 'Sign-in is not available right now.' },
        { status: 503 },
      )
    }

    const origin = publicSiteOrigin(env, request)
    const fallback = `${origin}/?view=customer`
    const redirectTo = sameOriginRedirect(request, url.searchParams.get('redirect_to'), fallback, env)
    const authorize = new URL(`${supabaseUrl}/auth/v1/authorize`)
    authorize.searchParams.set('provider', provider)
    authorize.searchParams.set('redirect_to', redirectTo)
    authorize.searchParams.set('apikey', apikey)
    return Response.redirect(authorize.toString(), 302)
  } catch (error) {
    return json({ ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onAuthMagicLink({ request, env }) {
  try {
    const supabaseUrl = getSupabaseUrl(env)
    const apikey = getSupabasePublishableKey(env)
    if (!supabaseUrl || !apikey) {
      return json(
        { ok: false, error: 'supabase_auth_unconfigured', message: 'Sign-in is not available right now.' },
        { status: 503 },
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }

    const email = String(body.email || '').trim().toLowerCase().slice(0, 254)
    if (!EMAIL_RE.test(email)) {
      return json({ ok: false, error: 'invalid_email', message: 'A valid email is required.' }, { status: 400 })
    }

    const origin = publicSiteOrigin(env, request)
    const view = String(body.view || 'customer').toLowerCase() === 'admin' ? 'admin' : 'customer'
    const redirectTo = sameOriginRedirect(request, body.redirect_to, `${origin}/?view=${view}`, env)

    const response = await fetch(`${supabaseUrl}/auth/v1/otp`, {
      method: 'POST',
      headers: {
        apikey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        create_user: true,
        options: { email_redirect_to: redirectTo },
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return json(
        {
          ok: false,
          error: 'magic_link_failed',
          message: payload?.error_description || payload?.msg || payload?.message || 'Could not send sign-in link.',
        },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
      )
    }

    return json({
      ok: true,
      message: 'Check your email for a one-click sign-in link.',
    })
  } catch (error) {
    return json({ ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onAuthRecover({ request, env }) {
  try {
    const supabaseUrl = getSupabaseUrl(env)
    const apikey = getSupabasePublishableKey(env)
    if (!supabaseUrl || !apikey) {
      return json(
        { ok: false, error: 'supabase_auth_unconfigured', message: 'Sign-in is not available right now.' },
        { status: 503 },
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }

    const email = String(body.email || '').trim().toLowerCase().slice(0, 254)
    if (!EMAIL_RE.test(email)) {
      return json({ ok: false, error: 'invalid_email', message: 'A valid email is required.' }, { status: 400 })
    }

    const origin = publicSiteOrigin(env, request)
    const view = String(body.view || 'customer').toLowerCase() === 'admin' ? 'admin' : 'customer'
    const redirectTo = sameOriginRedirect(
      request,
      body.redirect_to,
      `${origin}/?view=${view}&auth=recovery`,
      env,
    )

    const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        apikey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        options: { redirect_to: redirectTo },
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return json(
        {
          ok: false,
          error: 'recover_failed',
          message: payload?.error_description || payload?.msg || payload?.message || 'Could not send reset email.',
        },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
      )
    }

    return json({
      ok: true,
      message: 'If an account exists for that email, a password reset link is on the way.',
    })
  } catch (error) {
    return json({ ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onCustomerSignup({ request, env }) {
  const siteOrigin = publicSiteOrigin(env, request)
  const htmlFlow = wantsHtmlResponse(request)

  try {
    if (!hasSupabase(env)) {
      if (htmlFlow) return signupRedirect(siteOrigin, 'error=supabase_unconfigured')
      return json({ ok: false, error: 'supabase_unconfigured' }, { status: 503 })
    }

    let body
    try {
      body = await parseRequestBody(request)
    } catch {
      if (htmlFlow) return signupRedirect(siteOrigin, 'error=invalid_body')
      return json({ ok: false, error: 'invalid_body' }, { status: 400 })
    }

    const email = String(body.email || '').trim().toLowerCase().slice(0, 254)
    const password = String(body.password || '').trim()
    const confirmPassword = String(body.confirm_password || body.confirmPassword || '').trim()
    const termsAccepted = body.terms_accepted === true || body.terms_accepted === 'true' || body.terms === 'on'

    if (!EMAIL_RE.test(email)) {
      if (htmlFlow) return signupRedirect(siteOrigin, 'error=invalid_email')
      return json({ ok: false, error: 'invalid_email', message: 'A valid email is required.' }, { status: 400 })
    }
    if (!termsAccepted) {
      if (htmlFlow) return signupRedirect(siteOrigin, 'error=terms_required')
      return json({ ok: false, error: 'terms_required', message: 'Accept the terms to create an account.' }, { status: 400 })
    }
    if (password.length < 10) {
      if (htmlFlow) return signupRedirect(siteOrigin, 'error=weak_password')
      return json({ ok: false, error: 'weak_password', message: 'Password must be at least 10 characters.' }, { status: 400 })
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      if (htmlFlow) return signupRedirect(siteOrigin, 'error=weak_password')
      return json(
        { ok: false, error: 'weak_password', message: 'Password needs uppercase, lowercase, and a number.' },
        { status: 400 },
      )
    }
    if (confirmPassword && confirmPassword !== password) {
      if (htmlFlow) return signupRedirect(siteOrigin, 'error=password_mismatch')
      return json({ ok: false, error: 'password_mismatch', message: 'Passwords do not match.' }, { status: 400 })
    }

    const existing = await findAuthUserByEmail(env, email)
    if (existing?.id) {
      if (htmlFlow) return Response.redirect(`${siteOrigin}/?view=customer&signup=exists`, 303)
      return json({ ok: false, error: 'account_exists', message: 'Account already exists. Log in with this email.' }, { status: 409 })
    }

    const created = await createAuthUser(env, email, password)
    const user = created?.id ? created : created?.user || created
    if (!user?.id) {
      if (htmlFlow) return signupRedirect(siteOrigin, 'error=auth_create_failed')
      return json({ ok: false, error: 'auth_create_failed', message: 'Could not create login. Try again or contact support.' }, { status: 500 })
    }
    const existingProfiles = await supabaseRest(env, `app_profiles?select=*&email=eq.${encodeURIComponent(email)}&limit=1`)
    const existingProfile = existingProfiles?.[0] || null
    const profilePayload = {
      user_id: user.id,
      email,
      role: 'customer',
      plan: existingProfile?.plan || 'nebula',
      subscription_status: existingProfile?.subscription_status || 'none',
      updated_at: new Date().toISOString(),
    }

    if (existingProfile?.email) {
      await supabaseRest(env, `app_profiles?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH',
        body: JSON.stringify(profilePayload),
      })
    } else {
      await supabaseRest(env, 'app_profiles', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify([profilePayload]),
      })
    }

    const session = await passwordGrant(env, email, password)

    if (htmlFlow) {
      const redirectUrl = `${siteOrigin}/?view=customer&signup=created`
      if (session.ok) {
        return new Response(null, {
          status: 303,
          headers: {
            location: `${redirectUrl}&auth=handoff`,
            'set-cookie': `vortx_auth_handoff=${authHandoffCookieValue(session)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=120`,
            'cache-control': 'no-store',
          },
        })
      }
      return Response.redirect(redirectUrl, 303)
    }

    if (!session.ok) {
      return json({
        ok: true,
        message: 'Customer account created. Log in with this email and password.',
        login_required: true,
      })
    }

    return json({
      ok: true,
      message: 'Customer account created. You are signed in.',
      access_token: session.access_token,
      refresh_token: session.refresh_token || null,
      user: session.user || null,
    })
  } catch (error) {
    if (htmlFlow) return signupRedirect(siteOrigin, `error=${encodeURIComponent(String(error.message || 'signup_failed').slice(0, 120))}`)
    return json({ ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onMe({ request, env }) {
  try {
    const { user, profile } = await requireSession(request, env)
    return json({ ok: true, user: { id: user.id, email: user.email }, profile })
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onCustomerDashboard({ request, env, ctx }) {
  try {
    const { profile } = await requireSession(request, env)
    requireSubscriber(profile)

    const tradingSelect =
      'legal_events?select=id,entity_id,source_id,event_type,title,summary,jurisdiction,filing_date,trade_date,amount,severity,confidence,created_at,updated_at'
    const [entitlements, hydratedWatchlists, events, form4Events, congressEvents, thirteenfEvents, sources, serviceRequests, previousDeskVisit, subscriptionStartedAt, alertSummary] =
      await Promise.all([
        supabaseRest(env, 'entitlements?select=plan,label,monthly_price,watchlist_limit,alert_limit&plan=eq.' + encodeURIComponent(profile.plan)).catch(() => []),
        supabaseRest(
          env,
          `entity_watchlists?select=*&user_id=eq.${encodeURIComponent(profile.user_id)}&order=created_at.desc&limit=50`,
        )
          .then((rows) => hydrateWatchlistMembers(env, supabaseRest, rows))
          .catch(() => []),
        supabaseRest(
          env,
          `${tradingSelect}&event_type=not.in.(form_4,congress_trade,institutional_13f)&order=filing_date.desc&limit=12&filing_date=gte.${cutoffDate()}`,
        ).catch(() => []),
        supabaseRest(
          env,
          `${tradingSelect}&event_type=eq.form_4&order=filing_date.desc&limit=40&filing_date=gte.${cutoffDate()}`,
        ).catch(() => []),
        supabaseRest(
          env,
          `${tradingSelect}&event_type=eq.congress_trade&order=filing_date.desc&limit=40&filing_date=gte.${cutoffDate()}`,
        ).catch(() => []),
        supabaseRest(
          env,
          `${tradingSelect}&event_type=eq.institutional_13f&order=filing_date.desc&limit=40&filing_date=gte.${cutoffDate()}`,
        ).catch(() => []),
        supabaseRest(
          env,
          'source_catalog?select=id,slug,name,record_type,enabled,source_url,notes,last_success_at,adapter_kind&enabled=eq.true',
        ).catch(() => []),
        supabaseRest(
          env,
          `service_requests?select=*&owner_email=eq.${encodeURIComponent(String(profile.email || '').toLowerCase())}&order=created_at.desc&limit=20`,
        ).catch(() => []),
        loadPreviousDeskVisit(env, supabaseRest, profile.email),
        loadSubscriptionStartedAt(env, supabaseRest, profile),
        loadAlertSummaryForUser(env, supabaseRest, profile.user_id, profile.plan),
      ])
    const watchlists = hydratedWatchlists
    const tradingEvents = [
      ...(Array.isArray(form4Events) ? form4Events : []),
      ...(Array.isArray(congressEvents) ? congressEvents : []),
      ...(Array.isArray(thirteenfEvents) ? thirteenfEvents : []),
    ]

    const capabilities = planCapabilities(profile.plan, profile.role)
    const locks = capabilityLocks(capabilities)
    const sourceById = new Map((sources || []).map((source) => [source.id, source]))
    const mergedEvents = [...(Array.isArray(tradingEvents) ? tradingEvents : []), ...(Array.isArray(events) ? events : [])]
    const eventRows = dedupeLiveFeedEvents(mergedEvents)
    const eventIds = eventRows.map((row) => row.id).filter(Boolean)
    const entityIds = [...new Set(eventRows.map((row) => row.entity_id).filter(Boolean))]
    const watchlistIndex = buildWatchlistIndex(hydratedWatchlists)

    const [evidenceByEventId, entityRows, scoreRows] = await Promise.all([
      loadEventEvidenceUrls(env, supabaseRest, eventIds),
      entityIds.length
        ? supabaseRest(
            env,
            `entities?select=id,canonical_name,ticker,cik&id=in.(${entityIds.map((id) => encodeURIComponent(id)).join(',')})`,
          ).catch(() => [])
        : Promise.resolve([]),
      entityIds.length
        ? supabaseRest(
            env,
            `friction_scores?select=entity_id,score,confidence&entity_id=in.(${entityIds.map((id) => encodeURIComponent(id)).join(',')})&order=computed_at.desc`,
          ).catch(() => [])
        : Promise.resolve([]),
    ])

    const entityById = new Map((entityRows || []).map((row) => [row.id, row]))
    const scoreByEntity = new Map()
    for (const row of scoreRows || []) {
      if (!scoreByEntity.has(row.entity_id)) scoreByEntity.set(row.entity_id, row)
    }

    const eventsByEntity = new Map()
    for (const event of eventRows) {
      const rows = eventsByEntity.get(event.entity_id) || []
      rows.push(event)
      eventsByEntity.set(event.entity_id, rows)
    }

    const showNames = capabilities.fullEntityNames || profile.role === 'admin'
    const showSources = capabilities.sourceUrls || profile.role === 'admin'

    const scoredFeed = eventRows.map((event) => {
      const source = sourceById.get(event.source_id)
      const noticeKind = noticeKindForEvent(event, source)
      const recordType = resolveRecordType(event, source)
      const entity = entityById.get(event.entity_id)
      const score = scoreByEntity.get(event.entity_id)
      const entityEvents = eventsByEntity.get(event.entity_id) || []
      const scored = scoreLiveFeedRow(event, entity, score, entityEvents)
      const evidenceUrl = resolveEventSourceUrl(
        attachFilingIdentifiers(event, { entity }),
        sourceById,
        evidenceByEventId,
      )
      const publicFiling = isPublicRecordFilingUrl(evidenceUrl) ? evidenceUrl : ''
      const entityName = showNames ? entity?.canonical_name || null : null
      const tickerFromEntity = showNames ? entity?.ticker || null : null
      const signalMeta = deriveTradingSignalMeta({
        ...event,
        entity_name: entityName,
        ticker: tickerFromEntity,
        signal_meta: {
          ticker_label: tickerFromEntity,
          filer_label: entityName,
        },
      })
      const row = {
        id: event.id,
        entity_id: event.entity_id,
        event_type: event.event_type,
        record_type: recordType,
        entity_name: entityName,
        title: showNames ? event.title : 'Public record signal',
        summary: showNames
          ? event.summary
          : 'Upgrade your plan to unlock entity-linked detail and evidence links.',
        jurisdiction: event.jurisdiction,
        filing_date: event.filing_date,
        trade_date: event.trade_date || null,
        amount: event.amount != null ? Number(event.amount) : null,
        severity: scored.severity,
        raw_severity: scored.raw_severity,
        confidence: event.confidence,
        friction_score: scored.friction_score,
        source_name: source?.name || null,
        source_url: showSources || publicFiling ? evidenceUrl || publicFiling || null : null,
        source_notes: source?.notes || null,
        source_last_success_at: source?.last_success_at || null,
        notice_kind: noticeKind,
        urgency: scored.urgency,
        recommended_action: customerActionHint(event, noticeKind, {
          recordType,
          displaySeverity: scored.severity,
        }),
        watchlist_note: watchlistMatchNote(event.entity_id, entityName, watchlistIndex),
        upgrade_hint: planUpgradeHint(capabilities, locks, {
          entity_name: entityName,
          source_url: showSources || publicFiling ? evidenceUrl || publicFiling || null : null,
        }),
        display_severity: scored.severity,
        created_at: event.created_at || null,
        detected_at: detectionTimestamp({
          ...event,
          created_at: event.created_at || null,
        }),
        signal_meta: signalMeta,
      }
      return row
    })

    const bySeverity = (a, b) => (Number(b.display_severity) || 0) - (Number(a.display_severity) || 0)
    // Keep Form 4 / Congress / 13F represented; severity-only slice was all 13F.
    const tradingFeedRaw = selectBalancedTradingFeed(
      scoredFeed.filter((row) => isTradingEventType(row.event_type)),
      40,
    )
    const tradingFeed = tradingFeedRaw
    const legacyFeed = scoredFeed.filter((row) => !isTradingEventType(row.event_type)).sort(bySeverity).slice(0, 10)
    const liveFeed = [...tradingFeed, ...legacyFeed].slice(0, 50)

    const activeSourceCount = Array.isArray(sources) ? sources.length : 0
    const visitSummary = buildVisitSummary(scoredFeed, previousDeskVisit, activeSourceCount)
    const sinceSubscribed = buildSinceSubscribedStat(scoredFeed, subscriptionStartedAt, watchlistIndex)
    const recentEvents = eventRows.length
    const maxSeverity = scoredFeed.length
      ? Math.max(...scoredFeed.map((row) => Number(row.display_severity) || 0))
      : 0
    const watchedEntityIds = new Set(watchlistIndex.keys())
    const watchedNewFilings = tradingFeed.filter((row) =>
      watchedEntityIds.has(String(row.entity_id || '').trim()),
    ).length

    const audit = auditQuery(env, profile, '/api/customer/dashboard')
    if (typeof ctx?.waitUntil === 'function') ctx.waitUntil(audit.catch(() => {}))
    else await audit.catch(() => {})

    return json({
      ok: true,
      profile,
      entitlement: entitlements?.[0] || entitlementForPlan(profile.plan),
      watchlists: hydratedWatchlists || [],
      capabilities,
      locks,
      live_feed: liveFeed,
      trading_feed: tradingFeed,
      legacy_feed: legacyFeed,
      service_requests: serviceRequests || [],
      visit_summary: visitSummary,
      since_subscribed: sinceSubscribed,
      alert_summary: {
        ...alertSummary,
        watched_new_filings: watchedNewFilings,
        names_watched: watchedEntityIds.size,
      },
      desk_state: {
        show_onboarding_expanded: !previousDeskVisit,
        is_returning: Boolean(previousDeskVisit),
      },
      service_summary: {
        recent_events: recentEvents,
        active_sources: activeSourceCount,
        max_severity: maxSeverity,
        trading_events: tradingFeed.length,
        legacy_events: legacyFeed.length,
      },
    })
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onAdminDashboard({ request, env }) {
  try {
    const { profile } = await requireSession(request, env)
    requireAdmin(profile)

    const [profiles, sources, audits, checkouts, serviceRequests, salesLeads] = await Promise.all([
      supabaseRest(
        env,
        'app_profiles?select=user_id,email,role,plan,subscription_status,updated_at,stripe_customer_id,stripe_subscription_id&order=updated_at.desc&limit=200',
      ),
      supabaseRest(env, 'source_catalog?select=*&order=jurisdiction.asc'),
      supabaseRest(env, 'query_audit_events?select=*&order=created_at.desc&limit=100'),
      supabaseRest(env, 'checkout_sessions?select=*&order=created_at.desc&limit=100'),
      supabaseRest(env, 'service_requests?select=*&order=created_at.desc&limit=100'),
      supabaseRest(env, 'sales_leads?select=*&order=created_at.desc&limit=100'),
    ])
    const ops = await opsSnapshot(env, { profiles, sources, checkouts, serviceRequests, salesLeads })

    await auditQuery(env, profile, '/api/admin/dashboard')

    return json({
      ok: true,
      ops,
      profiles: profiles || [],
      sources: sources || [],
      audits: audits || [],
      checkouts: checkouts || [],
      service_requests: serviceRequests || [],
      sales_leads: salesLeads || [],
    })
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onAdminUserPatch({ request, env }) {
  try {
    const { profile: admin } = await requireSession(request, env)
    requireAdmin(admin)

    let body
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }

    const userId = String(body.user_id || '').trim()
    const email = String(body.email || '').trim().toLowerCase().slice(0, 254)
    const plan = String(body.plan || '').trim()
    const subscriptionStatus = String(body.subscription_status || body.subscriptionStatus || '').trim()
    const role = String(body.role || '').trim()

    if (!userId && !email) {
      return json({ ok: false, error: 'missing_user', message: 'user_id or email is required.' }, { status: 400 })
    }
    if (plan && !PAID_PLANS.has(plan)) {
      return json({ ok: false, error: 'invalid_plan', message: 'Invalid plan.' }, { status: 400 })
    }
    if (subscriptionStatus && !SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
      return json({ ok: false, error: 'invalid_status', message: 'Invalid subscription status.' }, { status: 400 })
    }
    if (role && !CUSTOMER_ROLES.has(role)) {
      return json({ ok: false, error: 'invalid_role', message: 'Role must be customer or admin.' }, { status: 400 })
    }
    if (!plan && !subscriptionStatus && !role) {
      return json({ ok: false, error: 'missing_fields', message: 'Provide plan, subscription_status, and/or role.' }, { status: 400 })
    }

    const filter = userId
      ? `user_id=eq.${encodeURIComponent(userId)}`
      : `email=eq.${encodeURIComponent(email)}`
    const rows = await supabaseRest(env, `app_profiles?select=*&${filter}&limit=1`)
    const target = rows?.[0]
    if (!target) {
      return json({ ok: false, error: 'user_not_found', message: 'No profile found for that user.' }, { status: 404 })
    }

    const patch = { updated_at: new Date().toISOString() }
    if (plan) patch.plan = plan
    if (subscriptionStatus) patch.subscription_status = subscriptionStatus
    if (role) patch.role = role

    const updated = await supabaseRest(env, `app_profiles?${filter}`, {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(patch),
    })

    await auditQuery(env, admin, '/api/admin/users', {
      target_email: target.email,
      target_user_id: target.user_id,
      plan: patch.plan || target.plan,
      subscription_status: patch.subscription_status || target.subscription_status,
      role: patch.role || target.role,
    })

    return json({ ok: true, profile: updated?.[0] || { ...target, ...patch } })
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onAdminTests({ request, env }) {
  try {
    const { profile } = await requireSession(request, env)
    requireAdmin(profile)

    let body = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const tests = Array.isArray(body.tests) && body.tests.length
      ? body.tests.map((item) => String(item))
      : ['health', 'data_freshness', 'source_freshness', 'marketing_health', 'billing_config', 'public_signals', 'lead_capture_validation']

    const results = {}
    for (const test of tests) {
      try {
        if (test === 'health') {
          results[test] = {
            ok: hasSupabase(env) && Boolean(env.STRIPE_SECRET_KEY) && Boolean(env.PUBLIC_SITE_URL),
            supabase: hasSupabase(env),
            stripe_secret: Boolean(env.STRIPE_SECRET_KEY),
            public_site_url: Boolean(env.PUBLIC_SITE_URL),
          }
        } else if (test === 'data_freshness') {
          const rows = await supabaseRest(env, 'legal_events?select=id,event_type,filing_date,created_at,updated_at&order=filing_date.desc&limit=5')
          results[test] = {
            ok: rows.length > 0,
            latest_event_date: rows[0]?.filing_date || null,
            latest_event_age: ageLabel(rows[0]?.updated_at || rows[0]?.created_at || rows[0]?.filing_date),
            sample_size: rows.length,
          }
        } else if (test === 'source_freshness') {
          const rows = await supabaseRest(env, 'source_catalog?select=slug,name,enabled,terms_status,last_success_at,record_type&order=jurisdiction.asc')
          results[test] = {
            ok: rows.some((row) => row.enabled),
            enabled_sources: rows.filter((row) => row.enabled).length,
            total_sources: rows.length,
            stale_sources: rows
              .filter((row) => row.enabled && row.last_success_at && Date.now() - Date.parse(row.last_success_at) > 36 * 60 * 60 * 1000)
              .map((row) => row.slug),
          }
        } else if (test === 'marketing_health') {
          results[test] = await marketingHealth()
        } else if (test === 'billing_config') {
          results[test] = {
            ok: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_NEBULA_PRICE_ID && env.STRIPE_PULSAR_PRICE_ID && env.STRIPE_SUPERNOVA_PRICE_ID),
            stripe_secret: Boolean(env.STRIPE_SECRET_KEY),
            prices: {
              scout: Boolean(env.STRIPE_SCOUT_PRICE_ID),
              sentinel: Boolean(env.STRIPE_SENTINEL_PRICE_ID),
              nebula: Boolean(env.STRIPE_NEBULA_PRICE_ID),
              pulsar: Boolean(env.STRIPE_PULSAR_PRICE_ID),
              supernova: Boolean(env.STRIPE_SUPERNOVA_PRICE_ID),
              galactic: Boolean(env.STRIPE_GALACTIC_PRICE_ID),
              custom: Boolean(env.STRIPE_CUSTOM_PRICE_ID),
            },
          }
        } else if (test === 'public_signals') {
          const rows = await supabaseRest(
            env,
            `legal_events?select=id,entity_id,event_type,jurisdiction,filing_date,severity,confidence&order=filing_date.desc&limit=10&filing_date=gte.${cutoffDate()}`,
          )
          results[test] = {
            ok: rows.length > 0,
            sample_size: rows.length,
            first: rows[0] ? {
              event_type: rows[0].event_type,
              filing_date: rows[0].filing_date,
              jurisdiction: rows[0].jurisdiction,
              severity: rows[0].severity,
              confidence: rows[0].confidence,
            } : null,
          }
        } else if (test === 'lead_capture_validation') {
          results[test] = {
            ok: true,
            endpoint: '/api/request-access',
            method: 'POST',
            required_fields: ['email', 'name', 'message'],
            note: 'Validation-only test. Does not create a lead.',
          }
        } else {
          results[test] = { ok: false, error: 'unknown_test' }
        }
      } catch (error) {
        results[test] = { ok: false, error: error.message }
      }
    }

    await auditQuery(env, profile, '/api/admin/tests', { tests })
    return json({ ok: true, tests: results })
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onAdminSourcePatch({ request, env }) {
  try {
    const { profile } = await requireSession(request, env)
    requireAdmin(profile)

    let body
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }

    const slug = String(body.slug || '').trim()
    if (!slug) return json({ ok: false, error: 'missing_slug' }, { status: 400 })

    const patch = {
      enabled: Boolean(body.enabled),
      disabled_reason: body.disabled_reason ? String(body.disabled_reason) : null,
      updated_at: new Date().toISOString(),
    }

    const rows = await supabaseRest(env, `source_catalog?slug=eq.${encodeURIComponent(slug)}`, {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(patch),
    })

    return json({ ok: true, source: rows?.[0] || null })
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onCustomerServiceRequest({ request, env }) {
  try {
    const { user, profile } = await requireSession(request, env)
    requireSubscriber(profile)

    let body
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }

    const requestType = String(body.request_type || 'support').trim().slice(0, 64)
    const subject = String(body.subject || '').trim().slice(0, 200)
    const details = String(body.details || '').trim().slice(0, 4000)
    if (!subject || !details) {
      return json({ ok: false, error: 'missing_fields', message: 'Subject and details are required.' }, { status: 400 })
    }

    const rows = await supabaseRest(env, 'service_requests', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify([
        {
          owner_email: profile.email,
          request_type: requestType,
          subject,
          details,
          status: 'queued',
          priority: profile.plan === 'galactic' || profile.plan === 'custom' ? 'high' : 'normal',
        },
      ]),
    })

    return json({ ok: true, request: rows?.[0] || null })
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onAdminServiceRequestPatch({ request, env }) {
  try {
    const { profile } = await requireSession(request, env)
    requireAdmin(profile)

    let body
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }

    const id = String(body.id || '').trim()
    const status = String(body.status || '').trim()
    if (!id || !status) return json({ ok: false, error: 'missing_fields' }, { status: 400 })

    const allowed = new Set(['queued', 'in_review', 'delivered', 'closed'])
    if (!allowed.has(status)) return json({ ok: false, error: 'invalid_status' }, { status: 400 })

    const rows = await supabaseRest(env, `service_requests?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    })

    return json({ ok: true, request: rows?.[0] || null })
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onCustomerWatchlistStar({ request, env }) {
  try {
    const { profile } = await requireSession(request, env)
    requireSubscriber(profile)

    let body = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const entityId = String(body?.entity_id || '').trim()
    if (!entityId) {
      return json({ ok: false, error: 'entity_id_required', message: 'entity_id is required.' }, { status: 400 })
    }

    const entityRows = await supabaseRest(
      env,
      `entities?select=id,canonical_name,ticker&id=eq.${encodeURIComponent(entityId)}&limit=1`,
    ).catch(() => [])
    if (!entityRows?.[0]?.id) {
      return json({ ok: false, error: 'entity_not_found', message: 'Entity not found.' }, { status: 404 })
    }
    const entityRow = entityRows[0]

    const capabilities = planCapabilities(profile.plan, profile.role)
    const isAdmin = profile.role === 'admin'
    const unlimited = Boolean(capabilities.unlimitedWatchlists) || isAdmin

    const watchlists = await supabaseRest(
      env,
      `entity_watchlists?select=id,label,entity_ids,user_id,metadata&user_id=eq.${encodeURIComponent(profile.user_id)}&order=created_at.desc&limit=50`,
    ).catch(() => [])

    let deskList = (watchlists || []).find(
      (row) => String(row.label || '').trim().toLowerCase() === DESK_WATCHLIST_LABEL.toLowerCase(),
    )

    if (!deskList) {
      if (!unlimited) {
        const entitlementRow = await supabaseRest(
          env,
          `entitlements?select=watchlist_limit&plan=eq.${encodeURIComponent(profile.plan)}&limit=1`,
        ).catch(() => [])
        const override = entitlementForPlan(profile.plan)
        const limit =
          override?.watchlist_limit ??
          (entitlementRow?.[0]?.watchlist_limit == null ? null : Number(entitlementRow[0].watchlist_limit))
        if (limit != null && Number.isFinite(limit) && (watchlists || []).length >= limit) {
          return json(
            {
              ok: false,
              error: 'watchlist_limit',
              message: `Watchlist limit reached (${limit}). Upgrade or remove a list before starring on Desk.`,
            },
            { status: 403 },
          )
        }
      }

      const created = await supabaseRest(env, 'entity_watchlists', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify([
          {
            user_id: profile.user_id,
            label: DESK_WATCHLIST_LABEL,
            entity_ids: [],
            source: 'desk_star',
            metadata: { auto_created: true, desk: true },
          },
        ]),
      })
      deskList = created?.[0] || null
      if (!deskList?.id) {
        return json(
          { ok: false, error: 'watchlist_create_failed', message: 'Could not create Desk watchlist.' },
          { status: 500 },
        )
      }
    }

    const existingMembers = await supabaseRest(
      env,
      `entity_watchlist_members?select=watchlist_id,entity_id&watchlist_id=eq.${encodeURIComponent(deskList.id)}`,
    ).catch(() => [])
    const memberIds = new Set(
      (existingMembers || []).map((row) => String(row.entity_id || '').trim()).filter(Boolean),
    )
    const starred = memberIds.has(entityId)

    let linkedIssuer = null
    try {
      const { resolveLinkedIssuerEntity } = await import('../lib/watchlist-issuer-link.js')
      linkedIssuer = await resolveLinkedIssuerEntity(env, supabaseRest, entityId)
    } catch {
      linkedIssuer = null
    }
    const linkedIssuerId = String(linkedIssuer?.issuer_entity_id || '').trim()
    const meta = deskList.metadata && typeof deskList.metadata === 'object' ? { ...deskList.metadata } : {}
    const autoIssuers = meta.auto_linked_issuers && typeof meta.auto_linked_issuers === 'object'
      ? { ...meta.auto_linked_issuers }
      : {}

    if (starred) {
      await supabaseRest(
        env,
        `entity_watchlist_members?watchlist_id=eq.${encodeURIComponent(deskList.id)}&entity_id=eq.${encodeURIComponent(entityId)}`,
        { method: 'DELETE' },
      )
      memberIds.delete(entityId)
      const autoIssuerForFiler = String(autoIssuers[entityId] || '').trim()
      if (autoIssuerForFiler && memberIds.has(autoIssuerForFiler)) {
        await supabaseRest(
          env,
          `entity_watchlist_members?watchlist_id=eq.${encodeURIComponent(deskList.id)}&entity_id=eq.${encodeURIComponent(autoIssuerForFiler)}`,
          { method: 'DELETE' },
        ).catch(() => null)
        memberIds.delete(autoIssuerForFiler)
      }
      delete autoIssuers[entityId]
    } else {
      await supabaseRest(env, 'entity_watchlist_members', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ watchlist_id: deskList.id, entity_id: entityId }]),
      })
      memberIds.add(entityId)
      // Link issuer in metadata for alert matching without starring the company itself
      // (avoids noisy "other insider on same ticker" watchlist rows).
      if (linkedIssuerId && linkedIssuerId !== entityId) {
        autoIssuers[entityId] = linkedIssuerId
      }
    }

    const nextIds = [...memberIds]
    const nextMeta = { ...meta, auto_linked_issuers: autoIssuers, desk: true }
    await supabaseRest(env, `entity_watchlists?id=eq.${encodeURIComponent(deskList.id)}`, {
      method: 'PATCH',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ entity_ids: nextIds, metadata: nextMeta }),
    }).catch(() => null)

    await auditQuery(env, profile, '/api/customer/watchlist-star', {
      entity_id: entityId,
      starred: !starred,
      count: nextIds.length,
      linked_issuer: linkedIssuerId || null,
    })

    const ticker =
      String(linkedIssuer?.ticker || entityRow.ticker || '')
        .trim()
        .toUpperCase() || null
    const watchingMessage = !starred
      ? ticker
        ? `Watching ${entityRow.canonical_name || 'name'} (${ticker}). We email you when they or the issuer file again.`
        : 'Watching. We email you when this name files again.'
      : 'Removed from watchlist.'

    return json({
      ok: true,
      watchlist_id: deskList.id,
      entity_id: entityId,
      starred: !starred,
      member_entity_ids: nextIds,
      linked_issuer_entity_id: linkedIssuerId || null,
      ticker,
      watch_label: ticker
        ? `Watching ${entityRow.canonical_name || 'name'} (${ticker})`
        : null,
      message: watchingMessage,
    })
  } catch (error) {
    if (error.body) return json(error.body, { status: error.status || 500 })
    return json({ ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onCustomerExport({ request, env }) {
  try {
    const { profile } = await requireSession(request, env)
    requireSubscriber(profile)

    const capabilities = planCapabilities(profile.plan, profile.role)
    if (!capabilities.csvExport) {
      return json(
        {
          ok: false,
          error: 'plan_locked',
          message: 'CSV export requires Operator or higher.',
        },
        { status: 403 },
      )
    }

    const requestUrl = new URL(request.url)
    const format = String(requestUrl.searchParams.get('format') || 'csv').trim().toLowerCase()
    const wantJson = format === 'json'

    const [events, sources] = await Promise.all([
      supabaseRest(
        env,
        `legal_events?select=id,entity_id,source_id,event_type,title,summary,jurisdiction,filing_date,severity,confidence&order=filing_date.desc&limit=500&filing_date=gte.${cutoffDate()}`,
      ),
      supabaseRest(env, 'source_catalog?select=id,name,record_type,source_url'),
    ])
    const sourceById = new Map((sources || []).map((source) => [source.id, source]))
    const eventRows = dedupeLiveFeedEvents(events || [])
    const eventIds = eventRows.map((row) => row.id).filter(Boolean)
    const entityIds = [...new Set(eventRows.map((row) => row.entity_id).filter(Boolean))]

    const [evidenceByEventId, entityRows, scoreRows] = await Promise.all([
      loadEventEvidenceUrls(env, supabaseRest, eventIds),
      entityIds.length
        ? supabaseRest(
            env,
            `entities?select=id,canonical_name&id=in.(${entityIds.map((id) => encodeURIComponent(id)).join(',')})`,
          )
        : [],
      entityIds.length
        ? supabaseRest(
            env,
            `friction_scores?select=entity_id,score,confidence&entity_id=in.(${entityIds.map((id) => encodeURIComponent(id)).join(',')})&order=computed_at.desc`,
          )
        : [],
    ])

    const entityById = new Map((entityRows || []).map((row) => [row.id, row]))
    const scoreByEntity = new Map()
    for (const row of scoreRows || []) {
      if (!scoreByEntity.has(row.entity_id)) scoreByEntity.set(row.entity_id, row)
    }
    const eventsByEntity = new Map()
    for (const event of eventRows) {
      const rows = eventsByEntity.get(event.entity_id) || []
      rows.push(event)
      eventsByEntity.set(event.entity_id, rows)
    }

    const header = [
      'id',
      'entity_id',
      'entity_name',
      'event_type',
      'source_record_type',
      'source_name',
      'title',
      'summary',
      'jurisdiction',
      'filing_date',
      'severity',
      'confidence',
      'friction_score',
      'urgency',
      'recommended_action',
      'evidence_url',
      'source_catalog_url',
    ]
    const exportRows = []
    for (const row of eventRows) {
      const source = sourceById.get(row.source_id)
      const sourceRecordType = source?.record_type || ''
      const noticeKind = noticeKindForEvent(row, source)
      const recordType = resolveRecordType(row, source)
      const entity = entityById.get(row.entity_id)
      const evidenceUrl = resolveEventSourceUrl(
        attachFilingIdentifiers(row, { entity }),
        sourceById,
        evidenceByEventId,
      )
      const score = scoreByEntity.get(row.entity_id)
      const entityEvents = eventsByEntity.get(row.entity_id) || []
      const scored = scoreLiveFeedRow(row, entity, score, entityEvents)
      exportRows.push({
        id: row.id,
        entity_id: row.entity_id,
        entity_name: entity?.canonical_name || '',
        event_type: FINANCIAL_SOURCE_TYPES.has(sourceRecordType) ? sourceRecordType : row.event_type,
        source_record_type: sourceRecordType,
        source_name: source?.name || '',
        title: row.title || '',
        summary: row.summary || '',
        jurisdiction: row.jurisdiction || '',
        filing_date: row.filing_date || '',
        severity: scored.severity,
        confidence: row.confidence ?? '',
        friction_score: scored.friction_score,
        urgency: urgencyLabel(scored.severity),
        recommended_action: customerActionHint(row, noticeKind, {
          recordType,
          displaySeverity: scored.severity,
        }),
        evidence_url: evidenceUrl,
        source_catalog_url: source?.source_url || '',
      })
    }

    await auditQuery(env, profile, '/api/customer/export', {
      rows: exportRows.length,
      format: wantJson ? 'json' : 'csv',
    })

    if (wantJson) {
      return new Response(JSON.stringify({ ok: true, events: exportRows }, null, 2), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'content-disposition': 'attachment; filename="vortx-events.json"',
          'cache-control': 'no-store',
        },
      })
    }

    const lines = [header.join(',')]
    for (const exportRow of exportRows) {
      lines.push(
        header
          .map((key) => {
            const value = exportRow[key] == null ? '' : String(exportRow[key])
            return `"${value.replace(/"/g, '""')}"`
          })
          .join(','),
      )
    }

    return new Response(lines.join('\n'), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="vortx-events.csv"',
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    if (error.body) return json(error.body, { status: error.status || 500 })
    return json({ ok: false, error: error.message }, { status: error.status || 500 })
  }
}

export async function onAdminStreamPulse({ request, env }) {
  try {
    const { profile } = await requireSession(request, env)
    requireAdmin(profile)

    if (!hasSupabase(env)) {
      return json({ ok: false, error: 'supabase_unconfigured' }, { status: 503 })
    }

    const { buildAdminStreamPulse } = await import('./admin-stream-pulse-data.js')
    const payload = await buildAdminStreamPulse(env)
    await auditQuery(env, profile, '/api/admin/stream-pulse')

    return json(
      { ok: true, ...payload },
      {
        headers: {
          'cache-control': 'private, no-store',
        },
      },
    )
  } catch (error) {
    return json(error.body || { ok: false, error: error.message }, { status: error.status || 500 })
  }
}
