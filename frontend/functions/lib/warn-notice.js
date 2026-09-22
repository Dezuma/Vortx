/**
 * WARN notice parsing and severity scoring shared by ingest, job safety score, and case drafts.
 */

export function parseWorkerCount(value) {
  const raw = String(value ?? '').replace(/,/g, '').trim()
  if (!raw) return null
  const match = raw.match(/\d+/)
  if (!match) return null
  const count = Number(match[0])
  return Number.isFinite(count) && count > 0 ? count : null
}

export function extractAffectedWorkers(summary) {
  const text = String(summary || '').trim()
  if (!text) return null
  const direct = text.match(/(\d[\d,]*)\s+(?:affected\s+)?(?:employees?|workers?)/i)
  if (direct) return parseWorkerCount(direct[1])
  const reverse = text.match(/(?:affected\s+)?(?:employees?|workers?)[:\s]+(\d[\d,]*)/i)
  if (reverse) return parseWorkerCount(reverse[1])
  const reported = text.match(/Reported affected employees:\s*(\d[\d,]*)/i)
  if (reported) return parseWorkerCount(reported[1])
  return null
}

/** Scale severity so large layoffs surface in case drafts and friction feed. */
export function warnSeverityFromWorkers(count) {
  const n = Number(count) || 0
  if (n >= 1000) return 95
  if (n >= 500) return 92
  if (n >= 250) return 89
  if (n >= 100) return 85
  if (n >= 50) return 78
  if (n >= 25) return 72
  if (n > 0) return 68
  return 66
}

export function warnConfidenceFromWorkers(count) {
  const n = Number(count) || 0
  if (n >= 100) return 90
  if (n >= 25) return 86
  if (n > 0) return 84
  return 82
}

export function formatWorkerScale(count) {
  if (!count) return null
  return `${Number(count).toLocaleString('en-US')} affected workers reported`
}

export function buildWarnJurisdiction({ city, county, state, fallback }) {
  const parts = [city, county, state].map((part) => String(part || '').trim()).filter(Boolean)
  if (parts.length) return parts.join(', ')
  return String(fallback || '').trim() || null
}

export function buildWarnTitle(entity, workers) {
  const name = String(entity || '').trim() || 'Employer'
  const count = Number(workers)
  if (Number.isFinite(count) && count > 0) {
    return `${name} filed a WARN notice (${count.toLocaleString('en-US')} workers on record)`
  }
  return `${name} filed a layoff-related public notice`
}

export function buildWarnSummary({ entity, workers, city, county, state, noticeDate, effectiveDate, layoffType }) {
  const location = buildWarnJurisdiction({ city, county, state })
  return [
    `WARN notice published for ${entity}.`,
    workers ? `Reported affected employees: ${Number(workers).toLocaleString('en-US')}.` : null,
    location ? `Location: ${location}.` : null,
    noticeDate ? `Notice filed on ${noticeDate}.` : null,
    effectiveDate ? `Effective layoff date on record: ${effectiveDate}.` : null,
    layoffType ? `Notice type: ${layoffType}.` : null,
    'This is an administrative workforce filing, not a judgment.',
  ]
    .filter(Boolean)
    .join(' ')
}
