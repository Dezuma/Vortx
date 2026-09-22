import { filterHighlyRecognized } from './brand-recognition.js'
import { filterByMarketingDedup, marketingDedupDays } from './marketing-dedup.js'
import { playbookHashtags } from './social-playbook.js'

const DEFAULT_TREND_FALLBACK = [
  'layoffs',
  'bankruptcy',
  'commercial real estate',
  'interest rates',
  'tariffs',
  'supply chain',
  'restructuring',
  'creditor',
  'WARN notice',
  'foreclosure',
]

const RECORD_TYPE_TREND_HINTS = {
  warn_notice: ['layoff', 'layoffs', 'jobs', 'workforce', 'hiring', 'unemployment', 'recession', 'warn'],
  bankruptcy_chapter_11: ['bankruptcy', 'restructuring', 'chapter 11', 'debt', 'creditor', 'default'],
  bankruptcy_chapter_7: ['bankruptcy', 'liquidation', 'closure', 'creditor'],
  bankruptcy_docket: ['bankruptcy', 'pacer', 'court', 'filing', 'debt'],
  mechanics_lien: ['construction', 'contractor', 'lien', 'real estate', 'housing'],
  notice_of_intent: ['lien', 'contractor', 'construction', 'creditor'],
  civil_docket: ['lawsuit', 'litigation', 'court', 'legal'],
}

const NAME_INDUSTRY_TERMS = [
  ['construction', 'construction', 'contractor', 'building', 'harbor', 'roofing'],
  ['medical', 'health', 'hospital', 'clinic', 'pharma'],
  ['retail', 'store', 'restaurant', 'food', 'grocery', 'car wash', 'auto'],
  ['logistics', 'trucking', 'freight', 'transport', 'shipping'],
  ['energy', 'oil', 'gas', 'solar', 'power'],
  ['tech', 'software', 'systems', 'digital', 'data'],
  ['real estate', 'properties', 'holdings', 'realty', 'apartment'],
  ['bank', 'capital', 'financial', 'credit', 'lending'],
]

const US_STATE_NAMES = {
  AL: 'alabama',
  AK: 'alaska',
  AZ: 'arizona',
  AR: 'arkansas',
  CA: 'california',
  CO: 'colorado',
  CT: 'connecticut',
  DE: 'delaware',
  FL: 'florida',
  GA: 'georgia',
  IL: 'illinois',
  IN: 'indiana',
  MA: 'massachusetts',
  MI: 'michigan',
  NY: 'new york',
  OH: 'ohio',
  PA: 'pennsylvania',
  TX: 'texas',
  WA: 'washington',
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const NON_BUSINESS_TREND =
  /republican|democrat|nominee|election|runoff|nba|nfl|mlb|jersey|weather|celebrity|author|endorse|finals|playoffs|murphy|patchett|hilton|obama|kanye|oprah|musk|taylor swift|world cup|tanner scott|t\.?\s*j\.?\s*watt|alex warren|trump|stroke|storm|amanda|solar energy/i

function isBusinessRelevantTrend(term) {
  const normalized = normalizeText(term)
  if (!normalized) return false
  if (NON_BUSINESS_TREND.test(normalized)) return false
  if (
    /layoff|job|warn|bankrupt|lien|foreclos|housing|mortgage|rate|tariff|recession|debt|creditor|lawsuit|court|filing|construction|retail|energy|union|strike|default|restruct|pacer|dol|receiver|commercial|real estate|supply|vendor|contractor|distribut|manufactur|liquidat|chapter/.test(
      normalized,
    )
  ) {
    return true
  }
  if (/stock|share|nasdaq|dow|crypto|bitcoin|etf/.test(normalized)) return false
  if (/^[a-z]{2,5}$/.test(normalized.replace(/\s+/g, ''))) return false
  return false
}

export function filterBusinessTrends(terms) {
  const business = (terms || []).filter((term) => isBusinessRelevantTrend(term))
  return business.length ? business : dedupeTerms([...(terms || []), ...DEFAULT_TREND_FALLBACK]).filter((t) =>
    isBusinessRelevantTrend(t),
  )
}

function dedupeTerms(terms) {
  const seen = new Set()
  const out = []
  for (const term of terms) {
    const key = normalizeText(term)
    if (!key || key.length < 2 || seen.has(key)) continue
    seen.add(key)
    out.push(String(term).trim())
  }
  return out
}

function parseGoogleTrendsRss(xml) {
  const terms = []
  for (const match of String(xml || '').matchAll(/<title>(?:<!\[CDATA\[)?([^<\]]+?)(?:\]\]>)?<\/title>/gi)) {
    const title = String(match[1] || '').trim()
    if (!title || /daily search trends/i.test(title)) continue
    terms.push(title)
  }
  return terms
}

function frictionScore(signal) {
  const score = Number(signal?.score)
  const severity = Number(signal?.severity)
  if (Number.isFinite(score) && score > 0) return Math.round(Math.min(100, score))
  if (Number.isFinite(severity) && severity > 0) return Math.round(Math.min(100, severity))
  return 0
}

