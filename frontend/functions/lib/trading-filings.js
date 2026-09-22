/**
 * Normalizers for insider / congressional / institutional trading filings.
 * Only maps fields present on the source payload — no invented amounts or names.
 */

import { officialSecFilingUrl } from './event-evidence.js'

export const TRADING_EVENT_TYPES = new Set([
  'form_4',
  'congress_trade',
  'institutional_13f',
])

export const TRADING_RECORD_TYPES = new Set([
  'form_4',
  'congress_trade',
  'institutional_13f',
])

export function isTradingEventType(value) {
  const key = String(value || '')
    .toLowerCase()
    .replaceAll('-', '_')
  return TRADING_EVENT_TYPES.has(key) || /form_4|congress|stock_act|13f|insider/.test(key)
}

/**
 * Balanced desk/public tape window: keep insider + congress + 13F represented
 * instead of letting one high-severity type fill the entire slice.
 * @param {object[]} rows
 * @param {number} [limit=40]
 */
export function selectBalancedTradingFeed(rows = [], limit = 40) {
  const cap = Math.min(80, Math.max(10, Number(limit) || 40))
  const bySeverity = (a, b) =>
    (Number(b?.display_severity ?? b?.severity) || 0) -
    (Number(a?.display_severity ?? a?.severity) || 0)
  const buckets = {
    form_4: [],
    congress_trade: [],
    institutional_13f: [],
    other: [],
  }
  for (const row of rows || []) {
    if (!isTradingEventType(row?.event_type)) continue
    const key = String(row.event_type || '')
      .toLowerCase()
      .replaceAll('-', '_')
    if (key === 'form_4' || key.includes('form_4') || key.includes('insider')) {
      buckets.form_4.push(row)
    } else if (key === 'congress_trade' || key.includes('congress') || key.includes('stock_act')) {
      buckets.congress_trade.push(row)
    } else if (key === 'institutional_13f' || key.includes('13f') || key.includes('institutional')) {
      buckets.institutional_13f.push(row)
    } else {
      buckets.other.push(row)
    }
  }
  for (const list of Object.values(buckets)) list.sort(bySeverity)
  const perBucket = Math.max(6, Math.floor(cap / 3))
  const picked = []
  const seen = new Set()
  const take = (list, n) => {
    let left = n
    for (const row of list) {
      if (picked.length >= cap || left <= 0) break
      const id = String(row?.id || '')
      if (id && seen.has(id)) continue
      if (id) seen.add(id)
      picked.push(row)
      left -= 1
    }
  }
  take(buckets.form_4, perBucket)
  take(buckets.congress_trade, perBucket)
  take(buckets.institutional_13f, perBucket)
  take(
    [...buckets.form_4, ...buckets.congress_trade, ...buckets.institutional_13f, ...buckets.other].sort(
      bySeverity,
    ),
    cap,
  )
  return picked.sort(bySeverity)
}

/**
 * Parse ticker / filer / issuer labels from filing title+summary when entity.ticker is blank
 * (common for person-linked Form 4 rows).
 */
