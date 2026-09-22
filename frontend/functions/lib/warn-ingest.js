/**
 * Map normalized WARN rows from state adapters into ingest record shape.
 */

import {
  buildWarnJurisdiction,
  buildWarnSummary,
  buildWarnTitle,
  parseWorkerCount,
  warnConfidenceFromWorkers,
  warnSeverityFromWorkers,
} from './warn-notice.js'

export function mapWarnIngestRecord({
  source,
  index,
  entity,
  workersRaw,
  city,
  county,
  state,
  noticeDate,
  effectiveDate,
  layoffType,
  sourceRecordId,
  payload,
}) {
  const workers = parseWorkerCount(workersRaw)
  const jurisdiction = buildWarnJurisdiction({ city, county, state, fallback: source.jurisdiction })
  const filingDate = noticeDate || effectiveDate
  const severity = warnSeverityFromWorkers(workers)
  const confidence = warnConfidenceFromWorkers(workers)

  return {
    raw: {
      source_record_id: sourceRecordId || `${source.slug}-${index + 1}`,
      fetched_url: source.source_url,
      payload,
    },
    event: {
      entity_name: entity,
      event_type: 'warn_notice',
      title: buildWarnTitle(entity, workers),
      summary: buildWarnSummary({
        entity,
        workers,
        city,
        county,
        state,
        noticeDate,
        effectiveDate,
        layoffType,
      }),
      jurisdiction,
      filing_date: filingDate,
      amount: workers,
      severity,
      confidence,
      status: 'open',
      evidence_url: source.source_url,
    },
  }
}

/** Parse simple CSV text into row objects using header row. */
export function parseCsvRows(text) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      if (row.some((cell) => String(cell || '').trim())) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field.length || row.length) {
    row.push(field)
    if (row.some((cell) => String(cell || '').trim())) rows.push(row)
  }
  if (!rows.length) return []
  const headers = rows[0].map((header) => String(header || '').trim())
  return rows.slice(1).map((cells) => {
    const obj = {}
    headers.forEach((header, idx) => {
      obj[header] = String(cells[idx] || '').trim()
    })
    return obj
  })
}

function pickField(row, names) {
  for (const name of names) {
    const exact = row[name]
    if (exact !== undefined && String(exact).trim()) return String(exact).trim()
  }
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value]),
  )
  for (const name of names) {
    const value = normalized[name.trim().toLowerCase()]
    if (value !== undefined && String(value).trim()) return String(value).trim()
  }
  return ''
}

function parseCityFromAddress(address) {
  const text = String(address || '').trim()
  const match = text.match(/,\s*([^,]+),\s*([A-Z]{2})\s*,?\s*(\d{5})?/i)
  if (!match) return { city: null, state: null }
  return { city: match[1].trim(), state: match[2].trim() }
}

export function mapNewYorkWarnRows(rows, source) {
  return rows.map((row, index) => {
    const entity = pickField(row, ['Business Legal Name', 'Company Name', 'Company'])
    const address = pickField(row, ['Impacted Site Address', 'Address'])
    const county = pickField(row, ['Impacted Site County', 'County', 'Region'])
    const noticeDate = pickField(row, ['Date of WARN Notice', 'Notice Dated', 'Notice Date']).slice(0, 10)
    const effectiveDate = pickField(row, ['Date Layoff/Closure Starts', 'Effective Date']).slice(0, 10)
    const postedDate = pickField(row, ['Date Posted', 'Date Posted  ']).slice(0, 10)
    const layoffType = [
      pickField(row, ['Layoff or Closure?', 'Layoff or Closure']),
      pickField(row, ['Permanent or Temporary Layoff?', 'Permanent or Temporary Layoff']),
      pickField(row, ['Reason for Layoff/Closure', 'Reason for Layoff/Closure   ']),
    ]
      .filter(Boolean)
      .join('; ')
    const workersRaw = pickField(row, ['Number of Affected Workers', 'Number of Affected Workers '])
    const recordKey = pickField(row, ['Index']) || `${entity}-${noticeDate}-${county}-${index + 1}`
    const { city, state } = parseCityFromAddress(address)

    return mapWarnIngestRecord({
      source,
      index,
      entity,
      workersRaw,
      city,
      county,
      state: state || source.jurisdiction,
      noticeDate: noticeDate || postedDate,
      effectiveDate,
      layoffType,
      sourceRecordId: `ny-warn-${recordKey}`,
      payload: row,
    })
  })
}

export function mapCaliforniaWarnRows(rows, source) {
  return rows.map((row, index) => {
    const entity = row.company
    const county = row.county
    const noticeDate = row.notice_date
    const effectiveDate = row.effective_date
    const layoffType = row.layoff_type
    const workersRaw = row.workers
    const address = row.address || ''
    const cityMatch = address.match(/\b([A-Za-z .'-]+)\s+CA\s+\d{5}\b/)
    const city = cityMatch ? cityMatch[1].trim() : null
    const recordKey = `${county}-${noticeDate}-${entity}-${workersRaw}`.replace(/\s+/g, '-').slice(0, 120)

    return mapWarnIngestRecord({
      source,
      index,
      entity,
      workersRaw,
      city,
      county,
      state: source.jurisdiction,
      noticeDate,
      effectiveDate,
      layoffType,
      sourceRecordId: `ca-warn-${recordKey}`,
      payload: row,
    })
  })
}

export function mapIllinoisWarnRows(rows, source) {
  return rows.map((row, index) => {
    const entity = row.LocationName || row.OrganizationName || `WARN entity ${index + 1}`
    const workersRaw = row.LayoffCount ?? row.EmployeeCount
    const city = row.City
    const county = null
    const noticeDate = String(row.InitialReportDate || row.WarnNoticeDate || '').slice(0, 10)
    const effectiveDate = String(row.ExpectedLayoff || row.FirstLayoffDate || '').slice(0, 10)
    const layoffType = [row.Reason, row.LayoffType, row.IndustryName].filter(Boolean).join('; ')
    const recordKey = row.IebsId || row.DOLRapidResponseId || row.Id

    return mapWarnIngestRecord({
      source,
      index,
      entity,
      workersRaw,
      city,
      county,
      state: row.State || source.jurisdiction,
      noticeDate,
      effectiveDate,
      layoffType,
      sourceRecordId: `il-warn-${recordKey}`,
      payload: row,
    })
  })
}
