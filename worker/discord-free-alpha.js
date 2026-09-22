/**
 * VORTX FREE INTELLIGENCE Discord channels: segmented free-tier signal drops.
 * - #alpha-feed: material trades (dollar / cluster-buy) plus moderate fallback
 * - #mass-layoffs: WARN notices as they hit (no brand gate)
 * - #congress-and-insiders: material Form 4 / STOCK Act trades only
 * - #market-chatter: weekly mixed public-record chatter
 */

import {
  formatDiscordReliefDrop,
  discordSignalState,
  discordSignalType,
  postDiscordWebhook,
  postDiscordWebhookWithImage,
} from './discord-signal-template.js'
import { buildPlaybookTweet, filingMetaLine, plainLanguageStake, supportLine } from './social-playbook.js'
import { filterHighlyRecognized, isHighlyRecognizedBrand, recognitionBoost } from './brand-recognition.js'
import {
  filterByMarketingDedup,
  isNodeRuntime,
  marketingDedupDays,
  recordMarketingPost,
} from './marketing-dedup.js'
import { isMaterialDiscordTrade } from '../frontend/functions/lib/discord-trade-materiality.js'

export const FREE_ALPHA_CATEGORY = 'VORTX FREE INTELLIGENCE'

/** @typedef {'alpha-feed' | 'mass-layoffs' | 'congress-and-insiders' | 'market-chatter'} FreeAlphaChannelId */

/** @type {Record<FreeAlphaChannelId, object>} */
export const FREE_ALPHA_CHANNELS = {
  'alpha-feed': {
    id: 'alpha-feed',
    label: 'Alpha Feed',
    hashtag: '#alpha-feed',
    crons: ['17 14 * * *'],
    format: 'hero-card',
    cardTheme: 'alpha',
    framing: 'relief',
    webhookEnv: 'DISCORD_ALPHA_FEED_WEBHOOK_URL',
    legacyWebhookEnv: 'DISCORD_WEBHOOK_URL',
    maxSeverityExclusive: 80,
  },
  'mass-layoffs': {
    id: 'mass-layoffs',
    label: 'Mass Layoffs',
    hashtag: '#mass-layoffs #WARN',
    crons: ['17 14 * * 2,5'],
    format: 'hero-card',
    cardTheme: 'workforce',
    framing: 'relief-headline',
    eventMatch: (signal) => /warn/.test(String(signal?.event_type || signal?.recordType || '')),
    webhookEnv: 'DISCORD_MASS_LAYOFFS_WEBHOOK_URL',
  },
  'congress-and-insiders': {
    id: 'congress-and-insiders',
    label: 'Congress and Insiders',
    hashtag: '#congress-and-insiders #Form4 #STOCKAct',
    crons: ['17 14 * * 3,6'],
    format: 'hero-card',
    cardTheme: 'alpha',
    framing: 'relief-headline',
    eventMatch: (signal) => isTradingAlphaSignal(signal),
    webhookEnv: 'DISCORD_CONGRESS_INSIDERS_WEBHOOK_URL',
  },
  'market-chatter': {
    id: 'market-chatter',
    label: 'Market Chatter',
    hashtag: '#market-chatter',
    crons: ['17 14 * * 4'],
    format: 'hero-card',
    cardTheme: 'alpha',
    framing: 'relief',
    webhookEnv: 'DISCORD_MARKET_CHATTER_WEBHOOK_URL',
  },
}

const RELIEF_HEADLINE = 'Subscribers saw this before the headline.'

export function signalScoreValue(signal) {
  if (!signal) return 0
  const score = Number(signal.score)
  const severity = Number(signal.severity)
  if (Number.isFinite(score) && score > 0) return Math.round(Math.min(100, score))
  if (Number.isFinite(severity) && severity > 0) return Math.round(Math.min(100, severity))
  return 0
}

export function isTradingAlphaSignal(signal) {
  const eventType = String(signal?.event_type || signal?.recordType || '').toLowerCase()
  return /form_4|congress_trade|institutional_13f|insider|stock.?act|13f/.test(eventType)
}

export function isModerateOrLowerSeverity(signal, maxExclusive = 80) {
  const score = signalScoreValue(signal)
  return score > 0 && score < maxExclusive
}

