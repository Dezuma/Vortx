/**
 * Ingest-time Discord drops:
 * - #mass-layoffs: every new WARN (wide open)
 * - #alpha-feed + #congress-and-insiders: material trades only
 */

import { extractAffectedWorkers } from '../frontend/functions/lib/warn-notice.js'
import { supabaseRest } from '../frontend/functions/lib/supabase-rest.js'
import { webhookForCaseTarget, CASE_DISCORD_TARGETS } from '../frontend/functions/lib/case-discord-targets.js'
import {
  discordTradeMaterialityOptions,
  isMaterialDiscordTrade,
} from '../frontend/functions/lib/discord-trade-materiality.js'
import {
  buildChannelCampaign,
  formatChannelCaption,
} from './discord-free-alpha.js'
import { postDiscordWebhook, postDiscordWebhookWithImage } from './discord-signal-template.js'
import {
  filterByMarketingDedup,
  loadMarketingPostHistory,
  marketingDedupDays,
  recordMarketingPost,
} from './marketing-dedup.js'
import { renderHeroCardPngBase64 } from './x-marketing-cron.js'

const EVENT_SELECT =
  'id,entity_id,event_type,title,summary,jurisdiction,filing_date,amount,severity,confidence,created_at'

function bool(value, fallback = false) {
  if (value == null || value === '') return fallback
  const text = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(text)) return true
  if (['0', 'false', 'no', 'off'].includes(text)) return false
  return fallback
}

function lookbackIso(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString()
}

function channelWebhook(env, channelId) {
  return webhookForCaseTarget(env, CASE_DISCORD_TARGETS[channelId])
}

function eventToLead(event, entity) {
  const workers = extractAffectedWorkers(event?.summary)
  return {
    name: entity?.canonical_name || String(event?.title || 'Public record').replace(/^Form 4 insider filing:\s*/i, '').trim(),
    entity_id: event?.entity_id || event?.id,
    event_type: event?.event_type,
    recordType: event?.event_type,
    score: Number(event?.severity) || 0,
    severity: Number(event?.severity) || 0,
    amount: event?.amount,
    filingDate: event?.filing_date,
    jurisdiction: event?.jurisdiction,
    workers: workers || null,
    summary: event?.summary,
    title: event?.title,
  }
}

async function loadEntityMap(env, events) {
  const ids = [...new Set((events || []).map((row) => row.entity_id).filter(Boolean))]
  if (!ids.length) return new Map()
  try {
    const rows = await supabaseRest(
      env,
      `entities?select=id,canonical_name,ticker,jurisdiction&id=in.(${ids.map((id) => encodeURIComponent(id)).join(',')})`,
    )
    return new Map((rows || []).map((row) => [row.id, row]))
  } catch {
    return new Map()
  }
}

async function postChannel(env, { channelId, lead, siteUrl, webhook, dryRun }) {
  const caption = formatChannelCaption(channelId, lead, siteUrl)
  if (dryRun) {
    return { channel: channelId, posted: false, dry_run: true, lead: lead.name, has_image: true }
  }

  let imageBase64 = null
  try {
    const campaign = buildChannelCampaign(channelId, lead, siteUrl, { compact: true })
    imageBase64 = renderHeroCardPngBase64(campaign, lead)
  } catch {
    imageBase64 = null
  }

  if (imageBase64) {
    await postDiscordWebhookWithImage(webhook, caption, imageBase64, `vortx-${channelId}.png`)
  } else {
    await postDiscordWebhook(webhook, caption)
  }
  return { channel: channelId, posted: true, lead: lead.name, has_image: Boolean(imageBase64) }
}

