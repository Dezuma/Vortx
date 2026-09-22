/**
 * Official House Clerk financial disclosure index (STOCK Act PTRs).
 * Source of truth when HouseStockWatcher mirrors are dead (403).
 */
import { unzipToMap, decodeZipText } from './zip-inflate.js'

function clean(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseMdY(value) {
  const raw = clean(value)
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, mm, dd, yyyy] = m
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function parseTsv(text) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim())
  if (!lines.length) return []
  const headers = lines[0].split('\t').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cols = line.split('\t')
    const row = {}
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? ''
    })
    return row
  })
}

export function ptrPdfUrl(year, docId) {
  const y = String(year || new Date().getUTCFullYear())
  const id = clean(docId)
  return `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${y}/${id}.pdf`
}

export function mapHouseClerkPtrRow(row, source, index = 0) {
  const first = clean(row.First || row.first)
  const last = clean(row.Last || row.last)
  const member = [first, last].filter(Boolean).join(' ') || `House member ${index + 1}`
  const year = clean(row.Year || row.year) || String(new Date().getUTCFullYear())
  const docId = clean(row.DocID || row.DocId || row.docid)
  const filed = parseMdY(row.FilingDate || row.filing_date)
  const district = clean(row.StateDst || row.State || '')
  const link = docId ? ptrPdfUrl(year, docId) : source?.source_url || ''

  return {
    raw: {
      source_record_id: docId ? `house-ptr:${year}:${docId}` : `house-ptr:${member}:${filed || index}`,
      fetched_url: link || null,
      payload: row,
    },
    event: {
      entity_name: member,
      event_type: 'congress_trade',
      title: `STOCK Act disclosure: ${member}`,
      summary: [
        `House STOCK Act Periodic Transaction Report naming ${member}.`,
        district ? `District on record: ${district}.` : '',
        filed ? `Disclosure filed ${filed}.` : '',
        'Transaction ticker and amount are inside the official PTR PDF when present.',
        'Public financial-disclosure filing, not investment advice. Not a consumer report.',
      ]
        .filter(Boolean)
        .join(' '),
      jurisdiction: district ? `US-House-${district}` : 'US-House',
      filing_date: filed,
      // Disclosure date is not the trade date; leave trade_date null until PDF parse.
      trade_date: null,
      severity: 64,
      confidence: 90,
      status: 'open',
      evidence_url: link || null,
      disclosure_kind: 'ptr_index',
    },
  }
}

/**
 * @param {object} source
 * @param {{ requestBytes: Function, years?: number[] }} deps
 */
export async function fetchHouseClerkPtrIndex(source, { requestBytes, years } = {}) {
  if (typeof requestBytes !== 'function') throw new Error('requestBytes_required')
  const nowYear = new Date().getUTCFullYear()
  const yearList = years?.length ? years : [nowYear, nowYear - 1]
  const seen = new Set()
  const mapped = []

  for (const year of yearList) {
    const url =
      clean(source?.index_url_template || '').replace('{year}', String(year)) ||
      `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.zip`
    let bytes
    try {
      bytes = await requestBytes(url, {
        headers: {
          accept: 'application/zip,*/*',
          'user-agent':
            'Mozilla/5.0 (compatible; VortxResearchBot/1.0; +https://vortxmkt.com)',
        },
      })
    } catch {
      continue
    }
    const files = await unzipToMap(bytes)
    const txtEntry = [...files.entries()].find(([name]) => /\.txt$/i.test(name))
    if (!txtEntry) continue
    const rows = parseTsv(decodeZipText(txtEntry[1]))
    const ptrs = rows.filter((row) => clean(row.FilingType).toUpperCase() === 'P')
    for (const row of ptrs) {
      const record = mapHouseClerkPtrRow(row, source, mapped.length)
      const key = record.raw.source_record_id
      if (seen.has(key)) continue
      seen.add(key)
      mapped.push(record)
    }
  }

  mapped.sort((a, b) =>
    String(b.event.filing_date || '').localeCompare(String(a.event.filing_date || '')),
  )
  return mapped
}