export function deriveTradingSignalMeta(event = {}) {
  const type = String(event.event_type || event.source_record_type || '')
    .toLowerCase()
    .replaceAll('-', '_')
  const title = String(event.title || '')
  const summary = String(event.summary || '')
  const blob = `${title} ${summary}`
  const blockedTickers = new Set([
    'ISSUER',
    'OWNER',
    'FILER',
    'FORM',
    'STOCK',
    'SALE',
    'BUY',
    'SELL',
    'LLC',
    'INC',
    'CORP',
  ])
  const rawTicker =
    blob.match(/\bTicker on record:\s*([A-Z0-9.\-]{1,8})\b/i)?.[1] ||
    title.match(/\(([A-Z]{1,5})\)/)?.[1] ||
    String(event.ticker || event.signal_meta?.ticker_label || '')
  const tickerCandidate = String(rawTicker || '').toUpperCase()
  const ticker_label =
    tickerCandidate &&
    /^[A-Z]{1,5}(\.[A-Z])?$/.test(tickerCandidate) &&
    !blockedTickers.has(tickerCandidate)
      ? tickerCandidate
      : null
  const cleanLabel = (value) =>
    String(value || '')
      .replace(/\s*\(Issuer\)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
  let filer_label = cleanLabel(
    summary.match(/Reporting owner:\s*([^./]+)/i)?.[1] ||
      summary.match(/Congressional STOCK Act disclosure naming\s*([^./]+)/i)?.[1] ||
      event.entity_name ||
      event.signal_meta?.filer_label ||
      '',
  )
  let issuer_label = cleanLabel(
    summary.match(/Issuer on record:\s*([^./]+)/i)?.[1] ||
      summary.match(/Asset on record:\s*([^./]+)/i)?.[1] ||
      event.signal_meta?.issuer_label ||
      '',
  )
  if (type.includes('form_4') || type.includes('insider')) {
    if (
      issuer_label &&
      filer_label &&
      issuer_label.toLowerCase() === filer_label.toLowerCase()
    ) {
      issuer_label = ''
    }
  } else if (type.includes('13f') || type.includes('institutional')) {
    if (!filer_label) filer_label = cleanLabel(event.entity_name || '')
    issuer_label = ''
  }
  const form_label =
    type.includes('13f') || type.includes('institutional')
      ? thirteenfFormLabel(title, summary)
      : null
  const period_label =
    type.includes('13f') || type.includes('institutional')
      ? thirteenfPeriodLabel(event.filing_date)
      : null
  return {
    ...(event.signal_meta && typeof event.signal_meta === 'object' ? event.signal_meta : {}),
    filer_label: filer_label || null,
    issuer_label: issuer_label || null,
    ticker_label,
    category: type || event.signal_meta?.category || null,
    ...(form_label ? { form_label } : {}),
    ...(period_label ? { period_label } : {}),
  }
}

export function tradingRecordLabel(eventType) {
  const key = String(eventType || '')
    .toLowerCase()
    .replaceAll('-', '_')
  if (key === 'form_4' || key.includes('form_4') || key.includes('insider')) return 'SEC Form 4 insider filing'
  if (key === 'congress_trade' || key.includes('congress') || key.includes('stock_act')) {
    return 'STOCK Act congressional disclosure'
  }
  if (key === 'institutional_13f' || key.includes('13f')) return 'SEC 13F institutional filing'
  return 'Trading disclosure filing'
}

function clean(value, fallback = '') {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  return text || fallback
}

function first(row, keys, fallback = '') {
  for (const key of keys) {
    if (row?.[key] != null && String(row[key]).trim()) return clean(row[key])
  }
  return fallback
}

function parseAmount(value) {
  if (value == null || value === '') return null
  const n = Number(String(value).replace(/[$,]/g, ''))
  return Number.isFinite(n) ? n : null
}

function dateOnly(value) {
  const raw = clean(value)
  if (!raw) return null
  const match = raw.match(/(\d{4}-\d{2}-\d{2})/) || raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  if (match[1]?.includes('-')) return match[1]
  const [, m, d, y] = match
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function form4Severity({ transactionCode, amount, filingDate, filerName, role, enriched } = {}) {
  const code = String(transactionCode || '').toUpperCase()
  const amt = Number(amount) || 0
  if (code === 'P' || /purchase|buy/i.test(code)) return amt >= 1_000_000 ? 92 : amt >= 100_000 ? 84 : 76
  if (code === 'S' || /sale|sell/i.test(code)) return amt >= 1_000_000 ? 88 : amt >= 100_000 ? 78 : 70

  // Without a transaction code, keep severity low and honest (no fake HOT precision).
  let score = enriched ? 56 : 48
  const name = String(filerName || '')
  const looksPerson =
    role === 'reporting' ||
    (/\s/.test(name) && !/\b(inc|llc|corp|co|ltd|plc|trust|fund|bank|corp\.|inc\.)\b/i.test(name))
  if (looksPerson) score += 4

  const filed = String(filingDate || '').slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(filed)) {
    const ageDays = Math.max(0, Math.floor((Date.now() - Date.parse(`${filed}T12:00:00Z`)) / 86400000))
    if (ageDays <= 1) score += 6
    else if (ageDays <= 7) score += 3
  }

  return Math.max(40, Math.min(62, score))
}

export function congressTradeSeverity({ amount, hasTicker } = {}) {
  const amt = Number(amount) || 0
  if (amt >= 500_000) return 90
  if (amt >= 50_000) return 82
  if (amt >= 15_000) return 74
  // PTR index rows without ticker/amount: disclosure event only.
  if (!hasTicker && !amt) return 58
  return 64
}

export function institutional13fSeverity({ amount } = {}) {
  const amt = Number(amount) || 0
  // 13F Atom is a holdings-report filing, not a trade. Cap score.
  if (amt >= 100_000_000) return 70
  if (amt >= 10_000_000) return 64
  return 52
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function cleanEdgarPartyName(value) {
  return clean(decodeHtmlEntities(value))
    .replace(/\s*\((?:Filer|Reporting|Subject)\)\s*$/i, '')
    .replace(/\s*\(\d{6,}\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build an ingest record for a Form 4 filing from EDGAR atom / JSON fields.
 */
export function mapForm4Filing(row, source, index = 0) {
  const filer = cleanEdgarPartyName(
    first(row, ['filer', 'owner', 'reporting_owner', 'ownerName', 'companyName', 'title'], `Form 4 filer ${index + 1}`),
  )
  const issuer = cleanEdgarPartyName(first(row, ['issuer', 'issuerName', 'company', 'entity'], ''))
  const ticker = first(row, ['ticker', 'symbol', 'issuerTradingSymbol'], '').toUpperCase()
  const code = first(row, ['transactionCode', 'transaction_code', 'code'], '').toUpperCase()
  const amountRaw = first(row, ['amount', 'transactionValue', 'value'], '')
  const sharesRaw = first(row, ['shares', 'transactionShares'], '')
  const amount =
    amountRaw === ''
      ? sharesRaw === ''
        ? null
        : parseAmount(sharesRaw)
      : parseAmount(amountRaw)
  const filed = dateOnly(first(row, ['filing_date', 'filed', 'updated', 'dateFiled', 'acceptanceDateTime'], null))
  const tradeDate = dateOnly(first(row, ['trade_date', 'transactionDate', 'transaction_date'], null))
  const accession =
    first(row, ['accession', 'accessionNumber'], '') ||
    (String(row?.id || '').match(/accession-number=([0-9-]+)/i) || [])[1] ||
    ''
  const cik = first(row, ['cik', 'issuerCik', 'issuer_cik', 'ownerCik', 'owner_cik'], '')
  const link = officialSecFilingUrl(
    {
      cik,
      issuer_cik: first(row, ['issuerCik', 'issuer_cik'], ''),
      owner_cik: first(row, ['ownerCik', 'owner_cik'], ''),
      accession,
      id: row?.id,
    },
    first(row, ['link', 'url', 'filing_url'], ''),
  )
  const action = /P|purchase|buy/i.test(code) ? 'purchase' : /S|sale|sell/i.test(code) ? 'sale' : 'transaction'
  const entityName = filer || issuer
  const enriched = Boolean(row?.ownership_enriched)
  const titleBits = [
    'Form 4 insider filing:',
    entityName,
    ticker ? `(${ticker})` : '',
    action !== 'transaction' ? action : '',
  ]
    .filter(Boolean)
    .join(' ')

  const event = {
    entity_name: entityName,
    event_type: 'form_4',
    title: titleBits,
    summary: [
      `SEC Form 4 filing for ${entityName}.`,
      filer ? `Reporting owner: ${filer}.` : '',
      issuer && issuer !== filer ? `Issuer on record: ${issuer}.` : '',
      ticker ? `Ticker on record: ${ticker}.` : '',
      code ? `Transaction code: ${code}.` : '',
      cik ? `CIK on record: ${cik}.` : '',
      accession ? `Accession: ${accession}.` : '',
      amount != null ? `Amount/shares field on record: ${amount}.` : '',
      tradeDate ? `Transaction date: ${tradeDate}.` : '',
      filed ? `Acceptance/filed date: ${filed}.` : '',
      enriched ? 'Fields enriched from Form 4 ownership XML.' : 'Atom title only; ownership XML enrich pending.',
      'Public EDGAR filing, not investment advice. Not a consumer report.',
    ]
      .filter(Boolean)
      .join(' '),
    jurisdiction: 'US-SEC',
    filing_date: filed,
    trade_date: tradeDate,
    owner_cik: first(row, ['ownerCik', 'owner_cik'], '') || null,
    issuer_cik: first(row, ['issuerCik', 'issuer_cik'], '') || null,
    severity: form4Severity({
      transactionCode: code,
      amount,
      filingDate: tradeDate || filed,
      filerName: filer || entityName,
      role: first(row, ['role'], '') || (filer ? 'reporting' : ''),
      enriched,
    }),
    confidence: enriched ? 94 : 78,
    status: 'open',
    evidence_url: link || null,
  }
  if (amount != null) event.amount = amount

  return {
    raw: {
      source_record_id: accession || first(row, ['id'], `${source.slug}:${filer}:${filed || index}`),
      fetched_url: link || null,
      payload: row,
    },
    event,
  }
}

/**
 * Build an ingest record for a STOCK Act / congressional PTR disclosure.
 */
export function mapCongressTrade(row, source, index = 0) {
  const member = first(
    row,
    ['representative', 'senator', 'member', 'name', 'filer'],
    `Member ${index + 1}`,
  )
  const tickerRaw = first(row, ['ticker', 'symbol'], '')
  const ticker = !tickerRaw || /^(-+|n\/?a)$/i.test(tickerRaw) ? '' : tickerRaw.toUpperCase()
  const issuer = first(row, ['asset_description', 'assetDescription', 'issuer', 'company'], ticker || '')
  const amount = parseAmount(first(row, ['amount', 'amount_range_max', 'transactionValue', 'value'], null))
  const filed = dateOnly(
    first(row, ['disclosure_date', 'filed', 'filing_date', 'FilingDate'], null),
  )
  const tradeDate = dateOnly(first(row, ['transaction_date', 'trade_date', 'date'], null))
  const chamber = first(row, ['chamber', 'house', 'senate'], source?.jurisdiction || 'US-Congress')
  const link = first(row, ['ptr_link', 'link', 'url', 'filing_url'], source?.source_url || '')
  const side = first(row, ['type', 'transaction_type', 'side'], '')

  const event = {
    entity_name: member,
    event_type: 'congress_trade',
    title: `STOCK Act disclosure: ${member}${ticker ? ` · ${ticker}` : ''}`,
    summary: [
      `Congressional STOCK Act disclosure naming ${member}.`,
      issuer ? `Asset on record: ${issuer}.` : '',
      ticker ? `Ticker on record: ${ticker}.` : '',
      side ? `Transaction type: ${side}.` : '',
      amount != null ? `Amount field on record: ${amount}.` : '',
      tradeDate ? `Transaction date: ${tradeDate}.` : '',
      filed ? `Disclosure filed ${filed}.` : '',
      !ticker && !amount
        ? 'PTR index row: open the filing PDF for ticker, side, and amount.'
        : '',
      'Public financial-disclosure filing, not investment advice. Not a consumer report.',
    ]
      .filter(Boolean)
      .join(' '),
    jurisdiction: chamber,
    filing_date: filed || tradeDate,
    trade_date: tradeDate,
    severity: congressTradeSeverity({ amount, hasTicker: Boolean(ticker) }),
    confidence: ticker || amount != null ? 86 : 80,
    status: 'open',
    evidence_url: link || null,
  }
  if (amount != null) event.amount = amount

  return {
    raw: {
      source_record_id: first(row, ['id', 'ptr_id'], `${source.slug}:${member}:${filed || tradeDate || index}:${issuer || ticker || 'ptr'}`),
      fetched_url: link || source?.source_url || null,
      payload: row,
    },
    event,
  }
}

/**
 * EDGAR 13F atom titles look like "13F-HR - Manager" or "13F-HR/A - Manager".
 * Atom rows do not include a single ticker or trade amount.
 */
export function thirteenfFormLabel(title = '', summary = '') {
  const blob = `${title} ${summary}`
  const tagged = blob.match(/Form on record:\s*(13F(?:-(?:HR|NT))?(?:\/A)?)/i)
  if (tagged) {
    const raw = String(tagged[1] || '').toUpperCase()
    return raw === '13F' ? '13F-HR' : raw
  }
  const match = blob.match(/\b13F(?:-(HR|NT))?(\/A)?\b/i)
  if (!match) return '13F-HR'
  const kind = String(match[1] || 'HR').toUpperCase()
  return `13F-${kind}${match[2] ? '/A' : ''}`
}

/** Coverage quarter implied by a 13F acceptance/filed date (due ~45 days after quarter end). */
export function thirteenfPeriodLabel(filingDate) {
  const raw = String(filingDate || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ''
  const year = Number(raw.slice(0, 4))
  const month = Number(raw.slice(5, 7))
  if (month <= 2) return `Q4 ${year - 1}`
  if (month <= 5) return `Q1 ${year}`
  if (month <= 8) return `Q2 ${year}`
  if (month <= 11) return `Q3 ${year}`
  return `Q3 ${year}`
}

/**
 * Build an ingest record for a 13F institutional holdings filing.
 */
export function mapInstitutional13f(row, source, index = 0) {
  const filer = first(row, ['filer', 'manager', 'companyName', 'name'], `13F filer ${index + 1}`)
  const amount = parseAmount(first(row, ['value', 'amount', 'aum', 'tableValueTotal'], null))
  const filed = dateOnly(first(row, ['filing_date', 'filed', 'updated', 'dateFiled', 'periodOfReport'], null))
  const accession =
    first(row, ['accession', 'accessionNumber'], '') ||
    (String(row?.id || '').match(/accession-number=([0-9-]+)/i) || [])[1] ||
    ''
  const link = officialSecFilingUrl(
    {
      cik: first(row, ['cik', 'filerCik', 'filer_cik'], ''),
      issuer_cik: first(row, ['cik', 'filerCik', 'filer_cik'], ''),
      accession,
      id: row?.id,
    },
    first(row, ['link', 'url', 'filing_url'], ''),
  )
  const holdings = first(row, ['holdings_count', 'entryCount'], '')
  const form = thirteenfFormLabel(row?.title || row?.form || '', '')
  const period = thirteenfPeriodLabel(filed)

  const event = {
    entity_name: filer,
    event_type: 'institutional_13f',
    title: `${form} institutional filing: ${filer}`,
    summary: [
      `SEC ${form} holdings report for ${filer}.`,
      'This is a quarterly holdings filing, not a buy/sell trade ticket.',
      `Form on record: ${form}.`,
      period ? `Report period: ${period}.` : '',
      first(row, ['cik', 'filerCik', 'filer_cik'], '')
        ? `CIK on record: ${first(row, ['cik', 'filerCik', 'filer_cik'], '')}.`
        : '',
      accession ? `Accession: ${accession}.` : '',
      holdings ? `Holdings entries on record: ${holdings}.` : '',
      amount != null ? `Reported value field: ${amount}.` : '',
      filed ? `Acceptance/filed date: ${filed}.` : '',
      'Public EDGAR filing, not investment advice. Not a consumer report.',
    ]
      .filter(Boolean)
      .join(' '),
    jurisdiction: 'US-SEC',
    filing_date: filed,
    trade_date: null,
    severity: institutional13fSeverity({ amount }),
    confidence: 82,
    status: 'open',
    evidence_url: link || null,
    grain: 'holdings_report',
  }
  if (amount != null) event.amount = amount

  return {
    raw: {
      source_record_id: accession || first(row, ['id'], `${source.slug}:${filer}:${filed || index}`),
      fetched_url: link || null,
      payload: row,
    },
    event,
  }
}

/**
 * Parse EDGAR Atom feed entries into plain objects.
 * Expects Atom XML text from browse-edgar output=atom.
 */
export function parseEdgarAtomEntries(xmlText, { formPrefix = null } = {}) {
  const text = String(xmlText || '')
  const entries = []
  const blocks = text.split(/<entry[\s>]/i).slice(1)
  for (const block of blocks) {
    const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]
    const updated = (block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) || [])[1]
    const id = (block.match(/<id[^>]*>([\s\S]*?)<\/id>/i) || [])[1]
    const link =
      (block.match(/<link[^>]*href="([^"]+)"[^/]*\/>/i) || [])[1] ||
      (block.match(/<link[^>]*href="([^"]+)"[^>]*>/i) || [])[1]
    const summary = (block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [])[1]
    const cleanTitle = clean(String(title || '').replace(/<!\[CDATA\[|\]\]>/g, ''))
    if (!cleanTitle) continue
    // EDGAR type= is a prefix match (type=4 also returns 424B2, 40-APP, etc).
    if (formPrefix === '4' && !/^4\s*-/i.test(cleanTitle)) continue
    if (formPrefix === '13F' && !/^13F/i.test(cleanTitle)) continue
    // Typical title: "4 - Name (TICKER) (CIK) (Reporting|Issuer|Filer)"
    const roleMatch = cleanTitle.match(/\((Reporting|Issuer|Filer)\)\s*$/i)
    const roleRaw = String(roleMatch?.[1] || '').toLowerCase()
    const role =
      roleRaw === 'reporting' || roleRaw === 'filer'
        ? 'reporting'
        : roleRaw === 'issuer'
          ? 'issuer'
          : 'unknown'
    const titleCore = cleanTitle.replace(/\s*\((?:Reporting|Issuer|Filer)\)\s*$/i, '')
    const issuerMatch = titleCore.match(
      /^4\s*-\s*(.+?)(?:\s*\(([A-Z][A-Z0-9.\-]{0,7})\))?(?:\s*\(\d+\))?$/i,
    )
    const thirteenMatch = titleCore.match(/^13F[\w-]*\s*-\s*(.+?)(?:\s*\(\d+\))?$/i)
    const accession =
      (String(id || '').match(/accession-number=([0-9-]+)/i) || [])[1] ||
      (String(link || '').match(/\b(\d{10}-\d{2}-\d{6})\b/) || [])[1] ||
      ''
    const cik =
      (titleCore.match(/\((\d{6,10})\)\s*$/) || [])[1] ||
      (cleanTitle.match(/\((\d{6,10})\)/) || [])[1] ||
      (String(link || '').match(/\/Archives\/edgar\/data\/(\d+)\//i) || [])[1] ||
      ''
    let companyName = cleanEdgarPartyName(issuerMatch?.[1] || thirteenMatch?.[1] || titleCore)
    // Collapse accidental doubled names from noisy EDGAR titles.
    const half = Math.floor(companyName.length / 2)
    if (
      companyName.length > 8 &&
      companyName.slice(0, half).trim().toLowerCase() === companyName.slice(half).trim().toLowerCase()
    ) {
      companyName = companyName.slice(0, half).trim()
    }
    entries.push({
      title: cleanTitle,
      companyName,
      role,
      ticker: clean(issuerMatch?.[2] || ''),
      updated: clean(updated),
      filing_date: dateOnly(updated),
      id: clean(id),
      link: clean(link),
      accession,
      cik,
      summary: clean(String(summary || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ')),
    })
  }
  return entries
}
