/**
 * Contractor Check: consumer lead-gen search over liens, bankruptcy, and court records.
 * Reuses scan data plumbing with a narrower record filter and unlock levels.
 */

import { fetchScanData, formatEventDetail } from './scan-core.js'
import { parseCompanyNames, scoreEntityCandidates, fetchEntityCandidates } from './entity-match.js'
import { matchConfidence, normalizeCompanyName } from '../../../worker/match-ticker.js'

export const CONTRACTOR_FREE_WINDOW_DAYS = 180
export const CONTRACTOR_UNLOCK_WINDOW_DAYS = 365
export const CONTRACTOR_MATCH_MIN_CONFIDENCE = 0.72
export const CONTRACTOR_MATCH_FUZZY_THRESHOLD = 0.85

export const CONTRACTOR_DISCLAIMER =
  'Public record, not a verdict. Not a consumer report. Do not use for credit, employment, insurance, housing, or other FCRA eligibility decisions. Vortx does not provide legal, financial, or licensing advice. See /legal on vortxmkt.com.'

export const CONTRACTOR_SOURCE_LABELS = [
  'CourtListener RECAP bankruptcy dockets',
  'CourtListener lien and mechanics lien search',
  'Federal and state court records (CourtListener)',
  'County recorder and public lien filings where ingested',
]

const CONTRACTOR_EVENT_RE =
  /lien|bankruptcy|adversary|receivership|civil_docket|lawsuit|mechanics|construction|judgment|creditor|complaint/i

const US_STATES = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
}

export function normalizeUsState(value) {
  const raw = String(value || '').trim()
  if (!raw) return { abbr: '', label: '' }
  const upper = raw.toUpperCase()
  if (US_STATES[upper]) return { abbr: upper, label: US_STATES[upper] }
  const entry = Object.entries(US_STATES).find(([, name]) => name.toLowerCase() === raw.toLowerCase())
  if (entry) return { abbr: entry[0], label: entry[1] }
  return { abbr: upper.slice(0, 2), label: raw }
}

export function jurisdictionMatchesState(jurisdiction, stateAbbr) {
  const abbr = String(stateAbbr || '').trim().toUpperCase()
  if (!abbr) return true
  const text = String(jurisdiction || '').toLowerCase()
  if (!text) return false
  const label = US_STATES[abbr]?.toLowerCase() || ''
  return text.includes(abbr.toLowerCase()) || (label && text.includes(label))
}

export function isContractorRelevantEvent(event, sourceById) {
  const source = sourceById.get(event?.source_id)
  const blob = `${event?.event_type || ''} ${source?.record_type || ''} ${event?.title || ''} ${event?.summary || ''}`
  return CONTRACTOR_EVENT_RE.test(blob)
}

