/**
 * Weekly digest post to reddit.com/r/VortxUnredacted (1x per week, Mon 15:17 UTC).
 *
 * Uses a Reddit "script" app with the password grant:
 *   REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET (app credentials)
 *   REDDIT_USERNAME / REDDIT_PASSWORD (posting account; account must be able to post in the sub)
 * Toggles:
 *   REDDIT_BOT_ENABLED=true, REDDIT_BOT_DRY_RUN=false, REDDIT_SUBREDDIT=VortxUnredacted
 */

import { filterHighlyRecognized, isHighlyRecognizedBrand, recognitionBoost } from './brand-recognition.js'

// Runs on Mondays via the single daily 14:17 UTC trigger (see activeCronsForDate).
export const REDDIT_CRON = '17 14 * * 1'
const DEFAULT_SUBREDDIT = 'VortxUnredacted'
const DISCLAIMER =
  'Records are allegations or administrative artifacts, not judgments. Research and business intelligence only; not legal, financial, credit, or trading advice.'

export function resolveRedditCron(cronExpression) {
  return String(cronExpression || '').trim() === REDDIT_CRON
}

function redditUserAgent(env) {
  const username = String(env.REDDIT_USERNAME || 'vortx').trim()
  return String(env.REDDIT_USER_AGENT || `web:vortx-marketing-bot:v1.0 (by /u/${username})`)
}

function hasRedditCredentials(env) {
  return Boolean(
    String(env.REDDIT_CLIENT_ID || '').trim() &&
      String(env.REDDIT_CLIENT_SECRET || '').trim() &&
      String(env.REDDIT_USERNAME || '').trim() &&
      String(env.REDDIT_PASSWORD || '').trim(),
  )
}

async function redditAccessToken(env) {
  const basic = btoa(`${String(env.REDDIT_CLIENT_ID).trim()}:${String(env.REDDIT_CLIENT_SECRET).trim()}`)
  const body = new URLSearchParams({
    grant_type: 'password',
    username: String(env.REDDIT_USERNAME).trim(),
    password: String(env.REDDIT_PASSWORD),
  })
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': redditUserAgent(env),
    },
    body,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `Reddit auth failed (${response.status})`)
  }
  return payload.access_token
}

async function submitSelfPost(env, { subreddit, title, text }) {
  const token = await redditAccessToken(env)
  const body = new URLSearchParams({
    sr: subreddit,
    kind: 'self',
    title: title.slice(0, 300),
    text,
    api_type: 'json',
    resubmit: 'true',
    sendreplies: 'false',
  })
  const response = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': redditUserAgent(env),
    },
    body,
  })
  const payload = await response.json().catch(() => ({}))
  const errors = payload?.json?.errors || []
  if (!response.ok || errors.length) {
    const message = errors.map((row) => row.join(': ')).join('; ') || `Reddit submit failed (${response.status})`
    throw new Error(message)
  }
  return payload?.json?.data?.url || null
}

function weekLabel(date = new Date()) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function digestCandidates(stats, limit = 5) {
  const pool = filterHighlyRecognized([...(stats.signalCandidates || [])])
  pool.sort((a, b) => {
    const boostDiff = recognitionBoost(b) - recognitionBoost(a)
    if (boostDiff) return boostDiff
    const scoreDiff = Number(b.score || 0) - Number(a.score || 0)
    if (scoreDiff) return scoreDiff
    return String(b.filingDate || '').localeCompare(String(a.filingDate || ''))
  })

  // One entry per company; multi-state filings collapse into a jurisdiction list.
  const byName = new Map()
  for (const lead of pool) {
    const key = String(lead.name || '').toLowerCase()
    if (!key) continue
    const existing = byName.get(key)
    if (!existing) {
      byName.set(key, { ...lead, jurisdictions: [lead.jurisdiction].filter(Boolean) })
      continue
    }
    if (lead.jurisdiction && !existing.jurisdictions.includes(lead.jurisdiction)) {
      existing.jurisdictions.push(lead.jurisdiction)
    }
    existing.score = Math.max(Number(existing.score || 0), Number(lead.score || 0))
  }
  return [...byName.values()].slice(0, limit)
}

