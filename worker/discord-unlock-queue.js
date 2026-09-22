/**
 * THE VAULT Discord channels (locked).
 * - #unfiltered-signals: daily urgency teasers (hero card, headline + score visible, source/timeline locked)
 * - #data-dumps: weekly CSV/export previews for power users
 * - #death-spirals: weekly multi-signal distress patterns (lien → WARN → bankruptcy)
 * - #tactical-playbook: weekly playbook-style unlock teasers
 */

import { maskEntityName, postDiscordWebhook, postDiscordWebhookWithImage } from './discord-signal-template.js'
import { signalScoreValue } from './discord-free-alpha.js'
import { buildPlaybookTweet, filingMetaLine, plainLanguageStake } from './social-playbook.js'
import { teaserLockedMetaLine } from './hero-card-renderer.js'

export const UNLOCK_QUEUE_CATEGORY = 'THE VAULT'

/** @typedef {'unfiltered-signals' | 'death-spirals' | 'data-dumps' | 'tactical-playbook'} UnlockQueueChannelId */

/** @type {Record<UnlockQueueChannelId, object>} */
export const UNLOCK_QUEUE_CHANNELS = {
  'unfiltered-signals': {
    id: 'unfiltered-signals',
    label: 'Unfiltered Signals',
    hashtag: '#unfiltered-signals',
    crons: ['17 14 * * *'],
    format: 'teaser-card',
    framing: 'urgency',
    minSeverity: 80,
    webhookEnv: 'DISCORD_UNFILTERED_SIGNALS_WEBHOOK_URL',
  },
  'data-dumps': {
    id: 'data-dumps',
    label: 'Data Dumps',
    hashtag: '#data-dumps #exports',
    crons: ['17 14 * * 4'],
    format: 'csv-preview',
    framing: 'utility',
    webhookEnv: 'DISCORD_DATA_DUMPS_WEBHOOK_URL',
  },
  'death-spirals': {
    id: 'death-spirals',
    label: 'Death Spirals',
    hashtag: '#death-spirals #distresspattern',
    crons: ['17 14 * * 1'],
    format: 'spiral-story',
    framing: 'urgency',
    webhookEnv: 'DISCORD_DEATH_SPIRALS_WEBHOOK_URL',
    legacyWebhookEnv: 'DISCORD_BANKRUPTCY_WATCH_WEBHOOK_URL',
  },
  'tactical-playbook': {
    id: 'tactical-playbook',
    label: 'Tactical Playbook',
    hashtag: '#tactical-playbook',
    crons: ['17 14 * * 0'],
    format: 'teaser-card',
    framing: 'urgency',
    minSeverity: 75,
    webhookEnv: 'DISCORD_TACTICAL_PLAYBOOK_WEBHOOK_URL',
  },
}

const EXPOSURE_HOOK = 'Your exposure window just opened.'
const SPIRAL_STAGE_DEFS = [
  { key: 'lien', label: 'Lien cluster', match: /lien|ucc|mechanics|secured|judgment/ },
  { key: 'warn', label: 'WARN notice', match: /warn/ },
  {
    key: 'bankruptcy',
    label: 'Bankruptcy docket',
    match: /^bankruptcy_docket$|bankruptcy_chapter|receivership/,
  },
]

export function resolveUnlockQueueChannelFromCron(cronExpression) {
  const cron = String(cronExpression || '').trim()
  for (const channel of Object.values(UNLOCK_QUEUE_CHANNELS)) {
    if (channel.crons.includes(cron)) return channel.id
  }
  return null
}

export function listUnlockQueueChannelIds() {
  return Object.keys(UNLOCK_QUEUE_CHANNELS)
}

function channelWebhook(env, channel) {
  const primary = String(env[channel.webhookEnv] || '').trim()
  if (primary) return primary
  if (channel.legacyWebhookEnv) return String(env[channel.legacyWebhookEnv] || '').trim()
  return ''
}

function rotationIndex(seed, length) {
  if (!length) return 0
  const day = Math.floor(Date.now() / 86_400_000)
  return (day + seed) % length
}

function weekRotationIndex(seed, length) {
  if (!length) return 0
  const week = Math.floor(Date.now() / (86_400_000 * 7))
  return (week + seed) % length
}

function pickRotated(pool, seed, weekly = false) {
  if (!pool.length) return null
  const index = weekly ? weekRotationIndex(seed, pool.length) : rotationIndex(seed, pool.length)
  return pool[index]
}