export function relativeRecencyLabel(filingDate) {
  const ts = Date.parse(String(filingDate || ''))
  if (!Number.isFinite(ts)) return 'date on record'
  const diffMs = Math.max(0, Date.now() - ts)
  const days = Math.floor(diffMs / 86_400_000)
  if (days < 1) return 'filed today'
  if (days === 1) return 'filed yesterday'
  if (days < 14) return `filed ${days} days ago`
  if (days < 60) return `filed ${Math.round(days / 7)} weeks ago`
  const months = Math.max(1, Math.round(days / 30))
  if (months < 24) return `filed ${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.max(1, Math.round(days / 365))
  return `filed ${years} year${years === 1 ? '' : 's'} ago`
}

function lockedRecordPreview(event, sourceById) {
  const detail = formatEventDetail(event, sourceById)
  return {
    id: event.id,
    record_type: detail.record_type,
    recency_label: relativeRecencyLabel(event.filing_date),
    teaser_line: `${detail.record_type} · ${relativeRecencyLabel(event.filing_date)}`,
    locked: true,
  }
}

function unlockedRecord(event, sourceById) {
  const detail = formatEventDetail(event, sourceById)
  return {
    ...detail,
    recency_label: relativeRecencyLabel(event.filing_date),
    teaser_line: `${detail.record_type} · ${relativeRecencyLabel(event.filing_date)}`,
    locked: false,
  }
}

export function pickBestContractorMatch(inputName, matches, stateAbbr) {
  const ranked = [...(matches || [])].sort((a, b) => {
    const conf = (Number(b.confidence) || 0) - (Number(a.confidence) || 0)
    if (conf !== 0) return conf
    const bState = jurisdictionMatchesState(b.jurisdiction, stateAbbr) ? 1 : 0
    const aState = jurisdictionMatchesState(a.jurisdiction, stateAbbr) ? 1 : 0
    return bState - aState
  })
  return ranked[0] || null
}

function significantQueryTokens(queryName) {
  return normalizeCompanyName(queryName)
    .split(' ')
    .filter((token) => token.length >= 3)
}

export function isContractorMatchAcceptable(queryName, match) {
  if (!match?.entity_id || !match?.name) return false

  const confidence = Number(match.confidence) || 0
  if (confidence < CONTRACTOR_MATCH_MIN_CONFIDENCE) return false

  const queryTokens = significantQueryTokens(queryName)
  if (!queryTokens.length) return confidence >= CONTRACTOR_MATCH_MIN_CONFIDENCE

  const candidateTokens = new Set(normalizeCompanyName(match.name).split(' ').filter(Boolean))
  const matchedTokens = queryTokens.filter((token) => candidateTokens.has(token))
  const overlapRatio = matchedTokens.length / queryTokens.length

  if (confidence >= 0.95) return true
  if (queryTokens.length >= 2 && overlapRatio < 1 && confidence < CONTRACTOR_MATCH_FUZZY_THRESHOLD) {
    return false
  }
  if (overlapRatio < 0.5 && confidence < CONTRACTOR_MATCH_FUZZY_THRESHOLD) return false

  const directScore = matchConfidence(queryName, match.name)
  if (directScore < CONTRACTOR_MATCH_MIN_CONFIDENCE) return false

  return true
}

export function formatContractorMatchMeta(match) {
  if (!match?.entity_id) return null
  const confidence = Math.round((Number(match.confidence) || 0) * 100)
  const fuzzy = (Number(match.confidence) || 0) < CONTRACTOR_MATCH_FUZZY_THRESHOLD
  return {
    entity_id: match.entity_id,
    name: match.name,
    confidence,
    confidence_ratio: Number(match.confidence) || 0,
    fuzzy,
    label: `Matched: ${match.name} (confidence ${confidence}%)`,
  }
}

export function buildContractorCheckResults(data, { unlocked = false, stateAbbr = '' } = {}) {
  const sourceById = new Map((data.sources || []).map((source) => [source.id, source]))
  const entity = (data.entities || [])[0]
  if (!entity) {
    return {
      entity_id: null,
      entity_name: null,
      state: stateAbbr || null,
      record_count: 0,
      has_records: false,
      records: [],
      headline: null,
      no_match: true,
    }
  }

  const events = (data.events || [])
    .filter((event) => event.entity_id === entity.id && isContractorRelevantEvent(event, sourceById))
    .filter((event) => !stateAbbr || jurisdictionMatchesState(event.jurisdiction, stateAbbr) || jurisdictionMatchesState(entity.jurisdiction, stateAbbr))
    .sort((a, b) => {
      const severity = (Number(b.severity) || 0) - (Number(a.severity) || 0)
      if (severity !== 0) return severity
      return (Date.parse(b.filing_date || '') || 0) - (Date.parse(a.filing_date || '') || 0)
    })

  const records = unlocked
    ? events.map((event) => unlockedRecord(event, sourceById))
    : events.map((event) => lockedRecordPreview(event, sourceById))

  const count = records.length
  const stateLabel = stateAbbr && US_STATES[stateAbbr] ? `${US_STATES[stateAbbr]}` : stateAbbr || 'your selected area'

  return {
    entity_id: entity.id,
    entity_name: entity.canonical_name,
    state: stateAbbr || null,
    record_count: count,
    has_records: count > 0,
    records,
    unlocked,
    headline: count
      ? `We found ${count} public record${count === 1 ? '' : 's'} for ${entity.canonical_name} in ${stateLabel}.`
      : `No public liens or bankruptcy filings found for ${entity.canonical_name} in ${stateLabel}.`,
    no_match: false,
  }
}

export async function runContractorCheckSearch(env, supabaseRest, { name, state, city }) {
  const names = parseCompanyNames(name)
  const queryName = names[0] || String(name || '').trim()
  if (!queryName) {
    return { ok: false, error: 'missing_name', message: 'Enter a contractor or business name.' }
  }

  const { abbr: stateAbbr, label: stateLabel } = normalizeUsState(state)
  const candidates = await fetchEntityCandidates(env, supabaseRest, [queryName])
  const matches = scoreEntityCandidates(queryName, candidates)
  const best = pickBestContractorMatch(queryName, matches, stateAbbr)
  const accepted = Boolean(best?.entity_id && isContractorMatchAcceptable(queryName, best))

  if (!accepted) {
    return {
      ok: true,
      query: { name: queryName, state: stateAbbr, state_label: stateLabel, city: city || null },
      match: best?.entity_id ? { ...formatContractorMatchMeta(best), rejected: true } : null,
      result: {
        entity_id: null,
        entity_name: queryName,
        state: stateAbbr,
        record_count: 0,
        has_records: false,
        records: [],
        unlocked: false,
        headline: best?.entity_id
          ? `No confident match for "${queryName}". Try the full legal business name from a contract, invoice, or state license.`
          : `No public liens or bankruptcy filings found for ${queryName}${stateLabel ? ` in ${stateLabel}` : ''}.`,
        no_match: true,
        match_rejected: Boolean(best?.entity_id),
      },
      disclaimer: CONTRACTOR_DISCLAIMER,
      sources: CONTRACTOR_SOURCE_LABELS,
    }
  }

  const data = await fetchScanData(env, supabaseRest, [best.entity_id], {
    windowDays: CONTRACTOR_FREE_WINDOW_DAYS,
  })
  const result = buildContractorCheckResults(data, { unlocked: false, stateAbbr })
  const matchMeta = formatContractorMatchMeta(best)

  return {
    ok: true,
    query: { name: queryName, state: stateAbbr, state_label: stateLabel, city: city || null },
    match: matchMeta,
    result: {
      ...result,
      match_label: matchMeta?.label || null,
      window_days: CONTRACTOR_FREE_WINDOW_DAYS,
    },
    disclaimer: CONTRACTOR_DISCLAIMER,
    sources: CONTRACTOR_SOURCE_LABELS,
  }
}

export async function runContractorCheckUnlock(env, supabaseRest, entityId, stateAbbr) {
  const data = await fetchScanData(env, supabaseRest, [entityId], {
    windowDays: CONTRACTOR_UNLOCK_WINDOW_DAYS,
  })
  const result = buildContractorCheckResults(data, { unlocked: true, stateAbbr })
  return {
    ...result,
    window_days: CONTRACTOR_UNLOCK_WINDOW_DAYS,
  }
}
