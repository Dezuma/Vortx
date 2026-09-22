/**
 * Distribute a published case story to Discord (PNG cards), X, and Substack.
 * Case approve is the trigger; marketing cron is a separate pipeline.
 */

import { DISCORD_BOT_USERNAME, postDiscordWebhook, postDiscordWebhookWithImage } from '../../../worker/discord-signal-template.js'
import {
  hasXOauth1,
  postTweetWithOptionalImage,
  renderHeroCardPngBase64,
} from '../../../worker/x-marketing-cron.js'
import { caseSocialCopy, sanitizeCaseText } from './case-stories.js'
import { resolveCaseDiscordWebhooks } from './case-discord-targets.js'
import { publishCaseToSubstack } from './substack-publish.js'

function bool(value, fallback = false) {
  if (value == null || value === '') return fallback
  const text = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(text)) return true
  if (['0', 'false', 'no', 'off'].includes(text)) return false
  return fallback
}

function recordTypeLabel(recordType) {
  return String(recordType || 'public record')
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function caseTheme(recordType) {
  const key = String(recordType || '').toLowerCase()
  if (/warn|layoff|workforce/.test(key)) return 'workforce'
  if (/bankruptcy|chapter|receivership|adversary/.test(key)) return 'bankruptcy'
  if (/form_4|congress|13f|insider|stock.?act/.test(key)) return 'alpha'
  return 'alpha'
}

function caseScore(sourceFields) {
  const severity = Number(sourceFields?.severity)
  if (Number.isFinite(severity) && severity > 0) return Math.min(100, Math.round(severity))
  const key = String(sourceFields?.record_type || '').toLowerCase()
  if (/warn|layoff/.test(key)) return 72
  if (/bankruptcy|receivership/.test(key)) return 84
  if (/lien|judgment|foreclosure/.test(key)) return 68
  if (/form_4|congress|13f/.test(key)) return 74
  return 70
}

function affectedWorkersLine(sourceFields, dek, body) {
  const blob = `${sourceFields?.entity_name || ''} ${dek || ''} ${body || ''} ${JSON.stringify(sourceFields || {})}`
  const match =
    blob.match(/\b(\d{1,3}(?:,\d{3})*|\d+)\s+(?:employees?|workers?|jobs?)\b/i) ||
    blob.match(/\baffect(?:ing|ed)\s+(\d{1,3}(?:,\d{3})*|\d+)\b/i)
  return match ? `${match[1]} workers named in the filing` : null
}

export function buildCaseCardLead(story) {
  const fields = story.source_fields || {}
  const score = caseScore(fields)
  return {
    name: fields.entity_name || story.headline || 'Public record',
    score,
    severity: score,
    event_type: fields.record_type || story.record_type || 'public_record',
    filing_date: fields.filing_date || null,
    jurisdiction: fields.jurisdiction || null,
    workers: affectedWorkersLine(fields, story.dek, story.body),
  }
}

export function buildCaseCardCampaign(story, siteUrl) {
  const fields = story.source_fields || {}
  const lead = buildCaseCardLead(story)
  const score = lead.score
  const recordLabel = recordTypeLabel(fields.record_type || story.record_type)
  const support = [
    recordLabel,
    fields.jurisdiction || null,
    fields.filing_date ? `filed ${fields.filing_date}` : null,
    lead.workers || null,
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    cardFraming: 'relief',
    cardTheme: caseTheme(fields.record_type || story.record_type),
    compactRender: true,
    cardPanel: { main: String(score), sub: 'CASE FILE' },
    cardStakeLine: sanitizeCaseText(story.headline).slice(0, 120),
    cardSupportLine: support.slice(0, 140),
    cardCta: 'Read the case file →',
    cardTitle: sanitizeCaseText(story.headline).slice(0, 120),
    cardSubtitle: support.slice(0, 140),
  }
}

function channelCaption(baseCopy, channelLabel) {
  if (!channelLabel || /case/i.test(channelLabel)) return baseCopy
  return `${baseCopy}\n#${channelLabel.toLowerCase().replace(/\s+/g, '-')}`
}

async function postCaseDiscord(env, story, siteUrl) {
  const targets = resolveCaseDiscordWebhooks(env, story)
  if (!targets.length) {
    return { posted: false, reason: 'no_webhook_configured', channels: [], has_image: false }
  }

  const copy = caseSocialCopy(story, siteUrl)
  const campaign = buildCaseCardCampaign(story, siteUrl)
  const lead = buildCaseCardLead(story)

  let imageBase64 = null
  let imageError = null
  try {
    imageBase64 = renderHeroCardPngBase64(campaign, lead)
  } catch (error) {
    imageError = error instanceof Error ? error.message : String(error)
  }

  const channels = []
  for (const target of targets) {
    try {
      const caption = channelCaption(copy.discord, target.label)
      if (imageBase64) {
        await postDiscordWebhookWithImage(target.webhookUrl, caption, imageBase64, 'vortx-case.png')
        channels.push({
          channel: target.channelId,
          label: target.label,
          posted: true,
          has_image: true,
        })
      } else {
        await postDiscordWebhook(target.webhookUrl, caption)
        channels.push({
          channel: target.channelId,
          label: target.label,
          posted: true,
          has_image: false,
          image_error: imageError,
        })
      }
    } catch (error) {
      channels.push({
        channel: target.channelId,
        label: target.label,
        posted: false,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const postedCount = channels.filter((row) => row.posted).length
  return {
    posted: postedCount > 0,
    has_image: Boolean(imageBase64) && postedCount > 0,
    image_error: imageError,
    posted_count: postedCount,
    attempted: channels.length,
    channels,
    bot_username: DISCORD_BOT_USERNAME,
  }
}

async function postCaseX(env, story, siteUrl) {
  if (!bool(env.CASE_X_POST_ENABLED, true)) {
    return { posted: false, reason: 'CASE_X_POST_ENABLED is not true.' }
  }
  if (bool(env.CASE_X_POST_DRY_RUN, false)) {
    return { posted: false, dry_run: true, reason: 'CASE_X_POST_DRY_RUN is true.' }
  }
  if (!hasXOauth1(env)) {
    return {
      posted: false,
      reason: 'Missing X OAuth 1.0a credentials (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET).',
    }
  }

  const copy = caseSocialCopy(story, siteUrl)
  const campaign = buildCaseCardCampaign(story, siteUrl)
  const lead = buildCaseCardLead(story)
  let imageBase64 = null
  try {
    imageBase64 = renderHeroCardPngBase64(campaign, lead)
  } catch {
    imageBase64 = null
  }

  const tweet = await postTweetWithOptionalImage(env, copy.x, imageBase64)
  return {
    posted: true,
    has_image: Boolean(imageBase64),
    tweet_id: tweet?.data?.id || null,
  }
}

/**
 * Post Discord (PNG preferred), X, and Substack after a case is published.
 * Failures are returned, never thrown, so publish still succeeds.
 */
export async function distributePublishedCase(env, story) {
  const siteUrl = String(env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
  const result = {
    discord: { posted: false },
    x: { posted: false },
    substack: { posted: false },
    copy: caseSocialCopy(story, siteUrl),
  }

  try {
    result.discord = await postCaseDiscord(env, story, siteUrl)
  } catch (error) {
    result.discord = { posted: false, reason: error instanceof Error ? error.message : String(error) }
  }

  try {
    result.x = await postCaseX(env, story, siteUrl)
  } catch (error) {
    result.x = { posted: false, reason: error instanceof Error ? error.message : String(error) }
  }

  try {
    result.substack = await publishCaseToSubstack(env, story, siteUrl)
  } catch (error) {
    result.substack = {
      posted: false,
      reason: error instanceof Error ? error.message : String(error),
    }
  }

  return result
}
