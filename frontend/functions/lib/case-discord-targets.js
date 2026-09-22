/**
 * Map published case record types → Discord channels (Vortx Free Intelligence + The Vault).
 *
 * Free Intelligence: alpha-feed, mass-layoffs, congress-and-insiders, market-chatter
 * The Vault: unfiltered-signals, data-dumps, death-spirals, tactical-playbook
 */

import { eventFromCaseStory, isMaterialDiscordTrade } from './discord-trade-materiality.js'

/** @typedef {{ id: string, label: string, webhookEnv: string, legacyWebhookEnv?: string }} CaseDiscordTarget */

/** @type {Record<string, CaseDiscordTarget>} */
export const CASE_DISCORD_TARGETS = {
  'alpha-feed': {
    id: 'alpha-feed',
    label: 'Alpha Feed',
    webhookEnv: 'DISCORD_ALPHA_FEED_WEBHOOK_URL',
    legacyWebhookEnv: 'DISCORD_WEBHOOK_URL',
  },
  'mass-layoffs': {
    id: 'mass-layoffs',
    label: 'Mass Layoffs',
    webhookEnv: 'DISCORD_MASS_LAYOFFS_WEBHOOK_URL',
  },
  'congress-and-insiders': {
    id: 'congress-and-insiders',
    label: 'Congress and Insiders',
    webhookEnv: 'DISCORD_CONGRESS_INSIDERS_WEBHOOK_URL',
  },
  'market-chatter': {
    id: 'market-chatter',
    label: 'Market Chatter',
    webhookEnv: 'DISCORD_MARKET_CHATTER_WEBHOOK_URL',
  },
  'unfiltered-signals': {
    id: 'unfiltered-signals',
    label: 'Unfiltered Signals',
    webhookEnv: 'DISCORD_UNFILTERED_SIGNALS_WEBHOOK_URL',
  },
  'data-dumps': {
    id: 'data-dumps',
    label: 'Data Dumps',
    webhookEnv: 'DISCORD_DATA_DUMPS_WEBHOOK_URL',
  },
  'death-spirals': {
    id: 'death-spirals',
    label: 'Death Spirals',
    webhookEnv: 'DISCORD_DEATH_SPIRALS_WEBHOOK_URL',
    // Older installs used bankruptcy-watch for distress; reuse if remapped.
    legacyWebhookEnv: 'DISCORD_BANKRUPTCY_WATCH_WEBHOOK_URL',
  },
  'tactical-playbook': {
    id: 'tactical-playbook',
    label: 'Tactical Playbook',
    webhookEnv: 'DISCORD_TACTICAL_PLAYBOOK_WEBHOOK_URL',
  },
  cases: {
    id: 'cases',
    label: 'Cases',
    webhookEnv: 'DISCORD_CASES_WEBHOOK_URL',
    // Delivery fallback (see discordCasesDeliveryConfigured): mass-layoffs → alpha-feed → DISCORD_WEBHOOK_URL
  },
}

function recordKey(story) {
  return String(story?.record_type || story?.source_fields?.record_type || '').toLowerCase()
}

function severityOf(story) {
  const n = Number(story?.source_fields?.severity)
  return Number.isFinite(n) ? n : 0
}

/**
 * Ordered unique channel ids for a published case.
 * Always prefers a dedicated cases webhook when set; also fans out thematically.
 * Trades only reach #alpha-feed / #congress-and-insiders when material.
 */
export function resolveCaseDiscordChannelIds(story, options = {}) {
  const key = recordKey(story)
  const ids = []

  const push = (id) => {
    if (id && !ids.includes(id)) ids.push(id)
  }

  // Dedicated cases channel first when configured (resolved later if webhook missing).
  push('cases')

  if (/warn|layoff|workforce/.test(key)) {
    push('mass-layoffs')
  } else if (/form_4|congress|stock.?act|insider/.test(key) && !/institutional_13f|13f/.test(key)) {
    const gate = isMaterialDiscordTrade(eventFromCaseStory(story), options)
    if (gate.material) {
      push('congress-and-insiders')
      push('alpha-feed')
    }
  } else if (/institutional_13f|13f/.test(key)) {
    push('market-chatter')
  } else if (/bankruptcy|chapter|receivership|adversary/.test(key)) {
    push('death-spirals')
    push('unfiltered-signals')
    push('alpha-feed')
  } else if (/lien|judgment|foreclosure|ucc/.test(key)) {
    push('death-spirals')
    push('market-chatter')
  } else {
    push('market-chatter')
    push('alpha-feed')
  }

  if (severityOf(story) >= 85) {
    push('unfiltered-signals')
    push('tactical-playbook')
  }

  return ids
}

export function webhookForCaseTarget(env, target) {
  if (!target) return ''
  const primary = String(env?.[target.webhookEnv] || '').trim()
  if (primary) return primary
  if (target.legacyWebhookEnv) return String(env?.[target.legacyWebhookEnv] || '').trim()
  return ''
}

/** True when a published case can actually post to Discord (dedicated or fallback). */
export function discordCasesDeliveryConfigured(env) {
  return Boolean(
    webhookForCaseTarget(env, CASE_DISCORD_TARGETS.cases) ||
      webhookForCaseTarget(env, CASE_DISCORD_TARGETS['mass-layoffs']) ||
      webhookForCaseTarget(env, CASE_DISCORD_TARGETS['alpha-feed']) ||
      String(env?.DISCORD_WEBHOOK_URL || '').trim(),
  )
}

/**
 * Concrete webhook posts for a case (skips targets with no webhook).
 * If dedicated cases webhook is missing, alpha-feed / legacy covers the primary slot.
 */
export function resolveCaseDiscordWebhooks(env, story) {
  const channelIds = resolveCaseDiscordChannelIds(story)
  const posts = []
  const seenUrls = new Set()

  for (const id of channelIds) {
    const target = CASE_DISCORD_TARGETS[id]
    if (!target) continue
    let url = webhookForCaseTarget(env, target)
    // Soft fallback: cases → mass-layoffs (layoff desk) → alpha-feed → DISCORD_WEBHOOK_URL
    if (!url && id === 'cases') {
      url =
        webhookForCaseTarget(env, CASE_DISCORD_TARGETS['mass-layoffs']) ||
        webhookForCaseTarget(env, CASE_DISCORD_TARGETS['alpha-feed']) ||
        String(env?.DISCORD_WEBHOOK_URL || '').trim()
    }
    if (!url || seenUrls.has(url)) continue
    seenUrls.add(url)
    posts.push({ channelId: id, label: target.label, webhookUrl: url })
  }

  return posts
}
