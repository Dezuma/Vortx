/**
 * Cross-platform reach for Vortx (Substack/Facebook story) and ByBizu
 * (YouTube/Kick/Twitch announcements). Announcements only — no scrape,
 * auto-DM, or comment spam.
 */

import { postDiscordWebhook } from './discord-signal-template.js'
import {
  isRecentlyPosted,
  loadMarketingPostHistory,
  marketingDedupDays,
  marketingDedupKey,
  recordMarketingPost,
} from './marketing-dedup.js'
import {
  buildSpotlightSubstackPost,
  draftSpotlightToSubstack,
  substackConfigured,
} from '../frontend/functions/lib/substack-publish.js'

const DEFAULT_SITE = 'https://vortxmkt.com'
const FACEBOOK_GRAPH = 'https://graph.facebook.com/v21.0'
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const TWITCH_STREAMS_URL = 'https://api.twitch.tv/helix/streams'
const LOGIN_RE = /^[A-Za-z0-9_]{2,25}$/
const PAGE_ID_RE = /^[A-Za-z0-9._-]{1,64}$/

const ALLOWED_ANNOUNCE_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'www.twitch.tv',
  'twitch.tv',
  'kick.com',
  'www.kick.com',
  'www.facebook.com',
  'facebook.com',
  'm.facebook.com',
  'www.tiktok.com',
  'tiktok.com',
  'vortxmkt.com',
  'www.vortxmkt.com',
  'vortxmkt.substack.com',
  'substack.com',
])

