/**
 * Job Safety Score: consumer search over WARN layoff filings.
 * Plain-language framing; calm tone; free preview shows filing date and scale.
 */

import { fetchScanData, formatEventDetail } from './scan-core.js'
import { parseCompanyNames, scoreEntityCandidates, fetchEntityCandidates } from './entity-match.js'
import { matchConfidence, normalizeCompanyName } from '../../../worker/match-ticker.js'
import {
  extractAffectedWorkers,
  formatWorkerScale,
} from './warn-notice.js'

export const JOB_SAFETY_FREE_WINDOW_DAYS = 365
export const JOB_SAFETY_UNLOCK_WINDOW_DAYS = 730
export const JOB_SAFETY_MATCH_MIN_CONFIDENCE = 0.72
export const JOB_SAFETY_MATCH_FUZZY_THRESHOLD = 0.85

export const JOB_SAFETY_DISCLAIMER =
  'Public workforce filings, not employment, trading, financial, or investment advice. Not a consumer report. Do not use for hiring, firing, or other FCRA eligibility decisions. WARN notices are administrative records, not judgments or guarantees about future layoffs. See /legal on vortxmkt.com.'

export const JOB_SAFETY_NO_RESULT_DISCLOSURE =
  'No layoff-related public filing found in our current sources for this search. That does not mean your job is safe: many layoffs never require a public WARN filing (small employers, short layoffs, and some states or thresholds). Coverage reflects Texas, Oregon, California, Illinois, and New York feeds today, expanding over time.'

export const JOB_SAFETY_SOURCE_LABELS = [
  'Texas WARN Notices (data.austintexas.gov)',
  'Oregon WARN Notices (data.oregon.gov)',
  'California WARN Notices (edd.ca.gov)',
  'Illinois WARN Notices (illinoisworknet.com)',
  'New York WARN Notices (dol.ny.gov / Tableau Public)',
]

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

export function isWarnLayoffEvent(event, sourceById) {
  const source = sourceById.get(event?.source_id)
  const recordType = String(source?.record_type || event?.event_type || '').toLowerCase()
  const blob = `${recordType} ${event?.event_type || ''} ${event?.title || ''} ${event?.summary || ''}`.toLowerCase()
  return recordType === 'warn_notice' || event?.event_type === 'warn_notice' || /\bwarn\b/.test(blob)
}

export { extractAffectedWorkers, formatWorkerScale }

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