export function resolveFreeAlphaChannelFromCron(cronExpression) {
  const cron = String(cronExpression || '').trim()
  for (const channel of Object.values(FREE_ALPHA_CHANNELS)) {
    if (channel.crons.includes(cron)) return channel.id
  }
  return null
}

export function listFreeAlphaChannelIds() {
  return Object.keys(FREE_ALPHA_CHANNELS)
}

function channelWebhook(env, channel) {
  const primary = String(env[channel.webhookEnv] || '').trim()
  if (primary) return primary
  if (channel.legacyWebhookEnv) {
    return String(env[channel.legacyWebhookEnv] || '').trim()
  }
  return ''
}

function rotationIndex(seed, length) {
  if (!length) return 0
  const day = Math.floor(Date.now() / 86_400_000)
  return (day + seed) % length
}

function pickRotated(pool, seed) {
  if (!pool.length) return null
  return pool[rotationIndex(seed, pool.length)]
}

function marketingEligiblePool(pool, options = {}) {
  const recognized = filterHighlyRecognized(pool)
  if (options.postHistory == null) return recognized
  return filterByMarketingDedup(recognized, options.postHistory, options.dedupDays ?? marketingDedupDays(options.env))
}

function openEligiblePool(pool, options = {}) {
  if (options.postHistory == null) return pool || []
  return filterByMarketingDedup(pool, options.postHistory, options.dedupDays ?? marketingDedupDays(options.env))
}

function materialTradingPool(pool, options = {}) {
  const peers = pool || []
  const material = peers.filter((signal) => isMaterialDiscordTrade(signal, { peers, env: options.env }).material)
  return openEligiblePool(material, options)
}

export function buildDiscordCardPanel(lead, channelId) {
  const score = signalScoreValue(lead)
  switch (channelId) {
    case 'alpha-feed': {
      const trading = isTradingAlphaSignal(lead)
      const sub =
        score >= 65
          ? trading
            ? 'ELEVATED SIGNAL'
            : 'MODERATE FRICTION'
          : trading
            ? 'DESK SIGNAL'
            : 'LOW FRICTION'
      return {
        main: String(score),
        sub,
        scale: 14,
        urgency: score,
        accent: score >= 65 ? [255, 159, 28] : [84, 214, 150],
        border: score >= 65 ? [255, 159, 28] : [84, 214, 150],
      }
    }
    case 'mass-layoffs': {
      const workers = String(lead?.workers || '').replace(/,/g, '')
      if (workers && /^\d+$/.test(workers)) {
        return {
          main: workers,
          sub: 'WORKFORCE ALERT',
          scale: workers.length > 3 ? 11 : 14,
          urgency: score || 72,
          accent: [255, 196, 72],
          border: [255, 168, 48],
          denom: false,
        }
      }
      return {
        main: String(score > 0 ? score : 'n/a'),
        sub: 'WARN NOTICE',
        scale: 14,
        urgency: score,
        accent: [255, 196, 72],
        border: [255, 168, 48],
      }
    }
    case 'congress-and-insiders':
      return {
        main: String(score > 0 ? score : 'n/a'),
        sub: 'CONGRESS / INSIDER',
        scale: 14,
        urgency: score,
        accent: [125, 211, 252],
        border: [56, 189, 248],
      }
    case 'market-chatter':
      return {
        main: String(score > 0 ? score : 'n/a'),
        sub: 'MARKET CHATTER',
        scale: 14,
        urgency: score,
        accent: [167, 243, 208],
        border: [52, 211, 153],
      }
    default:
      return {
        main: String(score > 0 ? score : 'n/a'),
        sub: 'FRICTION SCORE',
        scale: 14,
        urgency: score,
        accent: [72, 255, 155],
        border: [72, 255, 155],
      }
  }
}

function isAlphaFeedSignal(signal) {
  const eventType = String(signal?.event_type || signal?.recordType || '').toLowerCase()
  if (/warn/.test(eventType)) return false
  if (eventType === 'bankruptcy_docket' || /bankruptcy|chapter|receivership/.test(eventType)) return false
  return isModerateOrLowerSeverity(signal, FREE_ALPHA_CHANNELS['alpha-feed'].maxSeverityExclusive)
}