export async function runDiscordIngestPosts(env, options = {}) {
  const enabled = bool(env.DISCORD_INGEST_POSTS_ENABLED, true) && bool(env.DISCORD_BOT_ENABLED, false)
  if (!enabled && !options.force) {
    return { ok: true, skipped: true, reason: 'DISCORD_INGEST_POSTS_ENABLED or DISCORD_BOT_ENABLED is not true.' }
  }

  const dryRun = bool(env.DISCORD_BOT_DRY_RUN, true) || Boolean(options.dryRun)
  const warnWebhook = channelWebhook(env, 'mass-layoffs')
  const congressWebhook = channelWebhook(env, 'congress-and-insiders')
  const alphaWebhook = channelWebhook(env, 'alpha-feed')
  if (!dryRun && !warnWebhook && !congressWebhook && !alphaWebhook) {
    return { ok: false, skipped: true, reason: 'No Discord webhooks configured for ingest posts.' }
  }

  const lookbackHours = Number(env.DISCORD_INGEST_LOOKBACK_HOURS || 3)
  const warnMax = Math.min(8, Math.max(1, Number(env.DISCORD_WARN_MAX_PER_RUN || 4)))
  const tradeMax = Math.min(6, Math.max(1, Number(env.DISCORD_TRADE_MAX_PER_RUN || 3)))
  const materiality = discordTradeMaterialityOptions(env)
  const siteUrl = String(env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
  const cutoff = lookbackIso(Number.isFinite(lookbackHours) && lookbackHours > 0 ? lookbackHours : 3)

  const [warnEvents, tradeEvents] = await Promise.all([
    supabaseRest(
      env,
      `legal_events?select=${EVENT_SELECT}&event_type=eq.warn_notice&created_at=gte.${encodeURIComponent(cutoff)}&order=created_at.desc&limit=40`,
    ),
    supabaseRest(
      env,
      `legal_events?select=${EVENT_SELECT}&event_type=in.(form_4,congress_trade)&created_at=gte.${encodeURIComponent(cutoff)}&order=created_at.desc&limit=80`,
    ),
  ])

  const history = await loadMarketingPostHistory(env)
  const dedupDays = marketingDedupDays(env)
  const warnPool = filterByMarketingDedup(warnEvents || [], history, dedupDays).slice(0, warnMax)

  const tradePeers = tradeEvents || []
  const materialTrades = tradePeers.filter(
    (event) => isMaterialDiscordTrade(event, { ...materiality, peers: tradePeers }).material,
  )
  const tradePool = filterByMarketingDedup(materialTrades, history, dedupDays).slice(0, tradeMax)

  const entityMap = await loadEntityMap(env, [...warnPool, ...tradePool])
  const posts = []

  for (const event of warnPool) {
    if (!dryRun && !warnWebhook) break
    const lead = eventToLead(event, entityMap.get(event.entity_id))
    try {
      const result = await postChannel(env, {
        channelId: 'mass-layoffs',
        lead,
        siteUrl,
        webhook: warnWebhook,
        dryRun,
      })
      posts.push({ ...result, event_id: event.id, reason: 'warn_open' })
      if (!dryRun) await recordMarketingPost(env, lead, 'mass-layoffs', { dryRun: false, history })
    } catch (error) {
      posts.push({
        channel: 'mass-layoffs',
        posted: false,
        event_id: event.id,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  for (const event of tradePool) {
    const lead = eventToLead(event, entityMap.get(event.entity_id))
    const gate = isMaterialDiscordTrade(event, { ...materiality, peers: tradePeers })
    const targets = [
      ['congress-and-insiders', congressWebhook],
      ['alpha-feed', alphaWebhook],
    ]
    for (const [channelId, webhook] of targets) {
      if (!dryRun && !webhook) continue
      try {
        const result = await postChannel(env, { channelId, lead, siteUrl, webhook, dryRun })
        posts.push({ ...result, event_id: event.id, reason: gate.reason })
      } catch (error) {
        posts.push({
          channel: channelId,
          posted: false,
          event_id: event.id,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }
    if (!dryRun && posts.some((row) => row.event_id === event.id && row.posted)) {
      await recordMarketingPost(env, lead, 'congress-and-insiders', { dryRun: false, history })
    }
  }

  return {
    ok: true,
    dry_run: dryRun,
    warn_candidates: (warnEvents || []).length,
    warn_posted: posts.filter((row) => row.channel === 'mass-layoffs' && (row.posted || row.dry_run)).length,
    trade_candidates: tradePeers.length,
    trade_material: materialTrades.length,
    trade_posted: posts.filter((row) => row.channel !== 'mass-layoffs' && (row.posted || row.dry_run)).length,
    skipped_immaterial: tradePeers.length - materialTrades.length,
    posts,
  }
}
