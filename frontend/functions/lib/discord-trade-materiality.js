/**
 * Discord trade materiality: dollar/severity threshold or cluster-buy.
 * Raw Form 4 / STOCK Act firehose is too noisy for #alpha-feed and #congress-and-insiders.
 * WARN notices are not gated here — they post wide open on #mass-layoffs.
 */

import { isEgregiousTradeCaseCandidate } from './case-draft-generator.js'

export const DISCORD_TRADE_TYPES = Object.freeze(['form_4', 'congress_trade'])

export function discordTradeMaterialityOptions(env = {}) {
  const form4MinAmount = Number(env.DISCORD_TRADE_FORM4_MIN_AMOUNT || env.CASE_DRAFT_FORM4_MIN_AMOUNT || 100_000)
  const congressMinAmount = Number(
    env.DISCORD_TRADE_CONGRESS_MIN_AMOUNT || env.CASE_DRAFT_CONGRESS_MIN_AMOUNT || 50_000,
  )
  const minSeverity = Number(env.DISCORD_TRADE_MIN_SEVERITY || env.CASE_DRAFT_TRADE_MIN_SEVERITY || 78)
  const clusterMin = Number(env.DISCORD_CLUSTER_BUY_MIN || 3)
  const clusterDays = Number(env.DISCORD_CLUSTER_BUY_DAYS || 7)
  return {
    form4MinAmount: Number.isFinite(form4MinAmount) && form4MinAmount > 0 ? form4MinAmount : 100_000,
    congressMinAmount: Number.isFinite(congressMinAmount) && congressMinAmount > 0 ? congressMinAmount : 50_000,
    minSeverity: Number.isFinite(minSeverity) && minSeverity > 0 ? minSeverity : 78,
    clusterMin: Number.isFinite(clusterMin) && clusterMin >= 2 ? Math.floor(clusterMin) : 3,
    clusterDays: Number.isFinite(clusterDays) && clusterDays > 0 ? Math.floor(clusterDays) : 7,
  }
}

export function isDiscordTradeEventType(value) {
  const key = String(value || '')
    .toLowerCase()
    .replaceAll('-', '_')
  return key === 'form_4' || key === 'congress_trade'
}

export function extractTradeTicker(event) {
  const explicit = String(event?.ticker || event?.symbol || '').trim().toUpperCase()
  if (/^[A-Z][A-Z0-9.]{0,4}$/.test(explicit) && explicit !== 'NONE') return explicit
  const blob = `${event?.title || ''} ${event?.summary || ''}`
  const labeled = blob.match(/Ticker on record:\s*([A-Z][A-Z0-9.]{0,4})\b/i)
  if (labeled) return labeled[1].toUpperCase()
  const paren = blob.match(/\(([A-Z][A-Z0-9.]{0,4})\)/)
  return paren ? paren[1].toUpperCase() : ''
}

export function isTradeBuy(event) {
  const blob = `${event?.title || ''} ${event?.summary || ''} ${event?.event_type || ''}`
  if (/Transaction code:\s*S\b/i.test(blob) || /\b(sale|sold)\b/i.test(blob)) return false
  return (
    /Transaction code:\s*P\b/i.test(blob) ||
    /\b(purchase|bought|buy)\b/i.test(blob) ||
    String(event?.event_type || '') === 'congress_trade'
  )
}

function filingDay(event) {
  return String(event?.filing_date || event?.filingDate || event?.trade_date || '').slice(0, 10)
}

export function clusterBuyTickers(events, opts = {}) {
  const { clusterMin, clusterDays } = discordTradeMaterialityOptions(opts)
  const now = opts.now instanceof Date ? opts.now : new Date()
  const cutoffMs = now.getTime() - clusterDays * 86_400_000
  const counts = new Map()

  for (const event of events || []) {
    if (!isDiscordTradeEventType(event?.event_type || event?.recordType)) continue
    if (!isTradeBuy(event)) continue
    const ticker = extractTradeTicker(event)
    if (!ticker) continue
    const day = filingDay(event)
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      const filedMs = Date.parse(`${day}T12:00:00Z`)
      if (Number.isFinite(filedMs) && filedMs < cutoffMs) continue
    }
    counts.set(ticker, (counts.get(ticker) || 0) + 1)
  }

  return new Set([...counts.entries()].filter(([, count]) => count >= clusterMin).map(([ticker]) => ticker))
}

/**
 * @returns {{ material: boolean, reason: 'threshold' | 'cluster_buy' | 'below_threshold' | 'not_a_trade' }}
 */
export function isMaterialDiscordTrade(event, options = {}) {
  const type = String(event?.event_type || event?.recordType || event?.record_type || '')
  if (!isDiscordTradeEventType(type)) {
    return { material: false, reason: 'not_a_trade' }
  }

  const opts = discordTradeMaterialityOptions(options.env || options)
  if (isEgregiousTradeCaseCandidate({ ...event, event_type: type }, opts)) {
    return { material: true, reason: 'threshold' }
  }

  const ticker = extractTradeTicker(event)
  if (!ticker || !isTradeBuy(event)) {
    return { material: false, reason: 'below_threshold' }
  }

  const peers = options.peers || []
  const clustered = clusterBuyTickers([event, ...peers], { ...opts, now: options.now })
  if (clustered.has(ticker)) {
    return { material: true, reason: 'cluster_buy' }
  }

  return { material: false, reason: 'below_threshold' }
}

export function eventFromCaseStory(story) {
  const fields = story?.source_fields || {}
  return {
    event_type: story?.record_type || fields.record_type || fields.event_type,
    recordType: story?.record_type || fields.record_type,
    title: fields.title || story?.headline,
    summary: fields.summary || story?.dek || story?.body,
    amount: fields.amount,
    severity: fields.severity ?? story?.source_fields?.severity,
    ticker: fields.ticker,
    filing_date: fields.filing_date,
  }
}
