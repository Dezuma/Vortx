import {
  FREE_ALPHA_CATEGORY,
  UNLOCK_QUEUE_CATEGORY,
  runAllDiscordChannels,
  runDiscordChannel,
  runDiscordChannelsForCron,
} from './discord-router.js'
import { attachTrendingLead } from './marketing-trends.js'
import { opaqueSignalSlug } from '../frontend/functions/lib/signal-slugs.js'
import {
  buildPlaybookTweet,
  pickPlaybookTemplate,
  playbookHashtags,
  PLAYBOOK_TEMPLATES,
  plainLanguageStake,
} from './social-playbook.js'
import { CARD_HEIGHT, CARD_WIDTH, renderHeroCard } from './hero-card-renderer.js'
import { filterHighlyRecognized, isHighlyRecognizedBrand, recognitionBoost } from './brand-recognition.js'
import {
  filterByMarketingDedup,
  loadMarketingPostHistory,
  marketingDedupDays,
  recordMarketingPost,
} from './marketing-dedup.js'
import { resolveRedditCron, runRedditWeekly } from './reddit-weekly.js'

const DEFAULT_SITE = 'https://vortxmkt.com'
const POST_MAX_LENGTH = 270
const FINANCIAL_SIGNAL_TYPES = new Set([
  'bankruptcy_chapter_11',
  'bankruptcy_chapter_7',
  'bankruptcy_docket',
  'bankruptcy_adversary',
  'receivership',
  'creditor_dispute',
])

const SPOTLIGHT_HOOKS = [
  (name) => `Everyone will talk about ${name} later. The filing is already public.`,
  (name) => `Thread accounts want the story on ${name}. The dated record is already there.`,
  (name) => `You get the name. Subscribers get the source trail on ${name}.`,
  (name) => `This is the receipt people wish they had earlier: ${name}.`,
  (name) => `Headlines arrive late. ${name} hit the public queue first.`,
]

const SPOTLIGHT_BODIES = [
  (stats) => {
    const sp = stats.spotlight
    const score = scoreText(null, sp)
    return `Free: type · date · jurisdiction · score ${score}/100.\nLocked: source URL · timeline · watchlists · exports.\n${stats.eventCount} records moving;want the next one? Research only.`
  },
  (stats) => {
    const sp = stats.spotlight
    return `${sp.recordType} · filed ${sp.filingDate}.\n${stats.financialSignalCount} distress signals in queue right now.\nFull docket inside;not trading advice.`
  },
  (stats) => {
    const sp = stats.spotlight
    return `Score ${scoreText(null, sp)} on ${sp.name}.\nYou see the friction. Subscribers see the proof.\nUnlock alerts + CSV before the next drop. Research only.`
  },
  (stats) => {
    const sp = stats.spotlight
    return `${displayJurisdiction(sp.jurisdiction)} · ${sp.recordType} · ${sp.filingDate}.\nTeaser is free. Source trail is not.\nTap through if you want the receipt. Research only.`
  },
]

const CAMPAIGN_CTAS = [
  'Unlock the source trail',
  'See the full timeline',
  'Get the locked filing',
  'Open before the next drop',
]

const POST_FORMATS = PLAYBOOK_TEMPLATES
const BASE_ENGAGEMENT_HASHTAGS = playbookHashtags(null)

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  })
}

function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i]
  return diff === 0
}

function authorizedRunToken(request, env) {
  const expected = String(env.MARKETING_BOT_RUN_TOKEN || '')
  const provided = request.headers.get('x-run-token') || ''
  if (!expected || !provided) return false
  return timingSafeEqualString(provided, expected)
}

function bool(value, fallback = false) {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function percentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

function nonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hmacSha1(key, value) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

async function oauthHeader(env, method, rawUrl, extraParams = {}) {
  const url = new URL(rawUrl)
  const oauthParams = {
    oauth_consumer_key: env.X_API_KEY,
    oauth_nonce: nonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_token: env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
  }

  const params = new URLSearchParams(url.search)
  for (const [key, value] of Object.entries(extraParams)) {
    params.append(key, value)
  }
  for (const [key, value] of Object.entries(oauthParams)) {
    params.append(key, value)
  }

  const normalizedParams = [...params.entries()]
    .sort(([aKey, aValue], [bKey, bValue]) =>
      aKey === bKey ? String(aValue).localeCompare(String(bValue)) : String(aKey).localeCompare(String(bKey)),
    )
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&')

  const baseUrl = `${url.origin}${url.pathname}`
  const baseString = [method.toUpperCase(), percentEncode(baseUrl), percentEncode(normalizedParams)].join('&')
  const signingKey = `${percentEncode(env.X_API_SECRET)}&${percentEncode(env.X_ACCESS_TOKEN_SECRET)}`
  const signature = await hmacSha1(signingKey, baseString)

  return `OAuth ${Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(', ')}`
}

function hasOAuth1(env) {
  return Boolean(env.X_API_KEY && env.X_API_SECRET && env.X_ACCESS_TOKEN && env.X_ACCESS_TOKEN_SECRET)
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload?.message || payload?.error || `GET ${url} failed: ${response.status}`)
  return payload
}

function supabaseUrl(env) {
  return String(env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '')
}

function supabaseServiceKey(env) {
  return String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
}

function hasSupabase(env) {
  return Boolean(supabaseUrl(env) && supabaseServiceKey(env))
}