function stateCodeFromJurisdiction(jurisdiction) {
  const text = String(jurisdiction || '').trim()
  const us = text.match(/^US[-/]([A-Z]{2})$/i)
  if (us) return us[1].toUpperCase()
  if (/^[A-Z]{2}$/.test(text)) return text.toUpperCase()
  return null
}

function signalSearchBlob(signal) {
  const state = stateCodeFromJurisdiction(signal?.jurisdiction)
  const stateName = state ? US_STATE_NAMES[state] : ''
  return normalizeText(
    [
      signal?.name,
      signal?.recordType,
      signal?.record_type,
      signal?.event_type,
      signal?.jurisdiction,
      state,
      stateName,
      signal?.summary,
      signal?.workers ? `${signal.workers} workers` : '',
    ].join(' '),
  )
}

function trendTokens(term) {
  const normalized = normalizeText(term)
  if (!normalized) return []
  const words = normalized.split(' ').filter((word) => word.length > 2)
  return [normalized, ...words]
}

export function getCandidatePool(stats) {
  const seen = new Set()
  const pool = []
  const add = (signal) => {
    if (!signal?.name) return
    const slug = signal.slug || normalizeText(signal.name).replace(/\s+/g, '-')
    if (seen.has(slug)) return
    seen.add(slug)
    pool.push({ ...signal, slug })
  }
  for (const signal of stats?.signalCandidates || []) add(signal)
  for (const key of ['warn', 'bankruptcy', 'spotlight']) add(stats?.[key])
  return pool
}

export function scoreSignalAgainstTrends(signal, trends) {
  const terms = trends?.terms || []
  if (!terms.length) return 0
  const blob = signalSearchBlob(signal)
  if (!blob) return 0

  let score = 0
  const matched = new Set()

  for (const term of terms) {
    for (const token of trendTokens(term)) {
      if (token.length < 3) continue
      if (blob.includes(token)) {
        const weight = token.includes(' ') ? 18 : Math.min(14, 4 + token.length)
        score += weight
        matched.add(token)
      }
    }
  }

  const eventType = String(signal?.event_type || signal?.recordType || '').toLowerCase()
  for (const [typeKey, hints] of Object.entries(RECORD_TYPE_TREND_HINTS)) {
    if (!eventType.includes(typeKey.replace(/_/g, '')) && !eventType.includes(typeKey)) continue
    for (const hint of hints) {
      if (matched.has(hint)) continue
      for (const term of terms) {
        if (normalizeText(term).includes(hint)) {
          score += 10
          matched.add(hint)
          break
        }
      }
    }
  }

  for (const row of NAME_INDUSTRY_TERMS) {
    const keywords = row.slice(1)
    if (!keywords.some((word) => blob.includes(word))) continue
    for (const term of terms) {
      const normalized = normalizeText(term)
      if (keywords.some((word) => normalized.includes(word))) {
        score += 12
        break
      }
    }
  }

  const state = stateCodeFromJurisdiction(signal?.jurisdiction)
  if (state) {
    for (const term of terms) {
      const normalized = normalizeText(term)
      if (normalized.includes(state.toLowerCase()) || normalized.includes(US_STATE_NAMES[state] || '')) {
        score += 16
        break
      }
    }
  }

  return score
}

export function pickTrendAlignedLead(stats, trends, fallback, options = {}) {
  let pool = filterHighlyRecognized(getCandidatePool(stats))
  if (options.postHistory != null) {
    pool = filterByMarketingDedup(
      pool,
      options.postHistory,
      options.dedupDays ?? marketingDedupDays(options.env),
    )
  }
  if (!pool.length) return null

  const terms = trends?.terms || []
  const day = Number.isFinite(options.rotationDay)
    ? options.rotationDay
    : Math.floor(Date.now() / 86_400_000)
  const offset = Number(options.rotationOffset || 0)
  const cap = Math.max(3, Math.min(Number(options.candidateCap || 14), pool.length))

  const ranked = pool
    .map((signal) => {
      const trendScore = terms.length ? scoreSignalAgainstTrends(signal, trends) : 0
      const friction = frictionScore(signal)
      const recency =
        String(signal.filingDate || '').slice(0, 10) >=
        new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10)
          ? 8
          : 0
      return {
        signal,
        trendScore,
        combined: trendScore * 100 + friction + recency,
      }
    })
    .sort((a, b) => b.combined - a.combined)

  if (terms.length && ranked[0]?.trendScore <= 0) {
    return ranked[0]?.signal || null
  }

  const idx = (day + offset) % cap
  return ranked[idx]?.signal || ranked[0]?.signal || null
}

const TRENDY_TAG_MAP = [
  [/layoff/i, '#Layoffs'],
  [/bankrupt/i, '#Bankruptcy'],
  [/commercial real estate/i, '#CommercialRealEstate'],
  [/interest rate/i, '#InterestRates'],
  [/tariff/i, '#Tariffs'],
  [/restruct/i, '#Restructuring'],
  [/supply chain/i, '#SupplyChain'],
  [/foreclos/i, '#Foreclosure'],
  [/creditor/i, '#Creditors'],
  [/warn/i, '#WARN'],
  [/lien/i, '#Liens'],
  [/due diligence/i, '#DueDiligence'],
]

