const DEFAULT_SITE = 'https://vortxmkt.com'
const DEFAULT_CONFIDENCE = 86
const SCORE_BAR_WIDTH = 10
/** Override webhook display name so Discord never shows a stale typo like "Singal". */
export const DISCORD_BOT_USERNAME = 'Vortx Signal Bot'
/** Discord MessageFlags.SUPPRESS_EMBEDS — stop truncated OG unfurls fighting our caption. */
const DISCORD_SUPPRESS_EMBEDS = 1 << 2

function frictionScoreValue(signal) {
  // Keep identical to discord-free-alpha signalScoreValue: score, then severity. Never confidence.
  if (!signal) return 0
  const score = Number(signal.score)
  const severity = Number(signal.severity)
  if (Number.isFinite(score) && score > 0) return Math.round(Math.min(100, score))
  if (Number.isFinite(severity) && severity > 0) return Math.round(Math.min(100, severity))
  return 0
}

export function discordSignalType(eventType, recordType) {
  const raw = `${String(eventType || '')} ${String(recordType || '')}`.toLowerCase()
  if (/form_4|insider/.test(raw)) return 'Form 4 insider'
  if (/congress|stock.?act/.test(raw)) return 'STOCK Act disclosure'
  if (/institutional_13f|13f/.test(raw)) return '13F holdings'
  if (/warn/.test(raw)) return 'WARN Notice'
  if (/bankruptcy|chapter|docket|adversary|receivership|recap/.test(raw)) return 'Bankruptcy docket'
  if (/lien|ucc|mechanics|secured|judgment/.test(raw)) return 'Lien cluster'
  if (/notice|pre.?suit|intent|civil/.test(raw)) return 'Pre-suit notice'
  const label = String(recordType || 'public record').replaceAll('_', ' ').trim()
  if (/form.?4|insider/i.test(label)) return 'Form 4 insider'
  if (/congress|stock.?act/i.test(label)) return 'STOCK Act disclosure'
  if (/13f|institutional/i.test(label)) return '13F holdings'
  if (/warn/i.test(label)) return 'WARN Notice'
  if (/bankruptcy|docket/i.test(label)) return 'Bankruptcy docket'
  if (/lien/i.test(label)) return 'Lien cluster'
  if (/notice/i.test(label)) return 'Pre-suit notice'
  return label ? label.replace(/\b\w/g, (char) => char.toUpperCase()) : 'Public record'
}