function formatShortDate(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return String(value || 'recent')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function headerDate(date) {
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) {
    return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  }
  return value.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function isHighSeveritySignal(signal, minSeverity = 80) {
  return signalScoreValue(signal) >= minSeverity
}

export function pickUnfilteredSignalsLead(stats) {
  const minSeverity = UNLOCK_QUEUE_CHANNELS['unfiltered-signals'].minSeverity
  const pool = (stats.signalCandidates || [])
    .filter((signal) => isHighSeveritySignal(signal, minSeverity))
    .sort((a, b) => {
      const scoreDiff = signalScoreValue(b) - signalScoreValue(a)
      if (scoreDiff) return scoreDiff
      return String(b.filingDate || '').localeCompare(String(a.filingDate || ''))
    })

  if (pool.length) return pickRotated(pool, 17)

  const fallback = [stats.warn, stats.bankruptcy, stats.spotlight]
    .filter(Boolean)
    .filter((signal) => isHighSeveritySignal(signal, minSeverity))
  return pickRotated(fallback, 23)
}

export function buildDeathSpiralStages(events) {
  const sorted = [...(events || [])].sort((a, b) =>
    String(a.filingDate || a.filing_date || '').localeCompare(String(b.filingDate || b.filing_date || '')),
  )
  const stages = []
  for (const def of SPIRAL_STAGE_DEFS) {
    const hit = sorted.find((event) => def.match.test(String(event.event_type || '')))
    if (!hit) continue
    stages.push({
      key: def.key,
      label: def.label,
      event_type: hit.event_type,
      filingDate: hit.filingDate || hit.filing_date,
      jurisdiction: hit.jurisdiction,
      score: signalScoreValue(hit),
      workers: hit.workers || null,
    })
  }
  return stages
}

export function isOrderedSpiral(stages) {
  if (stages.length < 2) return false
  const order = SPIRAL_STAGE_DEFS.map((def) => def.key)
  const keys = stages.map((stage) => stage.key)
  let lastIndex = -1
  for (const key of keys) {
    const index = order.indexOf(key)
    if (index <= lastIndex) return false
    lastIndex = index
  }
  for (let i = 1; i < stages.length; i += 1) {
    if (String(stages[i].filingDate || '') < String(stages[i - 1].filingDate || '')) return false
  }
  return true
}

export function detectDeathSpirals(stats) {
  const groups = stats.entityEventGroups || []
  const spirals = []

  for (const group of groups) {
    const stages = buildDeathSpiralStages(group.events)
    if (stages.length < 2 || !isOrderedSpiral(stages)) continue
    const latestDate = stages[stages.length - 1]?.filingDate || 'recent'
    spirals.push({
      entity_id: group.entity_id,
      name: group.name,
      slug: group.slug,
      stages,
      stageCount: stages.length,
      latestDate,
      peakScore: Math.max(...stages.map((stage) => stage.score || 0)),
    })
  }

  spirals.sort((a, b) => {
    const stageDiff = b.stageCount - a.stageCount
    if (stageDiff) return stageDiff
    const scoreDiff = b.peakScore - a.peakScore
    if (scoreDiff) return scoreDiff
    return String(b.latestDate).localeCompare(String(a.latestDate))
  })

  return spirals
}

export function pickDeathSpiral(stats) {
  const spirals = detectDeathSpirals(stats)
  return pickRotated(spirals, 29, true)
}

export function buildTeaserHeroCampaign(lead, siteUrl) {
  const score = signalScoreValue(lead)
  const playbook = buildPlaybookTweet({
    lead,
    siteUrl,
    templateId: 'urgency-1',
    scoreText: score > 0 ? String(score) : 'n/a',
  })
  const filingMeta = filingMetaLine(lead)
  return {
    cardTitle: playbook.cardTitle,
    cardSubtitle: playbook.cardSubtitle,
    cardStakeLine: plainLanguageStake(lead),
    cardSupportLine: `${filingMeta} · ${teaserLockedMetaLine()}`,
    cardCta: 'Unlock source + timeline →',
    cardFraming: 'urgency',
    cardMode: 'teaser',
    urgencyHeadline: EXPOSURE_HOOK,
  }
}

export function formatUnfilteredSignalsCaption(lead, siteUrl) {
  const score = signalScoreValue(lead)
  const ctaUrl = lead?.slug ? `${siteUrl}/signal/${lead.slug}` : `${siteUrl}/?view=pricing`
  const typeLabel = String(lead?.recordType || lead?.event_type || 'public record').replaceAll('_', ' ')
  return [
    `🔓 UNFILTERED SIGNALS; ${UNLOCK_QUEUE_CHANNELS['unfiltered-signals'].hashtag}`,
    EXPOSURE_HOOK,
    `Headline + score visible · source + timeline locked on card`,
    `Friction ${score > 0 ? score : 'n/a'}/100 · ${typeLabel}`,
    'Desk subscribers unlock the source URL and full timeline.',
    `→ ${ctaUrl.replace(/^https?:\/\//, '')}`,
  ].join('\n')
}

export function formatDeathSpiralStory(spiral, siteUrl, options = {}) {
  const stageLines = spiral.stages.map((stage, index) => {
    const workers = stage.workers ? ` · ${stage.workers} workers` : ''
    return `${index + 1}. ${stage.label} · filed ${formatShortDate(stage.filingDate)} · ${stage.jurisdiction}${workers}`
  })

  const ctaUrl = spiral.slug ? `${siteUrl}/signal/${spiral.slug}` : `${siteUrl}/?view=pricing`
  return [
    `🌀 DEATH SPIRAL; ${headerDate(options.date)}`,
    UNLOCK_QUEUE_CHANNELS['death-spirals'].hashtag,
    '',
    `${spiral.name} · ${spiral.stageCount}-stage distress pattern (visible)`,
    '━━━━━━━━━━━━━━━━━━━━',
    ...stageLines,
    '━━━━━━━━━━━━━━━━━━━━',
    'Pattern visible. Underlying source docs: LOCKED.',
    'Timeline export: LOCKED.',
    '',
    'Subscribers saw each stage on filing date. Your desk has the receipts.',
    `→ Unlock full queue at ${ctaUrl.replace(/^https?:\/\//, '')}`,
  ].join('\n')
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function buildDataDumpPreview(stats, options = {}) {
  const sampleSize = Math.min(Number(options.sampleSize || 5), 8)
  const rows = (stats.rawEvents || stats.signalCandidates || [])
    .filter((row) => row.name || row.entity_id)
    .sort((a, b) => String(b.filing_date || b.filingDate || '').localeCompare(String(a.filing_date || a.filingDate || '')))
    .slice(0, sampleSize)

  const header = 'entity,jurisdiction,event_type,filing_date,severity,source_url'
  const body = rows.map((row) =>
    [
      csvEscape(maskEntityName(row.name)),
      csvEscape(row.jurisdiction || 'US'),
      csvEscape(String(row.event_type || row.recordType || 'public_record').replaceAll(' ', '_')),
      csvEscape(row.filing_date || row.filingDate || 'recent'),
      csvEscape(String(row.severity ?? row.score ?? '')),
      csvEscape('LOCKED'),
    ].join(','),
  )

  const jurisdictions = new Set(rows.map((row) => row.jurisdiction).filter(Boolean))
  const eventTypes = new Set(rows.map((row) => row.event_type || row.recordType).filter(Boolean))
  const totalRecords = Number(stats.eventCount || rows.length || 0)

  return {
    header,
    body,
    csvSample: [header, ...body].join('\n'),
    meta: {
      sampleRows: rows.length,
      totalRecords,
      jurisdictionCount: jurisdictions.size,
      eventTypeCount: eventTypes.size,
    },
  }
}

export function formatDataDumpCaption(preview, siteUrl, options = {}) {
  const pricingUrl = `${siteUrl.replace(/\/$/, '')}/?view=pricing`
  return [
    `📊 DATA DUMP PREVIEW; ${headerDate(options.date)}`,
    UNLOCK_QUEUE_CHANNELS['data-dumps'].hashtag,
    '',
    `Sample export · last 90 days · trading desk / vendor-risk slice`,
    `Records in queue: ${preview.meta.totalRecords} · Jurisdictions: ${preview.meta.jurisdictionCount} · Event types: ${preview.meta.eventTypeCount}`,
    '',
    '```csv',
    preview.csvSample,
    '```',
    '',
    'Full CSV + JSON export + API: LOCKED for Operator+',
    `→ Unlock exports at ${pricingUrl.replace(/^https?:\/\//, '')}`,
  ].join('\n')
}

export function formatTacticalPlaybookCaption(lead, siteUrl) {
  const score = signalScoreValue(lead)
  const ctaUrl = lead?.slug ? `${siteUrl}/signal/${lead.slug}` : `${siteUrl}/?view=pricing`
  const typeLabel = String(lead?.recordType || lead?.event_type || 'public record').replaceAll('_', ' ')
  return [
    `🧠 TACTICAL PLAYBOOK; ${UNLOCK_QUEUE_CHANNELS['tactical-playbook'].hashtag}`,
    EXPOSURE_HOOK,
    `Playbook tease · friction ${score > 0 ? score : 'n/a'}/100 · ${typeLabel}`,
    'Full counterparty checklist + source docs: LOCKED.',
    `→ ${ctaUrl.replace(/^https?:\/\//, '')}`,
  ].join('\n')
}

export function pickLeadForUnlockChannel(channelId, stats) {
  switch (channelId) {
    case 'unfiltered-signals':
      return pickUnfilteredSignalsLead(stats)
    case 'tactical-playbook':
      return pickUnfilteredSignalsLead(stats)
    case 'death-spirals':
      return pickDeathSpiral(stats)
    case 'data-dumps':
      return buildDataDumpPreview(stats)
    default:
      return null
  }
}

export function formatUnlockChannelCaption(channelId, payload, siteUrl, options = {}) {
  switch (channelId) {
    case 'unfiltered-signals':
      return formatUnfilteredSignalsCaption(payload, siteUrl)
    case 'tactical-playbook':
      return formatTacticalPlaybookCaption(payload, siteUrl)
    case 'death-spirals':
      return formatDeathSpiralStory(payload, siteUrl, options)
    case 'data-dumps':
      return formatDataDumpCaption(payload, siteUrl, options)
    default:
      return ''
  }
}

/**
 * Run one UPGRADE // UNLOCK_FULL_QUEUE channel drop.
 */
export async function runUnlockQueueChannel(env, deps, options = {}) {
  const channelId = options.channelId
  const channel = UNLOCK_QUEUE_CHANNELS[channelId]
  if (!channel) {
    return { ok: false, skipped: true, reason: `Unknown channel: ${channelId}` }
  }

  const enabled =
    deps.bool(env.DISCORD_BOT_ENABLED, false) ||
    deps.bool(env.DISCORD_UNLOCK_ENABLED, false) ||
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
  const [feed, sources] = await Promise.all([
    deps.fetchJson(`${site}/api/friction-feed`),
    deps.fetchJson(`${site}/api/source-transparency`),
  ])
  const templateData = await deps.fetchTemplateData(env, feed, { skipSpotlight: true })
  const stats = {
    ...deps.campaignStats(feed, sources),
    ...templateData,
  }

  const payload = pickLeadForUnlockChannel(channelId, stats)
  if (!payload) {
    return {
      ok: true,
      skipped: true,
      channel: channelId,
      reason: 'No matching content in queue for this channel.',
    }
  }

  const caption = formatUnlockChannelCaption(channelId, payload, site)
  let imageBase64 = null
  if (channel.format === 'teaser-card') {
    const campaign = buildTeaserHeroCampaign(payload, site)
    imageBase64 = deps.generateHeroCardBase64(stats, campaign, payload)
  }

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      channel: channelId,
      category: UNLOCK_QUEUE_CATEGORY,
      format: channel.format,
      discord_text: caption,
      discord_status: 'dry_run',
      discord_lead: payload?.name || null,
      has_image: Boolean(imageBase64),
    }
  }

  try {
    if (channel.format === 'teaser-card' && imageBase64) {
      await postDiscordWebhookWithImage(webhook, caption, imageBase64, 'vortx-unfiltered-teaser.png')
    } else {
      await postDiscordWebhook(webhook, caption)
    }
    return {
      ok: true,
      dry_run: false,
      channel: channelId,
      category: UNLOCK_QUEUE_CATEGORY,
      format: channel.format,
      discord_status: 'posted',
      discord_text: caption,
      discord_lead: payload?.name || null,
      has_image: Boolean(imageBase64),
    }
  } catch (error) {
    return {
      ok: false,
      dry_run: false,
      channel: channelId,
      category: UNLOCK_QUEUE_CATEGORY,
      discord_status: `failed: ${error.message}`,
      discord_text: caption,
      discord_lead: payload?.name || null,
      has_image: Boolean(imageBase64),
    }
  }
}

export async function runAllUnlockQueueChannels(env, deps, options = {}) {
  const results = {}
  for (const channelId of listUnlockQueueChannelIds()) {
    results[channelId] = await runUnlockQueueChannel(env, deps, { ...options, channelId })
  }
  const posted = Object.values(results).filter((row) => row.discord_status === 'posted').length
  const skipped = Object.values(results).filter((row) => row.skipped).length
  return { ok: true, category: UNLOCK_QUEUE_CATEGORY, posted, skipped, channels: results }
}