async function supabaseRest(env, path) {
  const response = await fetch(`${supabaseUrl(env)}/rest/v1/${path}`, {
    headers: {
      apikey: supabaseServiceKey(env),
      authorization: `Bearer ${supabaseServiceKey(env)}`,
      accept: 'application/json',
    },
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(payload?.message || payload?.hint || `Supabase REST ${response.status}`)
  }
  return payload
}

function humanRecordType(value) {
  return String(value || 'public record').replaceAll('_', ' ').trim()
}

function companyDisplayName(value, max = 44) {
  return sanitizeText(String(value || 'Spotlight company'), max)
}

function signalScoreValue(signal) {
  // Must match discord-free-alpha.js: score, then severity. Never confidence,
  // or the card number will not match the caption score.
  if (!signal) return 0
  const score = Number(signal.score)
  const severity = Number(signal.severity)
  if (Number.isFinite(score) && score > 0) return Math.round(Math.min(100, score))
  if (Number.isFinite(severity) && severity > 0) return Math.round(Math.min(100, severity))
  return 0
}

function scoreText(value, signal = null) {
  const number = signal ? signalScoreValue(signal) : signalScoreValue({ score: value })
  if (number > 0) return String(Math.round(Math.min(100, number)))
  return 'queued'
}

function cardLeadForCampaign(stats, campaign) {
  const warn = stats.warn
  const bankruptcy = stats.bankruptcy
  const spotlight = stats.spotlight
  const format = campaign?.format || ''

  if (format === 'template-6' || format === 'template-12') return warn || bankruptcy || spotlight
  if (format === 'template-7' || format === 'template-15') return bankruptcy || warn || spotlight
  if (format === 'template-11') return warn || spotlight
  if (format === 'template-1' || format === 'template-4' || format === 'template-10' || format === 'template-16') {
    return warn || spotlight
  }

  const pool = [warn, bankruptcy, spotlight].filter(Boolean)
  pool.sort((a, b) => signalScoreValue(b) - signalScoreValue(a))
  return pool[0] || spotlight
}

function cardScorePanel(lead, stats) {
  const score = signalScoreValue(lead)
  if (score >= 80) {
    return {
      main: String(Math.round(Math.min(100, score))),
      sub: 'HIGH FRICTION',
      scale: 15,
      urgency: score,
      accent: [255, 118, 72],
      border: [255, 92, 48],
    }
  }
  if (score >= 65) {
    return {
      main: String(Math.round(Math.min(100, score))),
      sub: 'ELEVATED SIGNAL',
      scale: 14,
      urgency: score,
      accent: [255, 196, 72],
      border: [255, 168, 48],
    }
  }
  if (score > 0) {
    return {
      main: String(Math.round(Math.min(100, score))),
      sub: 'FRICTION SCORE',
      scale: 15,
      urgency: score,
      accent: [72, 255, 155],
      border: [72, 255, 155],
    }
  }
  const workers = String(lead?.workers || '').replace(/,/g, '')
  if (workers && /^\d+$/.test(workers)) {
    return {
      main: workers,
      sub: 'WORKFORCE ALERT',
      scale: workers.length > 3 ? 11 : 14,
      urgency: 72,
      accent: [255, 196, 72],
      border: [255, 168, 48],
    }
  }
  const queue = Math.min(999, Number(stats.eventCount) || 0)
  if (queue > 0) {
    return {
      main: String(queue),
      sub: 'RECORDS SURFACED',
      scale: queue > 99 ? 11 : 14,
      urgency: 55,
      accent: [120, 190, 255],
      border: [90, 200, 255],
    }
  }
  return {
    main: 'LIVE',
    sub: 'QUEUE MOVING',
    scale: 12,
    urgency: 50,
    accent: [72, 255, 155],
    border: [72, 255, 155],
  }
}

function displayDate(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return String(value || 'recent')
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
}

function compactDate(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return String(value || 'recent')
  return date.toISOString().slice(0, 10)
}

function workerCountFromSummary(value) {
  const match = String(value || '').match(/affected employees:\s*([0-9,]+)/i)
  return match ? match[1].replace(/,/g, '') : null
}

function safeCompanyName(value, max = 58) {
  return companyDisplayName(String(value || '').split('(')[0], max).trim()
}

function questionFor(stats) {
  const sp = stats.spotlight
  const questions = [
    `If ${sp?.name || 'this company'} hit your vendor list, what would you check first: source doc, timeline, or related entities?`,
    `What would you do if you saw this source record before it became part of the recap?`,
    `Would you rather see one verified source document or ten recycled posts about it later?`,
    `If a ${sp?.recordType || 'public record'} appears before the story, who on your team should see it first?`,
  ]
  return questions[rotationIndex({ MARKETING_BOT_ROTATION_OFFSET: Number(stats.eventCount || 0) }, questions.length)]
}

function isLikelyBusinessEntityName(value) {
  const name = String(value || '').trim()
  if (name.length < 3) return false
  if (/\s+v[.]?\s+/i.test(name)) return false
  if (/\bplaintiff|defendant|debtor no\.|case no\.|estate of\b/i.test(name)) return false
  return /\b(llc|l\.l\.c\.|inc|inc\.|corp|corporation|company|co\.|ltd|lp|l\.p\.|llp|pllc|bank|holdings|group|services|systems|construction|partners|capital|energy|logistics|medical|health|restaurant|retail|manufacturing|properties|enterprises)\b/i.test(name)
}

function rotationIndex(env, length) {
  if (!length) return 0
  const day = Math.floor(Date.now() / 86_400_000)
  const offset = Number(env.MARKETING_BOT_ROTATION_OFFSET || 0) || 0
  return (day + offset) % length
}

function cutoffDateIso(days = 90) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

async function fetchSpotlightEntity(env, feed, options = {}) {
  const activeIds = new Set((feed.events || []).map((event) => event.entity_id))
  const fallbackCandidates = (feed.entities || [])
    .filter((entity) => activeIds.has(entity.id))
    .filter((entity) => isLikelyBusinessEntityName(entity.canonical_name))
    .sort((a, b) => (b.latest_score || 0) - (a.latest_score || 0))

  function spotlightFromFeedEntity(entity) {
    if (!entity) return null
    const events = (feed.events || [])
      .filter((event) => event.entity_id === entity.id)
      .sort((a, b) => String(b.filing_date || '').localeCompare(String(a.filing_date || '')))
    const latest = events[0]
    return {
      name: companyDisplayName(entity.canonical_name, 48),
      entity_id: entity.id,
      slug: opaqueSignalSlug(entity.id),
      score: Number(entity.latest_score || 0),
      ticker: entity.ticker || null,
      event_type: latest?.event_type || null,
      recordType: humanRecordType(latest?.event_type),
      jurisdiction: displayJurisdiction(latest?.jurisdiction || entity.jurisdiction),
      filingDate: latest?.filing_date || 'recent',
      redacted: true,
    }
  }

  const fallbackPool = filterHighlyRecognized(
    fallbackCandidates.map((entity) => spotlightFromFeedEntity(entity)).filter(Boolean),
  )
  const dedupedFallback = options.postHistory
    ? filterByMarketingDedup(fallbackPool, options.postHistory, options.dedupDays ?? marketingDedupDays(env))
    : fallbackPool

  if (!hasSupabase(env)) {
    if (!dedupedFallback.length) return null
    return dedupedFallback[rotationIndex(env, dedupedFallback.length)]
  }

  try {
    const cutoff = cutoffDateIso()
    const [entities, events] = await Promise.all([
      supabaseRest(env, 'entities?select=id,canonical_name,jurisdiction,ticker&order=canonical_name.asc&limit=500'),
      supabaseRest(
        env,
        `legal_events?select=entity_id,event_type,jurisdiction,filing_date&order=filing_date.desc&limit=250&filing_date=gte.${cutoff}`,
      ),
    ])

    const eventEntityIds = [...new Set((events || []).map((row) => row.entity_id).filter(Boolean))]
    // Chunked id filter (PostgREST URL length / reliability).
    const scores = []
    for (let i = 0; i < eventEntityIds.length; i += 60) {
      const chunk = eventEntityIds.slice(i, i + 60)
      const batch = await supabaseRest(
        env,
        `friction_scores?select=entity_id,score,confidence&entity_id=in.(${chunk.map((id) => encodeURIComponent(id)).join(',')})`,
      )
      if (Array.isArray(batch)) scores.push(...batch)
    }

    const scoreByEntity = new Map()
    for (const row of scores || []) {
      if (!scoreByEntity.has(row.entity_id)) scoreByEntity.set(row.entity_id, row)
    }

    const latestEventByEntity = new Map()
    for (const event of events || []) {
      if (!latestEventByEntity.has(event.entity_id)) latestEventByEntity.set(event.entity_id, event)
    }

    const eligible = filterHighlyRecognized(
      (entities || [])
        .filter((entity) => latestEventByEntity.has(entity.id))
        .filter((entity) => isLikelyBusinessEntityName(entity.canonical_name))
        .map((entity) => {
          const latest = latestEventByEntity.get(entity.id)
          return {
            name: companyDisplayName(entity.canonical_name, 48),
            entity_id: entity.id,
            slug: opaqueSignalSlug(entity.id),
            score: Number(scoreByEntity.get(entity.id)?.score || 0),
            recordType: humanRecordType(latest?.event_type),
            jurisdiction: displayJurisdiction(latest?.jurisdiction || entity.jurisdiction),
            filingDate: latest?.filing_date || 'recent',
            event_type: latest?.event_type || null,
            ticker: entity.ticker || null,
            redacted: false,
          }
        })
        .filter((entity) => entity.name.length >= 3),
    ).sort(
      (a, b) =>
        b.score + recognitionBoost(b) - (a.score + recognitionBoost(a)) ||
        String(b.filingDate).localeCompare(String(a.filingDate)),
    )

    const deduped = options.postHistory
      ? filterByMarketingDedup(eligible, options.postHistory, options.dedupDays ?? marketingDedupDays(env))
      : eligible

    if (deduped.length) {
      const scored = deduped.filter((entity) => entity.score > 0)
      const pool = scored.length ? scored : deduped
      return pool[rotationIndex(env, pool.length)]
    }
  } catch {
    // Fall back to the public feed if Supabase is temporarily unavailable.
  }

  if (!dedupedFallback.length) return null
  return dedupedFallback[rotationIndex(env, dedupedFallback.length)]
}

const TEMPLATE_DATA_CACHE_URL = 'https://vortx-internal/marketing-template-data-v1'

async function readTemplateDataCache() {
  if (typeof caches === 'undefined' || !caches.default) return null
  const cached = await caches.default.match(TEMPLATE_DATA_CACHE_URL)
  if (!cached) return null
  try {
    return await cached.json()
  } catch {
    return null
  }
}

async function writeTemplateDataCache(payload) {
  if (typeof caches === 'undefined' || !caches.default) return
  await caches.default.put(
    TEMPLATE_DATA_CACHE_URL,
    new Response(JSON.stringify(payload), {
      headers: { 'cache-control': 'max-age=300' },
    }),
  )
}

function applyTemplateDedup(base, options, env) {
  const recognizedCandidates = base.recognizedCandidates || []
  const dedupedCandidates = options.postHistory
    ? filterByMarketingDedup(
        recognizedCandidates,
        options.postHistory,
        options.dedupDays ?? marketingDedupDays(env),
      )
    : recognizedCandidates
  return {
    ...base,
    signalCandidates: dedupedCandidates.slice(0, 40),
  }
}

async function resolveTemplateSpotlight(env, feed, options = {}) {
  if (options.skipSpotlight) return null
  return fetchSpotlightEntity(env, feed, options)
}

async function fetchTemplateData(env, feed, options = {}) {
  if (!hasSupabase(env)) {
    return {
      spotlight: await resolveTemplateSpotlight(env, feed, options),
      warn: null,
      counts: {},
    }
  }
  try {
    const cachedBase = await readTemplateDataCache()
    if (cachedBase) {
      return {
        ...applyTemplateDedup(cachedBase, options, env),
        spotlight: await resolveTemplateSpotlight(env, feed, options),
      }
    }

    const cutoff = cutoffDateIso()
    const [entities, events] = await Promise.all([
      supabaseRest(env, 'entities?select=id,canonical_name,jurisdiction,ticker&limit=500'),
      supabaseRest(
        env,
        `legal_events?select=entity_id,event_type,title,summary,jurisdiction,filing_date,severity,confidence&order=filing_date.desc&limit=200&filing_date=gte.${cutoff}`,
      ),
    ])
    const entityById = new Map((entities || []).map((entity) => [entity.id, entity]))
    const warnEvents = (events || []).filter((event) => event.event_type === 'warn_notice')
    const bankruptcyEvents = (events || []).filter((event) => /bankruptcy|docket|civil/.test(String(event.event_type)))
    const lienEvents = (events || []).filter((event) => /lien|notice_of_intent|secured|creditor/.test(String(event.event_type)))
    const warn = filterHighlyRecognized(
      warnEvents
        .map((event) => {
          const entity = entityById.get(event.entity_id)
          const name = safeCompanyName(entity?.canonical_name || event.title || 'Company')
          return {
            name,
            entity_id: event.entity_id,
            slug: opaqueSignalSlug(event.entity_id),
            recordType: humanRecordType(event.event_type),
            jurisdiction: displayJurisdiction(event.jurisdiction || entity?.jurisdiction),
            filingDate: event.filing_date || 'recent',
            score: Number(event.severity || 0),
            confidence: Number(event.confidence || 0),
            workers: workerCountFromSummary(event.summary),
            event_type: event.event_type,
            summary: event.summary || '',
            ticker: entity?.ticker || null,
          }
        })
        .filter((item) => item.name && item.filingDate),
    ).sort((a, b) => Number(b.workers || 0) - Number(a.workers || 0))[0] || null
    const bankruptcy = filterHighlyRecognized(
      bankruptcyEvents
        .map((event) => {
          const entity = entityById.get(event.entity_id)
          const name = safeCompanyName(entity?.canonical_name || event.title || 'Company')
          return {
            name,
            entity_id: event.entity_id,
            slug: opaqueSignalSlug(event.entity_id),
            recordType: humanRecordType(event.event_type),
            jurisdiction: displayJurisdiction(event.jurisdiction || entity?.jurisdiction),
            filingDate: event.filing_date || 'recent',
            score: Number(event.severity || 0),
            confidence: Number(event.confidence || 0),
            event_type: event.event_type,
            summary: event.summary || '',
            ticker: entity?.ticker || null,
          }
        })
        .filter((item) => item.name && item.filingDate),
    ).sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0] || null

    const signalCandidates = []
    const entityEventGroups = new Map()
    const seenEntityIds = new Set()
    for (const event of events || []) {
      const entity = entityById.get(event.entity_id)
      const name = safeCompanyName(entity?.canonical_name || event.title || '')
      if (!name || !isLikelyBusinessEntityName(name)) continue

      const mapped = {
        name,
        entity_id: event.entity_id,
        slug: opaqueSignalSlug(event.entity_id),
        recordType: humanRecordType(event.event_type),
        jurisdiction: displayJurisdiction(event.jurisdiction || entity?.jurisdiction),
        filingDate: event.filing_date || 'recent',
        score: Number(event.severity || 0),
        confidence: Number(event.confidence || 0),
        event_type: event.event_type,
        summary: event.summary || '',
        workers: workerCountFromSummary(event.summary),
        ticker: entity?.ticker || null,
      }

      const group = entityEventGroups.get(event.entity_id) || {
        entity_id: event.entity_id,
        name,
        slug: mapped.slug,
        events: [],
      }
      group.events.push(mapped)
      entityEventGroups.set(event.entity_id, group)

      if (seenEntityIds.has(event.entity_id)) continue
      seenEntityIds.add(event.entity_id)
      signalCandidates.push(mapped)
    }
    signalCandidates.sort((a, b) => {
      const scoreDiff =
        signalScoreValue(b) + recognitionBoost(b) - (signalScoreValue(a) + recognitionBoost(a))
      if (scoreDiff) return scoreDiff
      return String(b.filingDate || '').localeCompare(String(a.filingDate || ''))
    })

    const recognizedCandidates = filterHighlyRecognized(signalCandidates)
    const groupedEvents = [...entityEventGroups.values()].map((group) => ({
      ...group,
      events: group.events.sort((a, b) => String(a.filingDate).localeCompare(String(b.filingDate))),
    }))

    const basePayload = {
      warn,
      bankruptcy,
      recognizedCandidates,
      entityEventGroups: groupedEvents,
      rawEvents: (events || []).map((event) => {
        const entity = entityById.get(event.entity_id)
        return {
          entity_id: event.entity_id,
          name: safeCompanyName(entity?.canonical_name || event.title || ''),
          event_type: event.event_type,
          jurisdiction: displayJurisdiction(event.jurisdiction || entity?.jurisdiction),
          filing_date: event.filing_date || 'recent',
          severity: Number(event.severity || 0),
          confidence: Number(event.confidence || 0),
          summary: event.summary || '',
        }
      }),
      counts: {
        warn: warnEvents.length,
        bankruptcy: bankruptcyEvents.length,
        liens: lienEvents.length,
      },
    }
    await writeTemplateDataCache(basePayload)

    return {
      ...applyTemplateDedup(basePayload, options, env),
      spotlight: await resolveTemplateSpotlight(env, feed, options),
    }
  } catch {
    return { spotlight: await resolveTemplateSpotlight(env, feed, options), warn: null, counts: {} }
  }
}