export function bool(value, fallback = false) {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

export function sanitizeAnnounceUrl(raw) {
  const text = String(raw || '').trim()
  if (!text) return null
  let parsed
  try {
    parsed = new URL(text)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:') return null
  if (!ALLOWED_ANNOUNCE_HOSTS.has(parsed.hostname.toLowerCase())) return null
  parsed.hash = ''
  return parsed.toString()
}

export function isDiscordWebhookUrl(raw) {
  try {
    const parsed = new URL(String(raw || '').trim())
    const host = parsed.hostname.toLowerCase()
    if (host !== 'discord.com' && host !== 'discordapp.com') return false
    return parsed.protocol === 'https:' && parsed.pathname.startsWith('/api/webhooks/')
  } catch {
    return false
  }
}

export function normalizeLogin(raw, fallback = '') {
  const text = String(raw || fallback || '').trim().replace(/^@/, '')
  return LOGIN_RE.test(text) ? text : ''
}

function sanitizeTitle(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 160)
}

function todayUtcDate(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function mondayUtcDate(date = new Date()) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = copy.getUTCDay()
  const shift = day === 0 ? -6 : 1 - day
  copy.setUTCDate(copy.getUTCDate() + shift)
  return copy.toISOString().slice(0, 10)
}

export function brandLinks(env) {
  return {
    youtube: sanitizeAnnounceUrl(env.BYBIZU_YOUTUBE_URL) || 'https://www.youtube.com/@ByBizu',
    tiktok: sanitizeAnnounceUrl(env.BYBIZU_TIKTOK_URL) || 'https://www.tiktok.com/@bybizu',
    kick: sanitizeAnnounceUrl(env.BYBIZU_KICK_URL) || 'https://kick.com/bybizu',
    twitch: sanitizeAnnounceUrl(env.BYBIZU_TWITCH_URL) || 'https://www.twitch.tv/bybizu_',
    facebook: sanitizeAnnounceUrl(env.FEMALESPACE_FACEBOOK_URL) || 'https://www.facebook.com/FemaleSpace1',
    site: String(env.PUBLIC_SITE_URL || DEFAULT_SITE).replace(/\/$/, ''),
    cta: String(env.MARKETING_CTA_URL || `${DEFAULT_SITE}/?view=pricing`),
  }
}

export function buildAnnouncementCopy(payload, env = {}) {
  const links = brandLinks(env)
  const kind = String(payload?.kind || 'youtube').toLowerCase()
  const platform = String(payload?.platform || kind).toLowerCase()
  const title = sanitizeTitle(payload?.title) || 'New ByBizu drop'
  const url = sanitizeAnnounceUrl(payload?.url) || links.youtube

  if (kind === 'live' || platform === 'kick' || platform === 'twitch') {
    const label = platform === 'twitch' ? 'Twitch' : platform === 'kick' ? 'Kick' : 'live'
    const text = [
      `ByBizu is live on ${label}.`,
      url,
      'Watch the stream. Full story lands on YouTube.',
    ].join('\n')
    return { kind: 'live', platform, title, url, text: text.slice(0, 270) }
  }

  if (kind === 'vod') {
    const text = [`ByBizu VOD: ${title}`, url, 'Catch the replay. Full story on YouTube.'].join('\n')
    return { kind: 'vod', platform, title, url, text: text.slice(0, 270) }
  }

  const text = [`New on YouTube — ${title}`, url, 'Full story on YT. Not financial advice.'].join('\n')
  return { kind: 'youtube', platform: 'youtube', title, url, text: text.slice(0, 270) }
}

export function buildGoingLiveCopy(env = {}, { platform = 'kick' } = {}) {
  return buildAnnouncementCopy({ kind: 'live', platform, url: brandLinks(env)[platform] }, env)
}

export function buildFacebookWeeklyStory(spotlight, env = {}) {
  const brand = String(env.FACEBOOK_WEEKLY_BRAND || 'bybizu').toLowerCase()
  const links = brandLinks(env)
  if (brand === 'vortx') {
    const name = sanitizeTitle(spotlight?.name) || 'this week’s public record'
    const text = [
      `Public record on the desk this week: ${name}.`,
      'Type, date, and score are free. Source trail stays locked.',
      links.cta,
      'Research only. Not legal or financial advice.',
    ].join('\n')
    return { brand: 'vortx', message: text.slice(0, 2000), link: links.cta }
  }
  const text = [
    'New from ByBizu this week — full story on YouTube.',
    links.youtube,
    'Watch, then come back for the next live.',
  ].join('\n')
  return { brand: 'bybizu', message: text.slice(0, 2000), link: links.youtube }
}

function announcementWebhook(env) {
  const url = String(
    env.DISCORD_ANNOUNCEMENTS_WEBHOOK_URL || env.DISCORD_WELCOME_WEBHOOK_URL || '',
  ).trim()
  return isDiscordWebhookUrl(url) ? url : ''
}

function facebookConfigured(env) {
  const token = String(env.FACEBOOK_PAGE_ACCESS_TOKEN || '').trim()
  const pageId = String(env.FACEBOOK_PAGE_ID || '').trim()
  return Boolean(token && PAGE_ID_RE.test(pageId))
}

export function reachHealth(env) {
  return {
    substack_draft: bool(env.SUBSTACK_MARKETING_DRAFT, true),
    has_substack_sid: substackConfigured(env),
    announce_enabled: bool(env.ANNOUNCE_ENABLED, true),
    has_announce_webhook: Boolean(announcementWebhook(env)),
    live_alerts: bool(env.LIVE_ALERTS_ENABLED, true),
    twitch_login: normalizeLogin(env.TWITCH_LOGIN, 'bybizu_'),
    kick_login: normalizeLogin(env.KICK_LOGIN, 'bybizu'),
    has_twitch_app: Boolean(
      String(env.TWITCH_CLIENT_ID || '').trim() && String(env.TWITCH_CLIENT_SECRET || '').trim(),
    ),
    facebook_weekly: bool(env.FACEBOOK_WEEKLY_ENABLED, true),
    has_facebook_page: facebookConfigured(env),
  }
}

function syntheticLead(entityId, eventType, filingDate, name) {
  return {
    entity_id: entityId,
    event_type: eventType,
    filing_date: filingDate,
    name,
  }
}

export async function postFacebookPage(env, { message, link }, { dryRun = false } = {}) {
  if (!facebookConfigured(env)) {
    return { ok: true, skipped: true, reason: 'FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN missing' }
  }
  const pageId = String(env.FACEBOOK_PAGE_ID || '').trim()
  const text = String(message || '').trim().slice(0, 2000)
  if (!text) return { ok: false, error: 'empty_facebook_message' }
  const safeLink = sanitizeAnnounceUrl(link)
  if (dryRun) {
    return { ok: true, dry_run: true, page_id: pageId, message: text, link: safeLink }
  }
  const body = new URLSearchParams()
  body.set('message', text)
  body.set('access_token', String(env.FACEBOOK_PAGE_ACCESS_TOKEN))
  if (safeLink) body.set('link', safeLink)
  const response = await fetch(`${FACEBOOK_GRAPH}/${encodeURIComponent(pageId)}/feed`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = payload?.error?.message || `facebook_${response.status}`
    return { ok: false, error: String(detail).slice(0, 180) }
  }
  return { ok: true, post_id: payload?.id || null }
}

export async function postAnnouncement(env, payload, deps = {}) {
  const dryRun = deps.dryRun ?? bool(env.MARKETING_BOT_DRY_RUN, true)
  if (!bool(env.ANNOUNCE_ENABLED, true) && !deps.force) {
    return { ok: true, skipped: true, reason: 'ANNOUNCE_ENABLED is not true.' }
  }
  const copy = buildAnnouncementCopy(payload, env)
  const results = { ok: true, copy, discord: null, x: null, facebook: null }

  const webhook = announcementWebhook(env)
  if (webhook) {
    if (dryRun) {
      results.discord = { ok: true, dry_run: true }
    } else {
      try {
        results.discord = await (deps.postDiscordWebhook || postDiscordWebhook)(webhook, copy.text)
      } catch (error) {
        results.discord = { ok: false, error: error.message }
        results.ok = false
      }
    }
  } else {
    results.discord = { ok: false, skipped: true, reason: 'no_announcements_webhook' }
  }

  if (typeof deps.postTweet === 'function') {
    if (dryRun) {
      results.x = { ok: true, dry_run: true }
    } else {
      try {
        const tweet = await deps.postTweet(env, copy.text, null)
        results.x = { ok: true, tweet_id: tweet?.data?.id || null }
      } catch (error) {
        results.x = { ok: false, error: error.message }
        results.ok = false
      }
    }
  } else {
    results.x = { ok: false, skipped: true, reason: 'no_tweet_poster' }
  }

  if (facebookConfigured(env)) {
    results.facebook = await postFacebookPage(
      env,
      { message: copy.text, link: copy.url },
      { dryRun },
    )
    if (!results.facebook.ok && !results.facebook.skipped) results.ok = false
  } else {
    results.facebook = { ok: true, skipped: true, reason: 'facebook_not_configured' }
  }

  return results
}

export async function draftMarketingSubstack(env, spotlight, options = {}) {
  if (!bool(env.SUBSTACK_MARKETING_DRAFT, true) && !options.force) {
    return { ok: true, skipped: true, reason: 'SUBSTACK_MARKETING_DRAFT is not true.' }
  }
  if (!spotlight?.name) {
    return { ok: true, skipped: true, reason: 'no_spotlight' }
  }
  const dryRun = options.dryRun ?? bool(env.MARKETING_BOT_DRY_RUN, true)
  if (!dryRun) {
    const history = options.history || (await loadMarketingPostHistory(env))
    const lead = syntheticLead(
      spotlight.entity_id || `substack:${String(spotlight.name).slice(0, 40)}`,
      'substack_draft',
      String(spotlight.filing_date || spotlight.filingDate || todayUtcDate()),
      spotlight.name,
    )
    if (isRecentlyPosted(marketingDedupKey(lead), history, marketingDedupDays(env))) {
      return { ok: true, skipped: true, reason: 'recently_drafted' }
    }
    const result = await draftSpotlightToSubstack(env, spotlight, {
      siteUrl: options.siteUrl || String(env.PUBLIC_SITE_URL || DEFAULT_SITE),
      ctaUrl: env.MARKETING_CTA_URL,
      dryRun: false,
      publish: false,
    })
    if (result.drafted) {
      await recordMarketingPost(env, lead, 'substack-draft', { dryRun: false, history })
    }
    return { ok: Boolean(result.drafted || result.posted), ...result }
  }
  return {
    ok: true,
    dry_run: true,
    ...draftSpotlightPreview(spotlight, env, options),
  }
}

function draftSpotlightPreview(spotlight, env, options = {}) {
  const post = buildSpotlightSubstackPost(spotlight, {
    siteUrl: options.siteUrl || String(env.PUBLIC_SITE_URL || DEFAULT_SITE),
    ctaUrl: env.MARKETING_CTA_URL,
  })
  return { drafted: false, posted: false, reason: 'dry_run', post }
}

export async function runFacebookWeekly(env, spotlight, { dryRun, date = new Date(), force = false } = {}) {
  if (!bool(env.FACEBOOK_WEEKLY_ENABLED, true) && !force) {
    return { ok: true, skipped: true, reason: 'FACEBOOK_WEEKLY_ENABLED is not true.' }
  }
  if (!force && date.getUTCDay() !== 1) {
    return { ok: true, skipped: true, reason: 'not_monday_utc' }
  }
  const story = buildFacebookWeeklyStory(spotlight, env)
  const lead = syntheticLead('facebook:femalespace1', 'weekly_story', mondayUtcDate(date), 'FemaleSpace1')
  const history = await loadMarketingPostHistory(env)
  if (isRecentlyPosted(marketingDedupKey(lead), history, marketingDedupDays(env))) {
    return { ok: true, skipped: true, reason: 'already_posted_this_week' }
  }
  const posted = await postFacebookPage(env, story, { dryRun })
  if (posted.ok && !dryRun && !posted.dry_run) {
    await recordMarketingPost(env, lead, 'facebook-weekly', { dryRun: false, history })
  }
  return { ok: posted.ok, story, ...posted }
}

async function twitchAppToken(env) {
  const clientId = String(env.TWITCH_CLIENT_ID || '').trim()
  const clientSecret = String(env.TWITCH_CLIENT_SECRET || '').trim()
  if (!clientId || !clientSecret) return null
  const url = `${TWITCH_TOKEN_URL}?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`
  const response = await fetch(url, { method: 'POST' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.access_token) return null
  return { token: payload.access_token, clientId }
}

export async function checkTwitchLive(env, login, { fetchImpl = fetch } = {}) {
  const user = normalizeLogin(login, env.TWITCH_LOGIN || 'bybizu_')
  if (!user) return { platform: 'twitch', live: false, reason: 'invalid_login' }
  const auth = await twitchAppToken(env)
  if (!auth) return { platform: 'twitch', live: false, skipped: true, reason: 'twitch_app_not_configured' }
  const response = await fetchImpl(`${TWITCH_STREAMS_URL}?user_login=${encodeURIComponent(user)}`, {
    headers: {
      'client-id': auth.clientId,
      authorization: `Bearer ${auth.token}`,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { platform: 'twitch', live: false, error: `twitch_${response.status}` }
  }
  const stream = payload?.data?.[0]
  if (!stream) return { platform: 'twitch', live: false, login: user }
  return {
    platform: 'twitch',
    live: true,
    login: user,
    stream_id: String(stream.id || ''),
    title: sanitizeTitle(stream.title) || 'ByBizu live',
    url: `https://www.twitch.tv/${user}`,
  }
}

export async function checkKickLive(login, { fetchImpl = fetch } = {}) {
  const user = normalizeLogin(login, 'bybizu')
  if (!user) return { platform: 'kick', live: false, reason: 'invalid_login' }
  const response = await fetchImpl(`https://kick.com/api/v2/channels/${encodeURIComponent(user)}`, {
    headers: { accept: 'application/json', 'user-agent': 'VortxReach/1.0 (+https://vortxmkt.com)' },
  })
  if (response.status === 404) return { platform: 'kick', live: false, login: user }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { platform: 'kick', live: false, error: `kick_${response.status}` }
  }
  const stream = payload?.livestream
  if (!stream) return { platform: 'kick', live: false, login: user }
  return {
    platform: 'kick',
    live: true,
    login: user,
    stream_id: String(stream.id || stream.session_title || todayUtcDate()),
    title: sanitizeTitle(stream.session_title || stream.title) || 'ByBizu live',
    url: `https://kick.com/${user}`,
  }
}

export async function runLiveAlerts(env, deps = {}) {
  const dryRun = deps.dryRun ?? bool(env.MARKETING_BOT_DRY_RUN, true)
  if (!bool(env.LIVE_ALERTS_ENABLED, true) && !deps.force) {
    return { ok: true, skipped: true, reason: 'LIVE_ALERTS_ENABLED is not true.' }
  }
  const history = await loadMarketingPostHistory(env)
  const days = marketingDedupDays(env)
  const checks = []
  try {
    checks.push(
      await checkKickLive(env.KICK_LOGIN || 'bybizu', { fetchImpl: deps.fetchImpl }),
    )
  } catch (error) {
    checks.push({ platform: 'kick', live: false, error: error.message })
  }
  try {
    checks.push(
      await checkTwitchLive(env, env.TWITCH_LOGIN || 'bybizu_', { fetchImpl: deps.fetchImpl }),
    )
  } catch (error) {
    checks.push({ platform: 'twitch', live: false, error: error.message })
  }

  const alerts = []
  for (const check of checks) {
    if (!check.live) {
      alerts.push({ ...check, posted: false })
      continue
    }
    const lead = syntheticLead(
      `live:${check.platform}:${check.login}`,
      'going_live',
      String(check.stream_id || todayUtcDate()),
      `ByBizu ${check.platform}`,
    )
    if (isRecentlyPosted(marketingDedupKey(lead), history, days)) {
      alerts.push({ ...check, posted: false, skipped: true, reason: 'already_alerted' })
      continue
    }
    const posted = await postAnnouncement(
      env,
      { kind: 'live', platform: check.platform, title: check.title, url: check.url },
      { ...deps, dryRun },
    )
    if (posted.ok && !dryRun) {
      await recordMarketingPost(env, lead, `live-${check.platform}`, { dryRun: false, history })
    }
    alerts.push({ ...check, posted: posted.ok, announce: posted })
  }

  return { ok: true, dry_run: dryRun, alerts }
}

export async function runDailyReach(env, options = {}) {
  const dryRun = options.dryRun ?? bool(env.MARKETING_BOT_DRY_RUN, true)
  const date = options.date || new Date()
  const spotlight = options.spotlight || null
  const deps = { postTweet: options.postTweet, dryRun }

  const substack = spotlight
    ? await draftMarketingSubstack(env, spotlight, { dryRun, siteUrl: options.siteUrl })
    : { ok: true, skipped: true, reason: 'no_spotlight' }

  let facebook = { ok: true, skipped: true, reason: 'not_monday_utc' }
  if (date.getUTCDay() === 1) {
    facebook = await runFacebookWeekly(env, spotlight, { dryRun, date })
  }

  const live = await runLiveAlerts(env, deps)

  return { ok: Boolean(substack.ok && facebook.ok && live.ok), dry_run: dryRun, substack, facebook, live }
}