export function buildRedditWeeklyPost(stats, siteUrl) {
  const site = String(siteUrl || 'https://vortxmkt.com').replace(/\/$/, '')
  const leads = digestCandidates(stats)
  const recognized = leads.filter(isHighlyRecognizedBrand)
  const headliner = recognized[0] || leads[0] || null

  const title = headliner
    ? `Public-record friction watch (week of ${weekLabel()}): ${headliner.name} ${String(headliner.recordType || 'public record').toLowerCase()} + ${Math.max(leads.length - 1, 0)} more signals`
    : `Public-record friction watch: week of ${weekLabel()}`

  const lines = [
    `**What moved in the public-record queue this week.** Subscribers saw these before the headlines.`,
    '',
  ]

  for (const lead of leads) {
    const score = Number(lead.score || 0)
    const places = (lead.jurisdictions || [lead.jurisdiction]).filter(Boolean)
    const placeLabel =
      places.length > 2
        ? `${places.slice(0, 2).join(', ')} +${places.length - 2} more`
        : places.join(', ') || 'multi-jurisdiction'
    lines.push(
      `- **${lead.name}** · ${String(lead.recordType || 'public record')} · ${placeLabel} · filed ${lead.filingDate || 'recent'} · friction ${score > 0 ? `${score}/100` : 'queued'}`,
    )
  }

  if (!leads.length) {
    lines.push('- Quiet week on the public queue; watchlists keep monitoring either way.')
  }

  lines.push(
    '',
    `Every item above is a public filing (WARN notice, bankruptcy docket, lien, or court record). Source documents, timelines, and watchlist alerts: ${site}`,
    '',
    `*${DISCLAIMER}*`,
  )

  return { title, text: lines.join('\n') }
}

/**
 * Run the weekly Reddit digest. deps injected from x-marketing-cron
 * (bool, fetchJson, campaignStats, fetchTemplateData, defaultSite).
 */
export async function runRedditWeekly(env, deps, options = {}) {
  const enabled = deps.bool(env.REDDIT_BOT_ENABLED, false) || options.force
  if (!enabled) {
    return { ok: true, skipped: true, reason: 'REDDIT_BOT_ENABLED is not true.' }
  }

  const dryRun = (deps.bool(env.REDDIT_BOT_DRY_RUN, true) && !options.forcePost) || Boolean(options.dryRun)
  if (!dryRun && !hasRedditCredentials(env)) {
    return {
      ok: false,
      skipped: true,
      reason: 'Missing Reddit credentials (REDDIT_CLIENT_ID/SECRET, REDDIT_USERNAME/PASSWORD).',
    }
  }

  const site = String(env.PUBLIC_SITE_URL || deps.defaultSite).replace(/\/$/, '')
  const [feed, sources] = await Promise.all([
    deps.fetchJson(`${site}/api/friction-feed`),
    deps.fetchJson(`${site}/api/source-transparency`),
  ])
  const templateData = await deps.fetchTemplateData(env, feed)
  const stats = { ...deps.campaignStats(feed, sources), ...templateData }

  const subreddit = String(env.REDDIT_SUBREDDIT || DEFAULT_SUBREDDIT).trim()
  const post = buildRedditWeeklyPost(stats, site)

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      subreddit,
      reddit_title: post.title,
      reddit_text: post.text,
      reddit_status: 'dry_run',
    }
  }

  try {
    const url = await submitSelfPost(env, { subreddit, title: post.title, text: post.text })
    return {
      ok: true,
      dry_run: false,
      subreddit,
      reddit_title: post.title,
      reddit_status: 'posted',
      reddit_url: url,
    }
  } catch (error) {
    return {
      ok: false,
      dry_run: false,
      subreddit,
      reddit_title: post.title,
      reddit_status: `failed: ${error.message}`,
    }
  }
}