function campaignStats(feed, sources) {
  const enabledSources = (sources.sources || []).filter((source) => source.enabled).length
  const eventTypes = {}
  const jurisdictions = {}
  const financialEvents = []
  let warnNoticeCount = 0
  for (const event of feed.events || []) {
    const eventType = event.event_type || 'public record'
    const jurisdiction = event.jurisdiction || 'multi-jurisdiction'
    eventTypes[eventType] = (eventTypes[eventType] || 0) + 1
    jurisdictions[jurisdiction] = (jurisdictions[jurisdiction] || 0) + 1
    if (eventType === 'warn_notice' || event.source_record_type === 'warn_notice') warnNoticeCount += 1
    if (FINANCIAL_SIGNAL_TYPES.has(eventType) || FINANCIAL_SIGNAL_TYPES.has(event.source_record_type)) {
      financialEvents.push(event)
    }
  }

  financialEvents.sort((a, b) => String(b.filing_date || '').localeCompare(String(a.filing_date || '')))
  const latestFinancial = financialEvents[0]

  return {
    entityCount: feed.entities?.length || 0,
    eventCount: feed.events?.length || 0,
    sourceCount: enabledSources,
    topEventType: topKey(eventTypes, 'public records'),
    topJurisdiction: topKey(jurisdictions, 'multi-jurisdiction'),
    warnNoticeCount,
    financialSignalCount: financialEvents.length,
    latestSignalDate: (feed.events || [])[0]?.filing_date || 'today',
    latestFinancialSignal: latestFinancial
      ? `${String(latestFinancial.event_type || latestFinancial.source_record_type || 'financial signal').replaceAll('_', ' ')} / ${displayJurisdiction(latestFinancial.jurisdiction)}`
      : 'legal-friction signal / multi-jurisdiction',
  }
}