export function discordSignalState(jurisdiction) {
  const text = String(jurisdiction || '').trim()
  if (!text || /^https?:\/\//i.test(text)) return 'Federal'
  const usState = text.match(/^US[-/]([A-Z]{2})$/i)
  if (usState) return usState[1].toUpperCase()
  if (/^[A-Z]{2}$/.test(text)) return text
  if (/bankruptcy|federal|pacer|us\b/i.test(text)) return 'Federal'
  return text.replace(/^US[-\s]*/i, '').slice(0, 32) || 'US'
}

export function discordSignalSource(eventType, recordType) {
  const raw = `${String(eventType || '')} ${String(recordType || '')}`.toLowerCase()
  if (/warn|dol|workforce|layoff/.test(raw)) return 'State DOL'
  if (/lien|ucc|mechanics|county|recorder|secured/.test(raw)) return 'County recorder'
  return 'Federal PACER'
}

export function discordScoreLabel(score) {
  const value = Math.round(Math.min(100, Math.max(0, Number(score) || 0)))
  if (value >= 80) return 'Urgent review'
  if (value >= 65) return 'Building pressure'
  return 'Monitor'
}

export function discordScoreBar(score, width = SCORE_BAR_WIDTH) {
  const value = Math.min(100, Math.max(0, Number(score) || 0))
  const filled = Math.round((value / 100) * width)
  return `${'▓'.repeat(filled)}${'░'.repeat(Math.max(0, width - filled))}`
}

export function maskEntityName(name) {
  const text = String(name || 'Entity').trim()
  const suffixMatch = text.match(
    /\s+(LLC|L\.L\.C\.|Inc\.?|Corp\.?|Corporation|Company|Co\.|Ltd\.?|LP|LLP|PLLC|Holdings|Group)\s*$/i,
  )
  const suffix = suffixMatch ? ` ${suffixMatch[1].replace(/\s+/g, ' ').trim()}` : ''
  const base = suffixMatch ? text.slice(0, -suffixMatch[0].length).trim() : text
  const length = Math.min(14, Math.max(6, Math.ceil(base.replace(/[^a-z0-9]/gi, '').length * 0.55)))
  return `${'█'.repeat(length)}${suffix}`
}

function headerDate(date) {
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) {
    return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  }
  return value.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function filingDateLabel(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return String(value || 'recent')
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function confidencePercent(signal) {
  const value = Number(signal?.confidence)
  if (Number.isFinite(value) && value > 0) return Math.round(Math.min(100, value))
  const score = frictionScoreValue(signal)
  if (score >= 80) return 92
  if (score >= 65) return 88
  return DEFAULT_CONFIDENCE
}

/**
 * Relief-framed drop for segmented ACCESS_FREE_ALPHA channels (#mass-layoffs, #bankruptcy-watch).
 * @param {{ signal?: object, siteUrl?: string, date?: Date, channelLabel?: string, channelHashtag?: string, reliefHeadline?: string }} options
 */
export function formatDiscordReliefDrop(options = {}) {
  const signal = options.signal || {}
  const siteUrl = String(options.siteUrl || DEFAULT_SITE).replace(/\/$/, '')
  const score = frictionScoreValue(signal)
  const eventType = signal.eventType || signal.event_type || null
  const recordType = signal.recordType || signal.record_type || 'public record'
  const typeLabel = discordSignalType(eventType, recordType)
  const stateLabel = discordSignalState(signal.jurisdiction)
  const filedLabel = filingDateLabel(signal.filingDate || signal.filing_date)
  const sourceLabel = discordSignalSource(eventType, recordType)
  const scoreLabel = discordScoreLabel(score)
  const bar = discordScoreBar(score)
  const entityLine = maskEntityName(signal.name)
  const confidence = confidencePercent(signal)
  const channelLabel = String(options.channelLabel || 'Signal').trim()
  const reliefHeadline = String(options.reliefHeadline || 'Subscribers saw this before the headline.').trim()
  const hashtagLine = String(options.channelHashtag || '#signals').trim()

  return [
    `📡 ${channelLabel.toUpperCase()}; ${headerDate(options.date)}`,
    '',
    reliefHeadline,
    '',
    `TYPE: ${typeLabel}`,
    `STATE: ${stateLabel}`,
    `FILED: ${filedLabel}`,
    `SOURCE: ${sourceLabel} · Verified`,
    `SCORE: ${score > 0 ? score : 'n/a'} / 100 · ${scoreLabel}`,
    `CONFIDENCE: ${confidence}%`,
    '',
    bar,
    '',
    `Entity name: ${entityLine}`,
    `→ Unlock at ${siteUrl.replace(/^https?:\/\//, '')}`,
    '',
    hashtagLine,
  ].join('\n')
}

/**
 * Daily Discord signal drop ; fixed layout for #signals channel.
 * @param {{ signal?: object, siteUrl?: string, date?: Date, eventType?: string }} options
 */
export function formatDiscordSignalDrop(options = {}) {
  const signal = options.signal || {}
  const siteUrl = String(options.siteUrl || DEFAULT_SITE).replace(/\/$/, '')
  const score = frictionScoreValue(signal)
  const eventType = options.eventType || signal.eventType || signal.event_type || null
  const recordType = signal.recordType || signal.record_type || 'public record'
  const typeLabel = discordSignalType(eventType, recordType)
  const stateLabel = discordSignalState(signal.jurisdiction)
  const filedLabel = filingDateLabel(signal.filingDate || signal.filing_date)
  const sourceLabel = discordSignalSource(eventType, recordType)
  const scoreLabel = discordScoreLabel(score)
  const bar = discordScoreBar(score)
  const entityLine = maskEntityName(signal.name)
  const confidence = confidencePercent(signal)
  const hashtagLine = String(options.hashtags || '#signals #publicrecord').trim() || '#signals #publicrecord'
  const trendLine =
    Array.isArray(options.trendingTerms) && options.trendingTerms.length
      ? `TREND ALIGN: ${options.trendingTerms.join(' · ')}`
      : null

  return [
    `⚡ SIGNAL DROP; ${headerDate(options.date)}`,
    ``,
    `TYPE: ${typeLabel}`,
    `STATE: ${stateLabel}`,
    `FILED: ${filedLabel}`,
    `SOURCE: ${sourceLabel} · Verified`,
    `SCORE: ${score > 0 ? score : 'n/a'} / 100 · ${scoreLabel}`,
    `CONFIDENCE: ${confidence}%`,
    trendLine,
    ``,
    `${bar}`,
    ``,
    `Entity name: ${entityLine}`,
    `→ Unlock at ${siteUrl.replace(/^https?:\/\//, '')}`,
    ``,
    hashtagLine,
  ]
    .filter(Boolean)
    .join('\n')
}

function base64ToBytes(base64) {
  const binary = atob(String(base64 || ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function readDiscordWebhookResponse(response) {
  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }
  if (!response.ok) {
    throw new Error(payload?.message || payload?.raw || `Discord webhook ${response.status}`)
  }
  return payload
}

function discordWebhookPayload(content) {
  return {
    content: String(content || '').trim().slice(0, 2000),
    username: DISCORD_BOT_USERNAME,
    allowed_mentions: { parse: [] },
    flags: DISCORD_SUPPRESS_EMBEDS,
  }
}

export async function postDiscordWebhook(webhookUrl, content) {
  const url = String(webhookUrl || '').trim()
  if (!url) throw new Error('DISCORD_WEBHOOK_URL is not set.')
  const body = String(content || '').trim()
  if (!body) throw new Error('Discord message is empty.')

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(discordWebhookPayload(body)),
  })
  return readDiscordWebhookResponse(response)
}

export async function postDiscordWebhookWithImage(webhookUrl, content, imageBase64, filename = 'vortx-signal.png') {
  const url = String(webhookUrl || '').trim()
  if (!url) throw new Error('Discord webhook URL is not set.')
  const caption = String(content || '').trim()
  if (!caption) throw new Error('Discord message is empty.')
  if (!imageBase64) throw new Error('Discord image payload is empty.')

  const form = new FormData()
  form.append('payload_json', JSON.stringify(discordWebhookPayload(caption)))
  form.append('files[0]', new Blob([base64ToBytes(imageBase64)], { type: 'image/png' }), filename)

  const response = await fetch(url, { method: 'POST', body: form })
  return readDiscordWebhookResponse(response)
}