function formatLocation(jurisdiction) {
  const text = String(jurisdiction || '').trim()
  if (!text) return null
  if (/^https?:\/\//i.test(text)) return 'location on record'
  return text
}

function freeRecordPreview(event, sourceById) {
  const detail = formatEventDetail(event, sourceById)
  const workers = formatWorkerScale(extractAffectedWorkers(event.summary || event.title))
  const location = formatLocation(event.jurisdiction)
  return {
    id: event.id,
    record_type: 'Layoff-related public filing',
    filing_date: event.filing_date || null,
    recency_label: relativeRecencyLabel(event.filing_date),
    worker_scale: workers,
    location,
    teaser_line: [
      'Layoff-related public filing',
      relativeRecencyLabel(event.filing_date),
      workers,
      location,
    ]
      .filter(Boolean)
      .join(' · '),
    locked: true,
    summary_preview: null,
    source_url: null,
    source_name: detail.source_name || null,
  }
}

function unlockedRecord(event, sourceById) {
  const detail = formatEventDetail(event, sourceById)
  const workers = formatWorkerScale(extractAffectedWorkers(event.summary || event.title))
  const location = formatLocation(event.jurisdiction)
  return {
    ...detail,
    record_type: 'Layoff-related public filing',
    recency_label: relativeRecencyLabel(event.filing_date),
    worker_scale: workers,
    location,
    teaser_line: [
      'Layoff-related public filing',
      relativeRecencyLabel(event.filing_date),
      workers,
      location,
    ]
      .filter(Boolean)
      .join(' · '),
    locked: false,
    summary_preview: detail.summary || null,
  }
}

export function pickBestJobSafetyMatch(inputName, matches, stateAbbr) {
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

export function isJobSafetyMatchAcceptable(queryName, match) {
  if (!match?.entity_id || !match?.name) return false

  const confidence = Number(match.confidence) || 0
  if (confidence < JOB_SAFETY_MATCH_MIN_CONFIDENCE) return false

  const queryTokens = significantQueryTokens(queryName)
  if (!queryTokens.length) return confidence >= JOB_SAFETY_MATCH_MIN_CONFIDENCE

  const candidateTokens = new Set(normalizeCompanyName(match.name).split(' ').filter(Boolean))
  const matchedTokens = queryTokens.filter((token) => candidateTokens.has(token))
  const overlapRatio = matchedTokens.length / queryTokens.length

  if (confidence >= 0.95) return true
  if (queryTokens.length >= 2 && overlapRatio < 1 && confidence < JOB_SAFETY_MATCH_FUZZY_THRESHOLD) {
    return false
  }
  if (overlapRatio < 0.5 && confidence < JOB_SAFETY_MATCH_FUZZY_THRESHOLD) return false

  const directScore = matchConfidence(queryName, match.name)
  if (directScore < JOB_SAFETY_MATCH_MIN_CONFIDENCE) return false

  return true
}

export function formatJobSafetyMatchMeta(match) {
  if (!match?.entity_id) return null
  const confidence = Math.round((Number(match.confidence) || 0) * 100)
  const fuzzy = (Number(match.confidence) || 0) < JOB_SAFETY_MATCH_FUZZY_THRESHOLD
  return {
    entity_id: match.entity_id,
    name: match.name,
    confidence,
    confidence_ratio: Number(match.confidence) || 0,
    fuzzy,
    label: `Matched employer: ${match.name} (confidence ${confidence}%)`,
  }
}

export function buildJobSafetyScoreResults(data, { unlocked = false, stateAbbr = '' } = {}) {
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
    .filter((event) => event.entity_id === entity.id && isWarnLayoffEvent(event, sourceById))
    .filter(
      (event) =>
        !stateAbbr ||
        jurisdictionMatchesState(event.jurisdiction, stateAbbr) ||
        jurisdictionMatchesState(entity.jurisdiction, stateAbbr),
    )
    .sort((a, b) => (Date.parse(b.filing_date || '') || 0) - (Date.parse(a.filing_date || '') || 0))

  const records = unlocked
    ? events.map((event) => unlockedRecord(event, sourceById))
    : events.map((event) => freeRecordPreview(event, sourceById))

  const count = records.length
  const stateLabel = stateAbbr && US_STATES[stateAbbr] ? US_STATES[stateAbbr] : stateAbbr || 'your selected area'

  return {
    entity_id: entity.id,
    entity_name: entity.canonical_name,
    state: stateAbbr || null,
    record_count: count,
    has_records: count > 0,
    records,
    unlocked,
    headline: count
      ? `We found ${count} layoff-related public filing${count === 1 ? '' : 's'} for ${entity.canonical_name} in ${stateLabel}.`
      : `No layoff-related public filings found for ${entity.canonical_name} in ${stateLabel}.`,
    no_match: false,
  }
}

export async function runJobSafetyScoreSearch(env, supabaseRest, { name, state }) {
  const names = parseCompanyNames(name)
  const queryName = names[0] || String(name || '').trim()
  if (!queryName) {
    return { ok: false, error: 'missing_name', message: 'Enter an employer or company name.' }
  }

  const { abbr: stateAbbr, label: stateLabel } = normalizeUsState(state)
  const candidates = await fetchEntityCandidates(env, supabaseRest, [queryName])
  const matches = scoreEntityCandidates(queryName, candidates)
  const best = pickBestJobSafetyMatch(queryName, matches, stateAbbr)
  const accepted = Boolean(best?.entity_id && isJobSafetyMatchAcceptable(queryName, best))

  if (!accepted) {
    return {
      ok: true,
      query: { name: queryName, state: stateAbbr, state_label: stateLabel },
      match: best?.entity_id ? { ...formatJobSafetyMatchMeta(best), rejected: true } : null,
      result: {
        entity_id: null,
        entity_name: queryName,
        state: stateAbbr,
        record_count: 0,
        has_records: false,
        records: [],
        unlocked: false,
        headline: best?.entity_id
          ? `No confident match for "${queryName}". Try the full legal employer name from a pay stub or HR portal.`
          : `No layoff-related public filings found for ${queryName}${stateLabel ? ` in ${stateLabel}` : ''}.`,
        no_match: true,
        match_rejected: Boolean(best?.entity_id),
        no_result_disclosure: JOB_SAFETY_NO_RESULT_DISCLOSURE,
      },
      disclaimer: JOB_SAFETY_DISCLAIMER,
      sources: JOB_SAFETY_SOURCE_LABELS,
    }
  }

  const data = await fetchScanData(env, supabaseRest, [best.entity_id], {
    windowDays: JOB_SAFETY_FREE_WINDOW_DAYS,
  })
  const result = buildJobSafetyScoreResults(data, { unlocked: false, stateAbbr })
  const matchMeta = formatJobSafetyMatchMeta(best)

  return {
    ok: true,
    query: { name: queryName, state: stateAbbr, state_label: stateLabel },
    match: matchMeta,
    result: {
      ...result,
      match_label: matchMeta?.label || null,
      window_days: JOB_SAFETY_FREE_WINDOW_DAYS,
      no_result_disclosure: result.has_records ? null : JOB_SAFETY_NO_RESULT_DISCLOSURE,
    },
    disclaimer: JOB_SAFETY_DISCLAIMER,
    sources: JOB_SAFETY_SOURCE_LABELS,
  }
}

export async function runJobSafetyScoreUnlock(env, supabaseRest, entityId, stateAbbr) {
  const data = await fetchScanData(env, supabaseRest, [entityId], {
    windowDays: JOB_SAFETY_UNLOCK_WINDOW_DAYS,
  })
  const result = buildJobSafetyScoreResults(data, { unlocked: true, stateAbbr })
  return {
    ...result,
    window_days: JOB_SAFETY_UNLOCK_WINDOW_DAYS,
  }
}