function topKey(counts, fallback) {
  const entries = Object.entries(counts)
  if (!entries.length) return fallback
  return entries.sort((a, b) => b[1] - a[1])[0][0].replaceAll('_', ' ')
}

function sanitizeText(value, max = 120) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,:;!?$%()/'-]/g, '')
    .trim()
    .slice(0, max)
}

function displayJurisdiction(value) {
  const text = String(value || '').trim()
  if (!text || /^https?:\/\//i.test(text)) return 'US-Bankruptcy'
  return text
}

async function campaignForToday(stats, env) {
  alignStatsToMarketingLead(stats)
  const baseSite = String(env.PUBLIC_SITE_URL || DEFAULT_SITE).replace(/\/$/, '')
  const lead = stats.marketingLead || stats.spotlight
  const site = lead?.slug
    ? `${baseSite}/signal/${lead.slug}`
    : String(env.MARKETING_CTA_URL || baseSite).replace(/\/$/, '')

  const templateId = pickPlaybookTemplate(env, lead, rotationIndex)
  const playbook = buildPlaybookTweet({
    lead,
    siteUrl: site,
    templateId,
    scoreText: scoreText(null, lead),
  })

  const trendHashtags = stats.trendHashtags || playbookHashtags(lead, { maxTags: 2 })
  const cardLead = stats.marketingLead || cardLeadForCampaign(stats, { format: templateId })

  return {
    text: playbook.text,
    cardTitle: playbook.cardTitle,
    cardSubtitle: playbook.cardSubtitle,
    cardLead,
    cardStakeLine: playbook.stakeLine,
    cardSupportLine: playbook.supportLine,
    cardCta: playbook.cardCta,
    cardFraming: playbook.framing,
    spotlightName: lead?.name || null,
    format: templateId,
    trendHashtags,
    trendingTerms: stats.trending?.terms?.slice(0, 5) || [],
    trendMatched: Boolean(stats.trendMatched),
    trendScore: stats.trendScore,
    marketingLead: stats.marketingLead?.name || null,
  }
}

function alignStatsToMarketingLead(stats) {
  const lead = stats.marketingLead || stats.spotlight
  if (!lead) return
  stats.spotlight = lead
  const eventType = String(lead.event_type || lead.recordType || '').toLowerCase()
  if (/warn/.test(eventType)) stats.warn = lead
  else if (/bankruptcy|chapter|docket|receivership/.test(eventType)) stats.bankruptcy = lead
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['10010', '10010', '10010', '11111', '00010', '00010', '00010'],
  5: ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  6: ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
}

function pngBase64(width, height, pixels) {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr[8] = 8
  ihdr[9] = 2

  const scanlines = new Uint8Array((width * 3 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1)
    scanlines[row] = 0
    scanlines.set(pixels.subarray(y * width * 3, (y + 1) * width * 3), row + 1)
  }

  const chunks = [
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlibStore(scanlines)),
    pngChunk('IEND', new Uint8Array()),
  ]

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return arrayBufferToBase64(out.buffer)
}

function pngChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type)
  const chunk = new Uint8Array(12 + data.length)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, data.length)
  chunk.set(typeBytes, 4)
  chunk.set(data, 8)
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)))
  return chunk
}

function zlibStore(data) {
  const blocks = []
  for (let offset = 0; offset < data.length; offset += 65535) {
    const block = data.subarray(offset, Math.min(offset + 65535, data.length))
    const header = new Uint8Array(5)
    header[0] = offset + block.length >= data.length ? 1 : 0
    header[1] = block.length & 255
    header[2] = (block.length >> 8) & 255
    const nlen = (~block.length) & 65535
    header[3] = nlen & 255
    header[4] = (nlen >> 8) & 255
    blocks.push(header, block)
  }

  const adler = adler32(data)
  const out = new Uint8Array(2 + blocks.reduce((sum, block) => sum + block.length, 0) + 4)
  out[0] = 0x78
  out[1] = 0x01
  let offset = 2
  for (const block of blocks) {
    out.set(block, offset)
    offset += block.length
  }
  new DataView(out.buffer).setUint32(offset, adler)
  return out
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function adler32(bytes) {
  let a = 1
  let b = 0
  for (const byte of bytes) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

function createCanvas(width, height, urgency = 0) {
  const pixels = new Uint8Array(width * height * 3)
  const hot = urgency >= 80
  const warm = urgency >= 65
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3
      const vertical = y / height
      const scan = y % 5 === 0 ? 0.9 : 1
      const vignette = Math.min(
        x / (width * 0.1),
        (width - x) / (width * 0.1),
        y / (height * 0.08),
        (height - y) / (height * 0.08),
        1,
      )
      const glow = Math.max(0, 1 - Math.hypot(x - width * 0.84, y - height * 0.4) / (width * 0.42))
      const glowStrength = hot ? glow * 0.72 : warm ? glow * 0.48 : glow * 0.32
      const r = (1 + vertical * 4 + glowStrength * (hot ? 58 : warm ? 32 : 16)) * vignette * scan
      const g = (4 + vertical * 8 + glowStrength * (hot ? 24 : warm ? 34 : 42)) * vignette * scan
      const b = (10 + vertical * 16 + glowStrength * (hot ? 18 : 62)) * vignette * scan
      pixels[i] = Math.min(255, Math.floor(r))
      pixels[i + 1] = Math.min(255, Math.floor(g))
      pixels[i + 2] = Math.min(255, Math.floor(b))
    }
  }
  return { width, height, pixels }
}