function warnEventsFromStats(stats) {
  const pool = []
  const seen = new Set()
  for (const group of stats.entityEventGroups || []) {
    for (const event of group.events || []) {
      if (!FREE_ALPHA_CHANNELS['mass-layoffs'].eventMatch(event)) continue
      const key = `${group.entity_id}:${event.filingDate || event.filing_date}:${event.event_type}`
      if (seen.has(key)) continue
      seen.add(key)
      pool.push({
        ...event,
        name: group.name,
        slug: group.slug,
        entity_id: group.entity_id,
      })
    }
  }
  for (const signal of stats.signalCandidates || []) {
    if (!FREE_ALPHA_CHANNELS['mass-layoffs'].eventMatch(signal)) continue
    const key = `${signal.entity_id}:${signal.filingDate}:${signal.event_type}`
    if (seen.has(key)) continue
    seen.add(key)
    pool.push(signal)
  }
  if (stats.warn) {
    const key = `${stats.warn.entity_id}:${stats.warn.filingDate}:${stats.warn.event_type}`
    if (!seen.has(key)) pool.push(stats.warn)
  }
  return pool
}

function congressInsiderEventsFromStats(stats) {
  const pool = []
  const seen = new Set()
  for (const group of stats.entityEventGroups || []) {
    for (const event of group.events || []) {
      if (!isTradingAlphaSignal(event)) continue
      const key = `${group.entity_id}:${event.filingDate || event.filing_date}:${event.event_type}`
      if (seen.has(key)) continue
      seen.add(key)
      pool.push({
        ...event,
        name: group.name,
        slug: group.slug,
        entity_id: group.entity_id,
      })
    }
  }
  for (const signal of stats.signalCandidates || []) {
    if (!isTradingAlphaSignal(signal)) continue
    const key = `${signal.entity_id}:${signal.filingDate}:${signal.event_type}`
    if (seen.has(key)) continue
    seen.add(key)
    pool.push(signal)
  }
  return pool
}

function marketChatterEventsFromStats(stats) {
  const pool = []
  const seen = new Set()
  for (const signal of stats.signalCandidates || []) {
    const eventType = String(signal?.event_type || signal?.recordType || '').toLowerCase()
    if (/warn|bankruptcy/.test(eventType)) continue
    const key = `${signal.entity_id || signal.name}:${signal.filingDate}:${eventType}`
    if (seen.has(key)) continue
    seen.add(key)
    pool.push(signal)
  }
  return pool
}