/** One catchy hashtag tied to what is trending today (always included in X posts). */
export function pickTrendyHashtag(trends) {
  const terms = filterBusinessTrends([...(trends?.terms || []), ...DEFAULT_TREND_FALLBACK])
  for (const term of terms) {
    const normalized = normalizeText(term)
    if (!normalized || !isBusinessRelevantTrend(term)) continue
    for (const [pattern, tag] of TRENDY_TAG_MAP) {
      if (pattern.test(normalized)) return tag
    }
    const tag = toHashtag(term)
    if (tag && tag.length >= 4 && tag.length <= 24) return tag
  }
  const day = Math.floor(Date.now() / 86_400_000)
  const fallbacks = ['#DueDiligence', '#PublicRecords', '#RiskManagement', '#OpenData']
  return fallbacks[day % fallbacks.length]
}

export function toHashtag(label) {
  const cleaned = String(label || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
  if (!cleaned) return ''
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 4)
  if (!words.length) return ''
  const tag =
    words.length === 1
      ? words[0]
      : words.map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase()).join('')
  if (tag.length < 3 || tag.length > 32) return ''
  return `#${tag}`
}

export function buildTrendHashtags(signal, trends, options = {}) {
  const maxTags = Math.min(Number(options.maxTags || 2), 2)
  const tags = []
  const seen = new Set()
  const add = (tag) => {
    const normalized = String(tag || '').toLowerCase()
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    tags.push(tag)
  }

  add(pickTrendyHashtag(trends))

  const blob = signalSearchBlob(signal)
  const eventType = String(signal?.event_type || '').toLowerCase()
  if (/warn/.test(eventType) || /warn/.test(blob)) add('#WARN')
  else if (/bankruptcy|chapter|docket/.test(eventType) || /bankruptcy/.test(blob)) add('#Bankruptcy')
  else if (/lien|ucc|mechanics/.test(eventType) || /lien/.test(blob)) add('#Liens')

  if (tags.length < maxTags) add('#PublicRecords')

  return tags.slice(0, maxTags).join(' ')
}

export function appendTrendHashtags(text, hashtagLine, maxLength = 280) {
  const base = String(text || '').trim()
  const tags = String(hashtagLine || '').trim()
  if (!tags) return base
  if (base.includes('#')) {
    const merged = `${base} ${tags}`.replace(/\s+/g, ' ').trim()
    return merged.length <= maxLength ? merged : base
  }
  const withTags = `${base}\n\n${tags}`
  if (withTags.length <= maxLength) return withTags

  const parts = base.split('\n\n')
  const ctaPart = parts.pop() || ''
  const headPart = parts.shift() || ''
  const bodyPart = parts.join('\n\n')
  const budget = Math.max(20, maxLength - headPart.length - ctaPart.length - tags.length - 8)
  const trimmedBody = bodyPart.length > budget ? `${bodyPart.slice(0, budget - 1)}…` : bodyPart
  return [headPart, trimmedBody, ctaPart, tags].filter(Boolean).join('\n\n')
}

export async function fetchTrendingTopics(env) {
  const extra = String(env.MARKETING_TREND_KEYWORDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const geo = String(env.MARKETING_TRENDS_GEO || 'US').trim() || 'US'
  let rssTerms = []
  let source = 'fallback'

  if (!bool(env.MARKETING_TRENDS_DISABLED, false)) {
    try {
      const response = await fetch(`https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`, {
        headers: {
          'user-agent': 'VortxMarketingBot/1.0 (+https://vortxmkt.com)',
          accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        cf: { cacheTtl: 1800, cacheEverything: true },
      })
      if (response.ok) {
        rssTerms = parseGoogleTrendsRss(await response.text())
        if (rssTerms.length) source = 'google_trends_rss'
      }
    } catch {
      // use fallbacks below
    }
  }

  const merged = dedupeTerms([...extra, ...rssTerms, ...DEFAULT_TREND_FALLBACK])
  const terms = filterBusinessTrends(merged).slice(0, 30)
  return {
    terms,
    source,
    geo,
    fetchedAt: new Date().toISOString(),
  }
}

function bool(value, fallback = false) {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

export async function attachTrendingLead(stats, env, campaign, fallback) {
  const trending = await fetchTrendingTopics(env)
  const pickOptions = {
    rotationDay: campaign?.rotationDay,
    rotationOffset: campaign?.rotationOffset ?? env?.MARKETING_BOT_ROTATION_OFFSET,
    candidateCap: campaign?.candidateCap,
    postHistory: campaign?.postHistory,
    dedupDays: campaign?.dedupDays ?? marketingDedupDays(env),
    env,
  }
  const lead = pickTrendAlignedLead(stats, trending, fallback, pickOptions)
  const trendHashtags = playbookHashtags(lead, { maxTags: 2 })
  const trendScore = lead ? scoreSignalAgainstTrends(lead, trending) : 0
  return {
    trending,
    lead,
    trendHashtags,
    trendScore,
    matchedTrending: trendScore > 0,
  }
}