function drawScanlines(canvas, spacing = 6, alpha = 0.08) {
  for (let y = 0; y < canvas.height; y += spacing) {
    for (let x = 0; x < canvas.width; x += 1) {
      const i = (y * canvas.width + x) * 3
      canvas.pixels[i] = Math.floor(canvas.pixels[i] * (1 - alpha))
      canvas.pixels[i + 1] = Math.floor(canvas.pixels[i + 1] * (1 - alpha))
      canvas.pixels[i + 2] = Math.floor(canvas.pixels[i + 2] * (1 - alpha))
    }
  }
}

function textScaleForLength(length, base) {
  if (length > 34) return Math.max(4, base - 3)
  if (length > 26) return Math.max(5, base - 2)
  if (length > 18) return Math.max(6, base - 1)
  return base
}

function rect(canvas, x, y, w, h, color) {
  const x0 = Math.max(0, Math.floor(x))
  const y0 = Math.max(0, Math.floor(y))
  const x1 = Math.min(canvas.width, Math.floor(x + w))
  const y1 = Math.min(canvas.height, Math.floor(y + h))
  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) {
      const i = (yy * canvas.width + xx) * 3
      canvas.pixels[i] = color[0]
      canvas.pixels[i + 1] = color[1]
      canvas.pixels[i + 2] = color[2]
    }
  }
}

function strokeRect(canvas, x, y, w, h, color, thickness = 2) {
  rect(canvas, x, y, w, thickness, color)
  rect(canvas, x, y + h - thickness, w, thickness, color)
  rect(canvas, x, y, thickness, h, color)
  rect(canvas, x + w - thickness, y, thickness, h, color)
}

function text(canvas, value, x, y, scale, color) {
  let cursor = x
  for (const rawChar of String(value).toUpperCase()) {
    if (rawChar === ' ') {
      cursor += scale * 4
      continue
    }
    const glyph = FONT[rawChar] || FONT['-']
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] === '1') rect(canvas, cursor + col * scale, y + row * scale, scale, scale, color)
      }
    }
    cursor += scale * 6
  }
}

function fitText(value, maxChars) {
  const clean = String(value || '').toUpperCase()
  return clean.length > maxChars ? `${clean.slice(0, maxChars - 1)}-` : clean
}

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function makeHeroBg(canvas, scoreColor) {
  const top = [8, 9, 11]
  const bottom = lerpColor(top, scoreColor, 0.16)
  for (let y = 0; y < canvas.height; y += 1) {
    const t = y / canvas.height
    const c = lerpColor(top, bottom, t)
    for (let x = 0; x < canvas.width; x += 1) {
      const i = (y * canvas.width + x) * 3
      canvas.pixels[i] = c[0]
      canvas.pixels[i + 1] = c[1]
      canvas.pixels[i + 2] = c[2]
    }
  }
}

function textWidth(value, scale) {
  let width = 0
  for (const rawChar of String(value).toUpperCase()) {
    if (rawChar === ' ') width += scale * 4
    else width += scale * 6
  }
  return width
}

function wrapLines(value, maxWidth, scale) {
  const words = String(value || '').split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const lines = []
  let current = ''
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word
    if (textWidth(trial, scale) <= maxWidth) current = trial
    else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function hLine(canvas, x1, x2, y, color) {
  rect(canvas, x1, y, x2 - x1, 1, color)
}

function textGlow(canvas, value, x, y, scale, color, blurRadius = 20) {
  const radius = Math.max(3, Math.round(blurRadius * (scale / 27)))
  for (let ring = radius; ring >= 1; ring -= 1) {
    const strength = (1 - ring / (radius + 1)) * 0.45
    const glow = [
      Math.min(255, Math.floor(color[0] * strength)),
      Math.min(255, Math.floor(color[1] * strength * 0.35)),
      Math.min(255, Math.floor(color[2] * strength * 0.35)),
    ]
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (dx * dx + dy * dy > ring * ring) continue
        text(canvas, value, x + dx, y + dy, scale, glow)
      }
    }
  }
}

const heroCardDraw = {
  makeHeroBg,
  text,
  textWidth,
  wrapLines,
  hLine,
  textGlow,
}

function generateHeroCardBase64(stats, campaign, leadOverride = null) {
  const lead = leadOverride || cardLeadForCampaign(stats, campaign) || stats.spotlight
  const panel = campaign.cardPanel || cardScorePanel(lead, stats)
  const canvas = { width: CARD_WIDTH, height: CARD_HEIGHT, pixels: new Uint8Array(CARD_WIDTH * CARD_HEIGHT * 3) }
  renderHeroCard(canvas, heroCardDraw, campaign, lead, panel)
  return pngBase64(canvas.width, canvas.height, canvas.pixels)
}

function generateTeaserCardBase64(stats, campaign) {
  return generateHeroCardBase64(stats, campaign)
}

const discordDeps = {
  defaultSite: DEFAULT_SITE,
  bool,
  fetchJson,
  fetchTemplateData,
  campaignStats,
  generateHeroCardBase64,
  loadMarketingPostHistory,
  recordMarketingPost,
}

async function uploadMedia(env, imageBase64) {
  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json'
  const body = new URLSearchParams({
    media_data: imageBase64,
    media_category: 'tweet_image',
  })

  const authorization = await oauthHeader(env, 'POST', uploadUrl, Object.fromEntries(body.entries()))
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      authorization,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const payload = await response.json()
  if (!response.ok) throw new Error(payload?.errors?.[0]?.message || payload?.error || 'X media upload failed.')
  return payload.media_id_string
}