function formatShortDate(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return String(value || 'recent')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
export function pickAlphaFeedLead(stats, channelId = 'alpha-feed', options = {}) {
  const materialTrades = materialTradingPool(
    (stats.signalCandidates || []).filter(isTradingAlphaSignal),
    options,
  ).sort((a, b) => {
    const scoreDiff =
      signalScoreValue(b) + recognitionBoost(b) - (signalScoreValue(a) + recognitionBoost(a))
    if (scoreDiff) return scoreDiff
    return String(b.filingDate || b.filing_date || '').localeCompare(String(a.filingDate || a.filing_date || ''))
  })
  if (materialTrades.length) return pickRotated(materialTrades, channelId.length + 1)

  const pool = marketingEligiblePool(
    (stats.signalCandidates || []).filter(isAlphaFeedSignal),
    options,
  ).sort((a, b) => {
    const tradingBoost = (isTradingAlphaSignal(b) ? 18 : 0) - (isTradingAlphaSignal(a) ? 18 : 0)
    const scoreDiff =
      signalScoreValue(b) + recognitionBoost(b) + tradingBoost - (signalScoreValue(a) + recognitionBoost(a))
    if (scoreDiff) return scoreDiff
    return String(b.filingDate || b.filing_date || '').localeCompare(String(a.filingDate || a.filing_date || ''))
  })

  if (pool.length) return pickRotated(pool, channelId.length + 1)

  const spotlightFallback = marketingEligiblePool(
    [stats.spotlight].filter(Boolean).filter(isAlphaFeedSignal),
    options,
  )
  if (spotlightFallback.length) return pickRotated(spotlightFallback, channelId.length + 7)

  return null
}

export function pickMassLayoffsLead(stats, options = {}) {
  const pool = openEligiblePool(warnEventsFromStats(stats), options)
  if (pool.length) {
    pool.sort((a, b) => {
      const boostDiff = recognitionBoost(b) - recognitionBoost(a)
      if (boostDiff) return boostDiff
      const workersDiff = Number(b.workers || 0) - Number(a.workers || 0)
      if (workersDiff) return workersDiff
      return String(b.filingDate || b.filing_date || '').localeCompare(String(a.filingDate || a.filing_date || ''))
    })
    return pickRotated(pool, 11)
  }
  return null
}

export function pickCongressInsidersLead(stats, options = {}) {
  const pool = materialTradingPool(congressInsiderEventsFromStats(stats), options)
  if (pool.length) {
    pool.sort((a, b) => {
      const scoreDiff =
        signalScoreValue(b) + recognitionBoost(b) - (signalScoreValue(a) + recognitionBoost(a))
      if (scoreDiff) return scoreDiff
      return String(b.filingDate || b.filing_date || '').localeCompare(String(a.filingDate || a.filing_date || ''))
    })
    return pickRotated(pool, 13)
  }
  return null
}

/** @deprecated use pickCongressInsidersLead */
export function pickBankruptcyWatchLead(stats, options = {}) {
  return pickCongressInsidersLead(stats, options)
}

export function pickMarketChatterLead(stats, options = {}) {
  const pool = marketingEligiblePool(marketChatterEventsFromStats(stats), options)
  if (pool.length) {
    pool.sort((a, b) => {
      const scoreDiff =
        signalScoreValue(b) + recognitionBoost(b) - (signalScoreValue(a) + recognitionBoost(a))
      if (scoreDiff) return scoreDiff
      return String(b.filingDate || b.filing_date || '').localeCompare(String(a.filingDate || a.filing_date || ''))
    })
    return pickRotated(pool, 17)
  }
  return null
}

export function pickLeadForChannel(channelId, stats, options = {}) {
  switch (channelId) {
    case 'alpha-feed':
      return pickAlphaFeedLead(stats, channelId, options)
    case 'mass-layoffs':
      return pickMassLayoffsLead(stats, options)
    case 'congress-and-insiders':
      return pickCongressInsidersLead(stats, options)
    case 'market-chatter':
      return pickMarketChatterLead(stats, options)
    default:
      return null
  }
}

export function buildChannelCampaign(channelId, lead, siteUrl, options = {}) {
  const channel = FREE_ALPHA_CHANNELS[channelId]
  const score = signalScoreValue(lead)
  const ctaUrl = lead?.slug ? `${siteUrl}/signal/${lead.slug}` : siteUrl
  const compact = options.compact === true
  const base = {
    cardFraming: 'relief',
    cardTheme: channel?.cardTheme || 'alpha',
    cardPanel: buildDiscordCardPanel(lead, channelId),
    cardCta: 'See the full filing →',
    ...(compact ? { compactRender: true } : {}),
  }

  if (compact) {
    const name = String(lead?.name || 'Company').trim()
    if (channelId === 'mass-layoffs') {
      const workers = lead?.workers ? `${lead.workers} workers` : 'WARN notice'
      return {
        ...base,
        cardStakeLine: name,
        cardSupportLine: `${workers} · ${filingMetaLine(lead)}`,
      }
    }
    if (channelId === 'congress-and-insiders') {
      return {
        ...base,
        cardStakeLine: name,
        cardSupportLine: `Trading disclosure · ${filingMetaLine(lead)}`,
      }
    }
    return {
      ...base,
      cardStakeLine: name,
      cardSupportLine: filingMetaLine(lead),
    }
  }

  if (channelId === 'mass-layoffs') {
    const workers = lead?.workers ? `${lead.workers} workers` : 'a workforce reduction'
    const playbook = buildPlaybookTweet({
      lead,
      siteUrl: ctaUrl,
      templateId: 'relief-2',
      scoreText: score > 0 ? String(score) : 'n/a',
    })
    return {
      ...base,
      cardStakeLine: `${lead?.name || 'This company'} filed a WARN notice, ${workers} affected.`,
      cardSupportLine: filingMetaLine(lead),
      cardTitle: playbook.cardTitle,
      cardSubtitle: playbook.cardSubtitle,
    }
  }

  if (channelId === 'congress-and-insiders') {
    return {
      ...base,
      cardStakeLine: plainLanguageStake(lead),
      cardSupportLine: filingMetaLine(lead),
      cardTitle: plainLanguageStake(lead),
      cardSubtitle: filingMetaLine(lead),
    }
  }

  const playbook = buildPlaybookTweet({
    lead,
    siteUrl: ctaUrl,
    templateId: 'relief-2',
    scoreText: score > 0 ? String(score) : 'n/a',
  })
  return {
    ...base,
    cardTitle: playbook.cardTitle,
    cardSubtitle: playbook.cardSubtitle,
    cardStakeLine: playbook.stakeLine || plainLanguageStake(lead),
    cardSupportLine: filingMetaLine(lead),
  }
}

/** @deprecated use buildChannelCampaign */
export function buildReliefHeroCampaign(lead, siteUrl) {
  return buildChannelCampaign('alpha-feed', lead, siteUrl)
}

export function formatChannelCaption(channelId, lead, siteUrl, options = {}) {
  const channel = FREE_ALPHA_CHANNELS[channelId]
  if (!channel) return ''

  const score = signalScoreValue(lead)
  const state = discordSignalState(lead?.jurisdiction)
  const filed = formatShortDate(lead?.filingDate || lead?.filing_date)
  const ctaHost = siteUrl.replace(/^https?:\/\//, '')
  const company = lead?.name ? `${lead.name} · ` : ''
  const typeLabel = discordSignalType(lead?.event_type || lead?.eventType, lead?.recordType || lead?.record_type)

  if (channelId === 'mass-layoffs') {
    const workers = lead?.workers ? `${lead.workers} workers · ` : ''
    const detail = lead?.workers
      ? `${company}${workers}WARN notice · ${state} · filed ${filed}`
      : `${company}WARN notice · friction ${score > 0 ? score : 'n/a'}/100 · ${state} · filed ${filed}`
    return [
      `📡 ${channel.label.toUpperCase()}; ${channel.hashtag}`,
      RELIEF_HEADLINE,
      detail,
      'Source doc + timeline locked for subscribers on the desk.',
      `→ ${ctaHost}`,
    ].join('\n')
  }

  if (channelId === 'congress-and-insiders') {
    return [
      `📡 ${channel.label.toUpperCase()}; ${channel.hashtag}`,
      RELIEF_HEADLINE,
      `${company}${typeLabel} · friction ${score > 0 ? score : 'n/a'}/100 · ${state} · filed ${filed}`,
      'Who traded, issuer, and source URL locked for desk subscribers.',
      `→ ${ctaHost}`,
    ].join('\n')
  }

  if (channel.format === 'hero-card') {
    return [
      `📡 ${channel.label.toUpperCase()}; ${channel.hashtag}`,
      RELIEF_HEADLINE,
      `${company}${typeLabel} · friction ${score > 0 ? score : 'n/a'}/100 · ${state} · filed ${filed}`,
      isTradingAlphaSignal(lead)
        ? 'Who traded, issuer, and source URL locked for desk subscribers.'
        : 'Source doc + timeline locked for subscribers on the desk.',
      `→ ${ctaHost}`,
    ].join('\n')
  }

  return formatDiscordReliefDrop({
    signal: lead,
    siteUrl,
    channelLabel: channel.label,
    channelHashtag: channel.hashtag,
    reliefHeadline: RELIEF_HEADLINE,
    date: options.date,
  })
}

/**
 * Run one ACCESS_FREE_ALPHA channel drop.
 * @param {object} env
 * @param {object} deps - injected from marketing cron (fetch + card builder)
 * @param {{ channelId: FreeAlphaChannelId, force?: boolean, forcePost?: boolean, dryRun?: boolean }} options
 */
export async function runFreeAlphaChannel(env, deps, options = {}) {
  const channelId = options.channelId
  const channel = FREE_ALPHA_CHANNELS[channelId]
  if (!channel) {
    return { ok: false, skipped: true, reason: `Unknown channel: ${channelId}` }
  }

  const enabled =
    deps.bool(env.DISCORD_BOT_ENABLED, false) ||
    deps.bool(env.DISCORD_SIGNAL_ENABLED, false) ||
    options.force
  if (!enabled) {
    return { ok: true, skipped: true, channel: channelId, reason: 'DISCORD_BOT_ENABLED is not true.' }
  }

  const dryRun = (deps.bool(env.DISCORD_BOT_DRY_RUN, true) && !options.forcePost) || Boolean(options.dryRun)
  const webhook = channelWebhook(env, channel)
  if (!dryRun && !webhook) {
    return {
      ok: false,
      skipped: true,
      channel: channelId,
      reason: `${channel.webhookEnv} is not set.`,
    }
  }

  const site = String(env.PUBLIC_SITE_URL || deps.defaultSite).replace(/\/$/, '')
  const postHistory = deps.loadMarketingPostHistory
    ? await deps.loadMarketingPostHistory(env)
    : []
  const templateOptions = {
    postHistory,
    dedupDays: marketingDedupDays(env),
    skipSpotlight: channelId !== 'alpha-feed',
  }
  const [feed, sources] = await Promise.all([
    deps.fetchJson(`${site}/api/friction-feed`),
    deps.fetchJson(`${site}/api/source-transparency`),
  ])
  const templateData = await deps.fetchTemplateData(env, feed, templateOptions)
  const stats = {
    ...deps.campaignStats(feed, sources),
    ...templateData,
  }

  const pickOptions = { env, postHistory, dedupDays: templateOptions.dedupDays }
  const lead = pickLeadForChannel(channelId, stats, pickOptions)
  if (!lead) {
    return {
      ok: true,
      skipped: true,
      channel: channelId,
      reason: 'No highly recognized signal available (or all recent picks are in dedup cooldown).',
    }
  }

  const caption = formatChannelCaption(channelId, lead, site)
  let imageBase64 = null
  if (channel.format === 'hero-card') {
    const useCompactCard =
      !isNodeRuntime() || deps.bool(env.DISCORD_FORCE_COMPACT_CARDS, false)
    const campaign = buildChannelCampaign(channelId, lead, site, {
      compact: useCompactCard,
    })
    imageBase64 = deps.generateHeroCardBase64(stats, campaign, lead)
  }

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      channel: channelId,
      category: FREE_ALPHA_CATEGORY,
      format: channel.format,
      discord_text: caption,
      discord_status: 'dry_run',
      discord_lead: lead?.name || null,
      has_image: Boolean(imageBase64),
    }
  }

  try {
    if (channel.format === 'hero-card' && imageBase64) {
      await postDiscordWebhookWithImage(webhook, caption, imageBase64, `vortx-${channelId}.png`)
    } else {
      await postDiscordWebhook(webhook, caption)
    }
    if (deps.recordMarketingPost) {
      await deps.recordMarketingPost(env, lead, channelId, { dryRun: false, history: postHistory })
    } else {
      await recordMarketingPost(env, lead, channelId, { dryRun: false, history: postHistory })
    }
    return {
      ok: true,
      dry_run: false,
      channel: channelId,
      category: FREE_ALPHA_CATEGORY,
      format: channel.format,
      discord_status: 'posted',
      discord_text: caption,
      discord_lead: lead?.name || null,
      has_image: Boolean(imageBase64),
    }
  } catch (error) {
    return {
      ok: false,
      dry_run: false,
      channel: channelId,
      category: FREE_ALPHA_CATEGORY,
      discord_status: `failed: ${error.message}`,
      discord_text: caption,
      discord_lead: lead?.name || null,
      has_image: Boolean(imageBase64),
    }
  }
}

/**
 * Run all ACCESS_FREE_ALPHA channels (manual / preview).
 */
export async function runAllFreeAlphaChannels(env, deps, options = {}) {
  const results = {}
  for (const channelId of listFreeAlphaChannelIds()) {
    results[channelId] = await runFreeAlphaChannel(env, deps, { ...options, channelId })
  }
  const posted = Object.values(results).filter((row) => row.discord_status === 'posted').length
  const skipped = Object.values(results).filter((row) => row.skipped).length
  return { ok: true, category: FREE_ALPHA_CATEGORY, posted, skipped, channels: results }
}