async function postTweet(env, text, mediaIds = []) {
  const url = 'https://api.twitter.com/2/tweets'
  const body = {
    text,
    ...(mediaIds.length ? { media: { media_ids: mediaIds } } : {}),
  }

  if (hasOAuth1(env)) {
    const authorization = await oauthHeader(env, 'POST', url)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.detail || payload?.errors?.[0]?.message || 'X tweet failed.')
    return payload
  }

  if (env.X_OAUTH2_USER_TOKEN && !mediaIds.length) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.X_OAUTH2_USER_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.detail || payload?.errors?.[0]?.message || 'X tweet failed.')
    return payload
  }

  throw new Error('Missing X user credentials. Set OAuth 1.0a access token + secret for image posts.')
}

export async function runDiscordSignalBot(env, options = {}) {
  if (options.allChannels) {
    return runAllDiscordChannels(env, discordDeps, options)
  }
  if (options.cron) {
    return runDiscordChannelsForCron(env, discordDeps, options)
  }
  if (options.channelId) {
    return runDiscordChannel(env, discordDeps, options)
  }
  return runDiscordChannel(env, discordDeps, { ...options, channelId: 'alpha-feed' })
}

export async function runMarketingBot(env, options = {}) {
  const dryRun = bool(env.MARKETING_BOT_DRY_RUN, true)
  const enabled = bool(env.MARKETING_BOT_ENABLED, false) || options.force

  if (!enabled) {
    return { ok: true, skipped: true, reason: 'MARKETING_BOT_ENABLED is not true.' }
  }

  const site = String(env.PUBLIC_SITE_URL || DEFAULT_SITE).replace(/\/$/, '')
  const postHistory = await loadMarketingPostHistory(env)
  const templateOptions = { postHistory, dedupDays: marketingDedupDays(env) }
  const [feed, sources] = await Promise.all([
    fetchJson(`${site}/api/friction-feed`),
    fetchJson(`${site}/api/source-transparency`),
  ])
  const templateData = await fetchTemplateData(env, feed, templateOptions)
  const stats = {
    ...campaignStats(feed, sources),
    ...templateData,
  }
  const preFormat = POST_FORMATS[rotationIndex(env, POST_FORMATS.length)]
  const trendPick = await attachTrendingLead(
    stats,
    env,
    { format: preFormat, postHistory, dedupDays: marketingDedupDays(env) },
    () => cardLeadForCampaign(stats, { format: preFormat }) || stats.spotlight,
  )
  stats.trending = trendPick.trending
  stats.marketingLead = trendPick.lead
  stats.trendHashtags = trendPick.trendHashtags
  stats.trendMatched = trendPick.matchedTrending
  stats.trendScore = trendPick.trendScore
  if (!stats.marketingLead || !isHighlyRecognizedBrand(stats.marketingLead)) {
    return {
      ok: true,
      skipped: true,
      reason: 'No highly recognized marketing lead available (or all recent picks are in dedup cooldown).',
      stats,
    }
  }
  if (trendPick.lead) {
    stats.spotlight = trendPick.lead
    stats.marketingLead = trendPick.lead
    alignStatsToMarketingLead(stats)
  }
  const campaign = await campaignForToday(stats, env)

  let mediaIds = []
  let imageStatus = 'not_configured'
  const imageMode = String(env.MARKETING_IMAGE_MODE || 'teaser-card')
  if (imageMode !== 'none' && hasOAuth1(env)) {
    try {
      const imageBase64 = generateTeaserCardBase64(stats, campaign)
      const mediaId = dryRun ? 'dry-run-media-id' : await uploadMedia(env, imageBase64)
      mediaIds = [mediaId]
      imageStatus = dryRun ? 'generated_teaser_card_dry_run' : 'uploaded_teaser_card'
    } catch (error) {
      imageStatus = `failed: ${error.message}`
      if (bool(env.MARKETING_IMAGE_REQUIRED, false)) throw error
    }
  }

  if (dryRun) {
    const discordPreview = await runDiscordSignalBot(env, { force: true })
    return {
      ok: true,
      dry_run: true,
      stats,
      text: campaign.text,
      discord_text: discordPreview.discord_text,
      discord_status: discordPreview.discord_status,
      image_status: imageStatus,
      card_title: campaign.cardTitle,
      spotlight_company: campaign.spotlightName,
      discord_lead: discordPreview.discord_lead,
      trend_hashtags: campaign.trendHashtags,
      trend_matched: campaign.trendMatched,
      marketing_lead: campaign.marketingLead,
    }
  }

  const tweet = await postTweet(env, campaign.text, mediaIds)
  await recordMarketingPost(env, stats.marketingLead, 'x-marketing', { dryRun: false })

  return {
    ok: true,
    dry_run: false,
    stats,
    trend_hashtags: campaign.trendHashtags,
    image_status: imageStatus,
    tweet_id: tweet?.data?.id || null,
    spotlight_company: campaign.spotlightName,
  }
}

const redditDeps = {
  defaultSite: DEFAULT_SITE,
  bool,
  fetchJson,
  fetchTemplateData,
  campaignStats,
}

export async function runRedditBot(env, options = {}) {
  return runRedditWeekly(env, redditDeps, options)
}

/**
 * Cloudflare free plan allows 5 cron triggers per account, so this Worker runs
 * on a single daily cron and expands it to the per-day channel schedules here.
 * Weekday map (UTC): Sun tactical-playbook, Mon death-spirals + Reddit digest,
 * Tue/Fri mass-layoffs, Wed/Sat congress-and-insiders, Thu data-dumps + market-chatter;
 * alpha-feed + unfiltered-signals + X post daily.
 */
export function activeCronsForDate(date = new Date()) {
  const day = date.getUTCDay()
  const crons = ['17 14 * * *']
  if (day === 0) crons.push('17 14 * * 0')
  if (day === 1) crons.push('17 14 * * 1')
  if (day === 2 || day === 5) crons.push('17 14 * * 2,5')
  if (day === 3 || day === 6) crons.push('17 14 * * 3,6')
  if (day === 4) crons.push('17 14 * * 4')
  return crons
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const crons = event.cron === '17 14 * * *' ? activeCronsForDate() : [event.cron]
        const discord = {}
        for (const cron of crons) {
          discord[cron] = await runDiscordSignalBot(env, { cron })
        }

        let reddit = null
        if (crons.some((cron) => resolveRedditCron(cron))) {
          try {
            reddit = await runRedditBot(env)
          } catch (error) {
            reddit = { ok: false, error: error.message }
          }
        }

        let marketing = null
        if (crons.includes('17 14 * * *')) {
          try {
            marketing = await runMarketingBot(env)
          } catch (error) {
            marketing = { ok: false, error: error.message }
          }
        }
        return { discord, marketing, reddit }
      })(),
    )
  },

  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/health') {
      return json({
        ok: true,
        enabled: bool(env.MARKETING_BOT_ENABLED, false),
        dry_run: bool(env.MARKETING_BOT_DRY_RUN, true),
        has_x_oauth1: hasOAuth1(env),
        image_mode: String(env.MARKETING_IMAGE_MODE || 'teaser-card'),
        has_supabase: hasSupabase(env),
        discord_enabled: bool(env.DISCORD_BOT_ENABLED, false),
        discord_dry_run: bool(env.DISCORD_BOT_DRY_RUN, true),
        discord_categories: [FREE_ALPHA_CATEGORY, UNLOCK_QUEUE_CATEGORY],
        has_discord_alpha_feed_webhook: Boolean(
          String(env.DISCORD_ALPHA_FEED_WEBHOOK_URL || env.DISCORD_WEBHOOK_URL || '').trim(),
        ),
        has_discord_mass_layoffs_webhook: Boolean(String(env.DISCORD_MASS_LAYOFFS_WEBHOOK_URL || '').trim()),
        has_discord_congress_insiders_webhook: Boolean(
          String(env.DISCORD_CONGRESS_INSIDERS_WEBHOOK_URL || '').trim(),
        ),
        has_discord_market_chatter_webhook: Boolean(String(env.DISCORD_MARKET_CHATTER_WEBHOOK_URL || '').trim()),
        has_discord_unfiltered_signals_webhook: Boolean(String(env.DISCORD_UNFILTERED_SIGNALS_WEBHOOK_URL || '').trim()),
        has_discord_death_spirals_webhook: Boolean(
          String(env.DISCORD_DEATH_SPIRALS_WEBHOOK_URL || env.DISCORD_BANKRUPTCY_WATCH_WEBHOOK_URL || '').trim(),
        ),
        has_discord_data_dumps_webhook: Boolean(String(env.DISCORD_DATA_DUMPS_WEBHOOK_URL || '').trim()),
        has_discord_tactical_playbook_webhook: Boolean(
          String(env.DISCORD_TACTICAL_PLAYBOOK_WEBHOOK_URL || '').trim(),
        ),
        reddit_enabled: bool(env.REDDIT_BOT_ENABLED, false),
        reddit_dry_run: bool(env.REDDIT_BOT_DRY_RUN, true),
        reddit_subreddit: String(env.REDDIT_SUBREDDIT || 'VortxUnredacted'),
        has_reddit_credentials: Boolean(
          String(env.REDDIT_CLIENT_ID || '').trim() &&
            String(env.REDDIT_CLIENT_SECRET || '').trim() &&
            String(env.REDDIT_USERNAME || '').trim() &&
            String(env.REDDIT_PASSWORD || '').trim(),
        ),
      })
    }

    if (url.pathname === '/discord/run' && request.method === 'POST') {
      if (!authorizedRunToken(request, env)) return json({ ok: false, error: 'unauthorized' }, { status: 401 })
      try {
        const channel = url.searchParams.get('channel')
        const dryRun = url.searchParams.get('dry') === '1'
        if (channel === 'all') {
          return json(
            await runDiscordSignalBot(env, { force: true, forcePost: !dryRun, dryRun, allChannels: true }),
          )
        }
        return json(
          await runDiscordSignalBot(env, {
            force: true,
            forcePost: !dryRun,
            dryRun,
            channelId: channel || 'alpha-feed',
          }),
        )
      } catch (error) {
        return json({ ok: false, error: error.message }, { status: 500 })
      }
    }

    if (url.pathname === '/run' && request.method === 'POST') {
      if (!authorizedRunToken(request, env)) return json({ ok: false, error: 'unauthorized' }, { status: 401 })
      try {
        return json(await runMarketingBot(env, { force: true }))
      } catch (error) {
        return json({ ok: false, error: error.message }, { status: 500 })
      }
    }

    if (url.pathname === '/reddit/run' && request.method === 'POST') {
      if (!authorizedRunToken(request, env)) return json({ ok: false, error: 'unauthorized' }, { status: 401 })
      try {
        const dryRun = url.searchParams.get('dry') === '1'
        return json(await runRedditBot(env, { force: true, forcePost: !dryRun, dryRun }))
      } catch (error) {
        return json({ ok: false, error: error.message }, { status: 500 })
      }
    }

    return json({ ok: false, error: 'not_found' }, { status: 404 })
  },
}

/** Shared by case publish distribution (Discord PNG + X). */
export function renderHeroCardPngBase64(campaign, lead) {
  return generateHeroCardBase64({}, campaign, lead || null)
}

export function hasXOauth1(env) {
  return hasOAuth1(env)
}

export async function postTweetWithOptionalImage(env, text, imageBase64 = null) {
  const mediaIds = []
  if (imageBase64 && hasOAuth1(env)) {
    const mediaId = await uploadMedia(env, imageBase64)
    mediaIds.push(mediaId)
  }
  return postTweet(env, text, mediaIds)
}
