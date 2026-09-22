import {
  buildWarnJurisdiction,
  buildWarnSummary,
  buildWarnTitle,
  parseWorkerCount,
  warnConfidenceFromWorkers,
  warnSeverityFromWorkers,
} from '../frontend/functions/lib/warn-notice.js'
import {
  mapCaliforniaWarnRows,
  mapIllinoisWarnRows,
  mapNewYorkWarnRows,
  parseCsvRows,
} from '../frontend/functions/lib/warn-ingest.js'
import { parseCaliforniaWarnXlsx } from '../frontend/functions/lib/warn-xlsx.js'
import {
  mapCongressTrade,
  mapForm4Filing,
  mapInstitutional13f,
  parseEdgarAtomEntries,
} from '../frontend/functions/lib/trading-filings.js'
import { enrichForm4EntryFromOwnership } from '../frontend/functions/lib/form4-ownership.js'
import { fetchHouseClerkPtrIndex } from '../frontend/functions/lib/house-clerk-ptr.js'

const SOURCES = [
  {
    slug: 'sec-edgar-form4',
    name: 'SEC EDGAR Form 4 Filings',
    jurisdiction: 'US-SEC',
    record_type: 'form_4',
    access_method: 'api',
    terms_status: 'approved',
    // EDGAR type= is prefix-matched; request more rows and keep exact Form 4 / 13F titles.
    source_url:
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&company=&dateb=&owner=include&count=100&output=atom',
    adapter_kind: 'sec_edgar_form4_atom',
    batch_size: 80,
  },
  {
    slug: 'sec-edgar-13f',
    name: 'SEC EDGAR 13F Institutional Filings',
    jurisdiction: 'US-SEC',
    record_type: 'institutional_13f',
    access_method: 'api',
    terms_status: 'approved',
    source_url:
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=13F&company=&dateb=&owner=include&count=100&output=atom',
    adapter_kind: 'sec_edgar_13f_atom',
    batch_size: 60,
    notes:
      '13F Atom is holdings-report filings (manager filed), not per-ticker buy/sell tickets.',
  },
  {
    slug: 'house-stock-act-ptr',
    name: 'House STOCK Act Periodic Transaction Reports',
    jurisdiction: 'US-House',
    record_type: 'congress_trade',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure',
    // Official Clerk FD ZIP index (FilingType P). Third-party JSON mirrors are dead (403/404).
    adapter_kind: 'house_clerk_ptr_index',
    batch_size: 80,
  },
  {
    slug: 'senate-stock-act-efd',
    name: 'Senate STOCK Act eFD Disclosures',
    jurisdiction: 'US-Senate',
    record_type: 'congress_trade',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://efdsearch.senate.gov/search/',
    adapter_kind: 'senate_stock_act_efd',
    // Official eFD is session-gated; S3 mirror 403; public GitHub aggregate ends ~2020 (stale).
    // Adapter refuses stale dumps and reports degraded until a live structured feed exists.
    data_url:
      'https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/aggregate/all_transactions.json',
    batch_size: 80,
  },
  {
    slug: 'texas-warn-notices',
    name: 'Texas WARN Notices',
    jurisdiction: 'TX',
    record_type: 'warn_notice',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://data.austintexas.gov/resource/8w53-c4f6.json',
    adapter_kind: 'warn_public',
    params: { $limit: '250', $order: 'wfdd_received_date DESC' },
    fallback_params: { $limit: '250', $order: 'notice_date DESC' },
  },
  {
    slug: 'oregon-warn-notices',
    name: 'Oregon WARN Notices',
    jurisdiction: 'OR',
    record_type: 'warn_notice',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://data.oregon.gov/resource/ijbz-jpx8.json',
    adapter_kind: 'warn_public',
    params: { $limit: '250', $where: 'layoff_date is not null', $order: 'received_date DESC' },
  },
  {
    slug: 'california-warn-notices',
    name: 'California WARN Notices',
    jurisdiction: 'CA',
    record_type: 'warn_notice',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report1.xlsx',
    adapter_kind: 'warn_ca_xlsx',
    fallback_url: 'https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report.xlsx',
  },
  {
    slug: 'illinois-warn-notices',
    name: 'Illinois WARN Notices',
    jurisdiction: 'IL',
    record_type: 'warn_notice',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://apps.illinoisworknet.com/iebs/api/public/searchWarn',
    adapter_kind: 'warn_il_api',
    params: {
      search: '',
      take: 250,
      skip: 0,
      column: 'InitialReportDate',
      columnSort: -1,
      direction: '-1',
      statuses: [4],
      resultsView: 1,
    },
  },
  {
    slug: 'new-york-warn-notices',
    name: 'New York WARN Notices',
    jurisdiction: 'NY',
    record_type: 'warn_notice',
    access_method: 'api',
    terms_status: 'approved',
    source_url:
      'https://public.tableau.com/views/WorkerAdjustmentRetrainingNotificationWARN/WARN?:showVizHome=no&:embed=y&:format=csv',
    adapter_kind: 'warn_ny_csv',
  },
  {
    slug: 'courtlistener-search',
    name: 'CourtListener Search API',
    jurisdiction: 'US-Federal',
    record_type: 'civil_docket',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    query: 'bankruptcy adversary proceeding',
  },
  {
    slug: 'courtlistener-chapter-11-business',
    name: 'CourtListener Chapter 11 Business Filings',
    jurisdiction: 'US-Bankruptcy',
    record_type: 'bankruptcy_chapter_11',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    query: '"chapter 11" ("LLC" OR "Inc" OR "Corporation" OR "Company" OR "Holdings" OR "LP" OR "Group")',
    params: { order_by: 'dateFiled desc' },
  },
  {
    slug: 'courtlistener-recap-bankruptcy-dockets',
    name: 'CourtListener RECAP Bankruptcy Dockets',
    jurisdiction: 'US-Bankruptcy',
    record_type: 'bankruptcy_docket',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/dockets/',
    adapter_kind: 'courtlistener_dockets',
    auth_env_var: 'COURTLISTENER_API_TOKEN',
    params: {
      court__jurisdiction: 'FB',
      page_size: '25',
    },
  },
  {
    slug: 'courtlistener-chapter-7-business',
    name: 'CourtListener Chapter 7 Business Liquidations',
    jurisdiction: 'US-Bankruptcy',
    record_type: 'bankruptcy_chapter_7',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    query: '"chapter 7" ("LLC" OR "Inc" OR "Corporation" OR "Company" OR "Holdings" OR "LP" OR "Group")',
    params: { order_by: 'dateFiled desc' },
  },
  {
    slug: 'courtlistener-receivership',
    name: 'CourtListener Receivership Records',
    jurisdiction: 'US-Federal',
    record_type: 'receivership',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    query: '("receiver appointed" OR receivership) ("LLC" OR "Inc" OR "Corporation" OR "Company" OR "Holdings")',
    params: { order_by: 'dateFiled desc' },
  },
  {
    slug: 'courtlistener-secured-creditor',
    name: 'CourtListener Secured Creditor Disputes',
    jurisdiction: 'US-Federal',
    record_type: 'creditor_dispute',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    query: '("secured creditor" OR "creditors committee" OR "debtor in possession") ("LLC" OR "Inc" OR "Corporation" OR "Company" OR "Holdings")',
    params: { order_by: 'dateFiled desc' },
  },
  {
    slug: 'courtlistener-liens',
    name: 'CourtListener Lien Search',
    jurisdiction: 'US-Federal',
    record_type: 'mechanics_lien',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    search_types: ['d', 'r'],
    page_size: 40,
    params: { order_by: 'dateFiled desc' },
    query: '(lien OR "mechanics lien" OR "construction lien" OR "mechanic\'s lien")',
  },
  {
    slug: 'courtlistener-noi',
    name: 'CourtListener Notice Search',
    jurisdiction: 'US-Federal',
    record_type: 'notice_of_intent',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    search_type: 'd',
    query: '"notice of intent" sue OR "notice of intent to sue"',
  },
  {
    slug: 'cook-county-liens',
    name: 'Cook County Recorder Public Index',
    jurisdiction: 'US-IL-Cook',
    record_type: 'mechanics_lien',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    search_types: ['d', 'r'],
    page_size: 30,
    params: { order_by: 'dateFiled desc' },
    query: '("mechanics lien" OR "construction lien") AND ("Cook County" OR Chicago OR Illinois)',
  },
  {
    slug: 'ok-county-records',
    name: 'OKCountyRecords API',
    jurisdiction: 'US-OK',
    record_type: 'mechanics_lien',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    search_types: ['d', 'r'],
    page_size: 30,
    params: { order_by: 'dateFiled desc' },
    query: '("mechanics lien" OR "construction lien") AND Oklahoma',
  },
  {
    slug: 'texas-liens',
    name: 'Texas Mechanics Lien Search',
    jurisdiction: 'US-TX',
    record_type: 'mechanics_lien',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    search_types: ['d', 'r'],
    page_size: 30,
    params: { order_by: 'dateFiled desc' },
    query: '("mechanics lien" OR "construction lien") AND Texas',
  },
  {
    slug: 'florida-liens',
    name: 'Florida Mechanics Lien Search',
    jurisdiction: 'US-FL',
    record_type: 'mechanics_lien',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    search_types: ['d', 'r'],
    page_size: 30,
    params: { order_by: 'dateFiled desc' },
    query: '("mechanics lien" OR "construction lien") AND Florida',
  },
  {
    slug: 'california-liens',
    name: 'California Mechanics Lien Search',
    jurisdiction: 'US-CA',
    record_type: 'mechanics_lien',
    access_method: 'api',
    terms_status: 'approved',
    source_url: 'https://www.courtlistener.com/api/rest/v4/search/',
    adapter_kind: 'courtlistener_search',
    search_types: ['d', 'r'],
    page_size: 30,
    params: { order_by: 'dateFiled desc' },
    query: '("mechanics lien" OR "construction lien") AND California',
  },
]

import { isValidTicker, matchTickerForCompany, resolveTickerCache } from './match-ticker.js'
import { companyNameForTickerMatch, isLikelyTickerMatchName } from './company-name.js'

const BUSINESS_MARKER_RE = /\b(llc|l\.l\.c|inc|inc\.|corp|corp\.|corporation|co\.|company|limited|ltd|lp|l\.p\.|llp|holdings?|group|partners?|bank|credit union|capital|fund|trustee|enterprises?|industries|services|solutions|systems|technologies|properties|realty|ventures|plc|s\.a\.|n\.v\.)\b/i
const INDIVIDUAL_CAPTION_RE = /\b(in re|matter of)\s+[a-z'-]+,\s+[a-z'-]+\b/i
const FINANCIAL_DISTRESS_TYPES = new Set([
  'bankruptcy_chapter_11',
  'bankruptcy_chapter_7',
  'bankruptcy_docket',
  'bankruptcy_adversary',
  'receivership',
  'creditor_dispute',
])

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

function supabaseUrl(env) {
  return String(env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '')
}

function serviceKey(env) {
  return String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
}

function requireSupabase(env) {
  if (!supabaseUrl(env) || !serviceKey(env)) throw new Error('missing_supabase_env')
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function requestFetch(url, init = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), init.timeout || 20_000)
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'VortxIngest/1.0', ...(init.headers || {}) },
      method: init.method || 'GET',
      body: init.body,
      signal: controller.signal,
    })
    if (response.status === 429) {
      const retry = response.headers.get('retry-after')
      throw new Error(`rate_limited${retry ? `:retry_after_${retry}` : ''}:${url}`)
    }
    if (!response.ok) throw new Error(`fetch_failed:${response.status}:${url}`)
    return response
  } finally {
    clearTimeout(timeout)
  }
}

async function requestJson(url, init = {}) {
  const response = await requestFetch(url, {
    ...init,
    headers: { accept: 'application/json', ...(init.headers || {}) },
  })
  return response.json()
}

async function requestText(url, init = {}) {
  const response = await requestFetch(url, init)
  return response.text()
}

async function requestBytes(url, init = {}) {
  const response = await requestFetch(url, init)
  return response.arrayBuffer()
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function supabaseRequest(env, method, table, body, query = '') {
  requireSupabase(env)
  const suffix = query ? `?${query}` : ''
  const response = await fetch(`${supabaseUrl(env)}/rest/v1/${table}${suffix}`, {
    method,
    headers: {
      apikey: serviceKey(env),
      authorization: `Bearer ${serviceKey(env)}`,
      'content-type': 'application/json',
      accept: 'application/json',
      prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(`supabase_${method}_${table}_failed:${response.status}:${text}`)
  return payload || []
}

async function supabaseRpc(env, functionName, body) {
  requireSupabase(env)
  const response = await fetch(`${supabaseUrl(env)}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey(env),
      authorization: `Bearer ${serviceKey(env)}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(`supabase_rpc_${functionName}_failed:${response.status}:${text}`)
  return payload
}

function qs(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) search.set(key, String(value))
  return search.toString()
}

function postgrestEq(value) {
  const text = String(value ?? '')
  if (/[",()]/.test(text)) return `eq."${text.replace(/"/g, '""')}"`
  return `eq.${text}`
}

function clean(value, fallback = '') {
  return String(value ?? fallback).trim()
}

function parseDate(value) {
  const text = clean(value)
  if (!text) return new Date().toISOString().slice(0, 10)
  if (/^\d{2}\/\d{2}\/\d{4}/.test(text)) {
    const [month, day, year] = text.slice(0, 10).split('/')
    return `${year}-${month}-${day}`
  }
  return text.slice(0, 10)
}

function first(row, names, fallback = '') {
  for (const name of names) {
    if (row?.[name] !== undefined && clean(row[name])) return clean(row[name])
  }
  return fallback
}

function stripCasePrefix(value) {
  return clean(value)
    .replace(/^in re[:\s]+/i, '')
    .replace(/^in the matter of[:\s]+/i, '')
    .trim()
}

function businessTargetText(value) {
  const caption = stripCasePrefix(value)
  const adversarial = caption.split(/\s+v\.?\s+/i)
  return adversarial.length > 1 ? adversarial.slice(1).join(' v. ') : caption
}

function isLikelyBusinessRecord(title, recordType) {
  if (!FINANCIAL_DISTRESS_TYPES.has(recordType)) return true
  const caption = stripCasePrefix(title)
  const target = businessTargetText(title)
  if (/revocable trust|living trust|estate of|as trustee of/i.test(target) && !/\b(llc|inc|corp|company|holdings|lp|l\.p\.)\b/i.test(target)) return false
  if (BUSINESS_MARKER_RE.test(target)) return true
  if (!/\s+v\.?\s+/i.test(caption) && BUSINESS_MARKER_RE.test(caption)) return true
  if (INDIVIDUAL_CAPTION_RE.test(title)) return false
  if (/^[A-Z][a-z'-]+,\s+[A-Z][a-z'-]+/.test(caption)) return false
  return false
}

function isBankruptcyMatter(eventType, row, title) {
  if (!eventType.startsWith('bankruptcy_')) return true
  const court = first(row, ['court', 'court_id'], '')
  const snippet = first(row, ['snippet', 'plain_text'], '')
  const text = `${title} ${court} ${snippet}`.toLowerCase()
  const hasBankruptcyContext =
    court.toLowerCase().includes('bankruptcy') ||
    /^in re[:\s]/i.test(title) ||
    text.includes('bankruptcy court') ||
    text.includes('debtor in possession') ||
    text.includes('chapter 11 debtor') ||
    text.includes('chapter 7 trustee')
  const chapterMatches =
    (eventType === 'bankruptcy_chapter_11' && text.includes('chapter 11')) ||
    (eventType === 'bankruptcy_chapter_7' && text.includes('chapter 7')) ||
    eventType === 'bankruptcy_adversary'

  return hasBankruptcyContext && chapterMatches
}

function financialEventType(source, row, title) {
  if (source.record_type === 'mechanics_lien') return 'mechanics_lien'
  if (source.record_type === 'notice_of_intent') return 'notice_of_intent'
  if (source.record_type !== 'civil_docket') return source.record_type
  const text = `${title} ${first(row, ['snippet', 'plain_text'], '')}`.toLowerCase()
  if (/mechanics lien|construction lien|mechanic'?s lien/.test(text)) return 'mechanics_lien'
  if (/notice of intent/.test(text)) return 'notice_of_intent'
  if (text.includes('adversary proceeding')) return 'bankruptcy_adversary'
  return 'civil_docket'
}

function financialSeverity(eventType) {
  if (eventType === 'bankruptcy_docket') return 90
  if (eventType === 'bankruptcy_chapter_7') return 92
  if (eventType === 'bankruptcy_chapter_11') return 88
  if (eventType === 'receivership') return 86
  if (eventType === 'bankruptcy_adversary') return 78
  if (eventType === 'creditor_dispute') return 72
  if (eventType === 'notice_of_intent') return 62
  if (eventType === 'mechanics_lien') return 74
  return 58
}

function financialLabel(eventType) {
  if (eventType === 'bankruptcy_docket') return 'Business bankruptcy docket'
  if (eventType === 'bankruptcy_chapter_11') return 'Chapter 11 business bankruptcy record'
  if (eventType === 'bankruptcy_chapter_7') return 'Chapter 7 business bankruptcy record'
  if (eventType === 'receivership') return 'Receivership record'
  if (eventType === 'bankruptcy_adversary') return 'Bankruptcy adversary proceeding'
  if (eventType === 'creditor_dispute') return 'Secured-creditor dispute'
  if (eventType === 'notice_of_intent') return 'Pre-suit notice'
  if (eventType === 'mechanics_lien') return 'Mechanics or construction lien'
  if (eventType === 'form_4') return 'SEC Form 4 insider filing'
  if (eventType === 'congress_trade') return 'STOCK Act congressional disclosure'
  if (eventType === 'institutional_13f') return 'SEC 13F institutional filing'
  return 'Court record'
}

function storageEventType(eventType) {
  if (eventType === 'notice_of_intent') return 'notice_of_intent'
  if (eventType === 'mechanics_lien') return 'mechanics_lien'
  if (eventType === 'form_4') return 'form_4'
  if (eventType === 'congress_trade') return 'congress_trade'
  if (eventType === 'institutional_13f') return 'institutional_13f'
  if (eventType === 'warn_notice') return 'warn_notice'
  return 'civil_docket'
}

function sourceHasRequiredAuth(source, env) {
  return !source.auth_env_var || Boolean(String(env?.[source.auth_env_var] || '').trim())
}

function sourceRow(source, env = {}, { ok = false, recordCount = 0, error = null } = {}) {
  const hasAuth = sourceHasRequiredAuth(source, env)
  const success = Boolean(ok && recordCount > 0 && !error)
  const notes = error
    ? `Ingest degraded: ${String(error).slice(0, 220)}`
    : source.notes ||
      (hasAuth
        ? `Automated scheduled ingest source. Last batch ${recordCount} row(s).`
        : `Configured but disabled until ${source.auth_env_var} is set.`)
  return {
    slug: source.slug,
    name: source.name,
    jurisdiction: source.jurisdiction,
    record_type: source.record_type,
    access_method: source.access_method,
    terms_status: source.terms_status,
    refresh_cadence: 'hourly',
    source_url: source.source_url,
    enabled: hasAuth,
    notes,
    // Only stamp last_success_at when rows actually landed (source honesty).
    last_success_at: success ? new Date().toISOString() : null,
    adapter_kind: source.adapter_kind,
    rate_limit_per_hour: 120,
    auth_env_var: source.auth_env_var || null,
    terms_reviewed_at: new Date().toISOString(),
    disabled_reason: hasAuth ? null : `Missing ${source.auth_env_var}`,
    config: { ...(source.params || {}), ...(source.query ? { query: source.query } : {}) },
  }
}

async function fetchWarnCalifornia(source) {
  let buffer = await requestBytes(source.source_url, {
    headers: { accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  })
  let rows = await parseCaliforniaWarnXlsx(buffer)
  if ((!rows || !rows.length) && source.fallback_url) {
    buffer = await requestBytes(source.fallback_url, {
      headers: { accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    })
    rows = await parseCaliforniaWarnXlsx(buffer)
  }
  return mapCaliforniaWarnRows(rows || [], source)
}

async function fetchWarnIllinois(source) {
  const payload = {
    ...(source.params || {}),
    direction: String(source.params?.columnSort ?? -1),
  }
  const data = await requestJson(source.source_url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  const rows = Array.isArray(data?.Layoffs) ? data.Layoffs : []
  return mapIllinoisWarnRows(rows, source)
}

async function fetchWarnNewYork(source) {
  const text = await requestText(source.source_url, {
    headers: { accept: 'text/csv,*/*' },
  })
  const rows = parseCsvRows(text)
  return mapNewYorkWarnRows(rows, source)
}

async function fetchWarn(source) {
  let rows = await requestJson(`${source.source_url}?${qs(source.params)}`)
  if ((!rows || !rows.length) && source.fallback_params) {
    rows = await requestJson(`${source.source_url}?${qs(source.fallback_params)}`)
  }
  if (!Array.isArray(rows)) return []

  return rows.map((row, index) => {
    const entity = first(
      row,
      ['company_name', 'company', 'Company Name', 'job_site_name', 'job_site', 'site_name', 'employer'],
      `WARN entity ${index + 1}`,
    )
    const workers = parseWorkerCount(
      first(row, [
        'employees_affected',
        'affected_employees',
        'total_layoff_number',
        'laid_off',
        'Laid Off',
        'number_of_workers',
        'workers',
      ]),
    )
    const city = first(row, ['city', 'city_name', 'City', 'job_site_city'])
    const county = first(row, ['county_name', 'county', 'County'])
    const state = first(row, ['state', 'State'], source.jurisdiction)
    const layoffType = first(row, ['layoff_type', 'Layoff Type', 'notice_type', 'type'])
    const noticeDate = parseDate(
      first(row, ['notice_date', 'received_date', 'wfdd_received_date', 'Received Date', 'date_received']),
    )
    const effectiveDate = parseDate(first(row, ['layoff_date', 'Layoff Date', 'effective_date', 'closure_date']))
    const filingDate = noticeDate || effectiveDate
    const jurisdiction = buildWarnJurisdiction({ city, county, state, fallback: source.jurisdiction })
    const sourceRecordId = first(row, ['notice_id', 'id', 'record_id', 'warn', 'WARN#'], `${source.slug}-${index + 1}`)
    const severity = warnSeverityFromWorkers(workers)
    const confidence = warnConfidenceFromWorkers(workers)

    return {
      raw: { source_record_id: sourceRecordId, fetched_url: source.source_url, payload: row },
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
  })
}

function courtListenerSearchType(source) {
  return source.search_type || source.params?.type || 'd'
}

function isLienOrNoticeSource(source) {
  return (
    source.record_type === 'mechanics_lien' ||
    source.record_type === 'notice_of_intent' ||
    source.slug === 'courtlistener-liens' ||
    source.slug === 'courtlistener-noi'
  )
}

function entityFromLienCaption(title) {
  const caption = stripCasePrefix(title)
  const parts = caption.split(/\s+v\.?\s+/i)
  if (parts.length > 1) {
    for (const party of [parts[0], parts[1]]) {
      const name = String(party || '').trim()
      if (BUSINESS_MARKER_RE.test(name)) return name
    }
  }
  return caption
}

function courtListenerSearchTypes(source) {
  if (Array.isArray(source.search_types) && source.search_types.length) return source.search_types
  return [courtListenerSearchType(source)]
}

async function fetchCourtListenerResultRows(source, env) {
  const headers = env.COURTLISTENER_API_TOKEN ? { authorization: `Token ${env.COURTLISTENER_API_TOKEN}` } : {}
  const pageSize = String(source.page_size || 20)
  const merged = []
  const seen = new Set()

  for (const searchType of courtListenerSearchTypes(source)) {
    const searchParams = {
      q: source.query,
      page_size: pageSize,
      type: searchType,
      ...(source.params || {}),
    }
    const params = qs(searchParams)
    const url = `${source.source_url}?${params}`
    let payload
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        payload = await requestJson(url, { headers, timeout: 30_000 })
        break
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const retryMatch = message.match(/retry_after_(\d+)/)
        if (!retryMatch || attempt >= 2) throw error
        await sleep((Number(retryMatch[1]) + 1) * 1000)
      }
    }
    for (const row of payload.results || []) {
      const key = String(row.id || row.absolute_url || row.cluster_id || row.docket_id || '')
      if (!key || seen.has(key)) continue
      seen.add(key)
      merged.push(row)
    }
    if (courtListenerSearchTypes(source).length > 1) {
      await sleep(Number(env.INGEST_SOURCE_DELAY_MS || 1250))
    }
  }

  return merged
}

function mapCourtListenerRow(source, row, index) {
  const title = first(row, ['caseName', 'caseNameFull', 'caption', 'case_name'], 'Court record signal')
  const eventType = financialEventType(source, row, title)
  if (!isLikelyBusinessRecord(title, eventType)) return null
  if (!isLienOrNoticeSource(source) && !isBankruptcyMatter(eventType, row, title)) return null
  if (isLienOrNoticeSource(source) && eventType === 'mechanics_lien') {
    const text = `${title} ${first(row, ['snippet', 'plain_text'], '')}`.toLowerCase()
    if (!/lien|mechanic|construction/.test(text)) return null
  }

  let url = clean(row.absolute_url || row.cluster?.absolute_url, source.source_url)
  if (url.startsWith('/')) url = `https://www.courtlistener.com${url}`
  const snippet = first(row, ['snippet', 'plain_text'], `CourtListener search result for ${title}.`)
  const label = financialLabel(eventType)
  const severity = financialSeverity(eventType)
  const confidence = FINANCIAL_DISTRESS_TYPES.has(eventType) ? 78 : 72
  const entityName = isLienOrNoticeSource(source) ? entityFromLienCaption(title) : stripCasePrefix(title)

  return {
    raw: { source_record_id: clean(row.absolute_url || row.cluster_id || row.id, `${source.slug}-${index + 1}`), fetched_url: url, payload: row },
    event: {
      entity_name: entityName,
      event_type: storageEventType(eventType),
      title: `${label}: ${stripCasePrefix(title)}`,
      summary: `${snippet} This is a public-record financial-distress signal for business review, not a credit report, prediction, or judgment.`,
      jurisdiction: first(row, ['court', 'court_id'], source.jurisdiction),
      filing_date: parseDate(first(row, ['dateFiled', 'date_filed', 'dateArgued', 'date_created'])),
      amount: null,
      severity,
      confidence,
      status: 'open',
      evidence_url: url,
    },
  }
}

async function fetchCourtListener(source, env) {
  const rows = await fetchCourtListenerResultRows(source, env)
  return rows.flatMap((row, index) => {
    const mapped = mapCourtListenerRow(source, row, index)
    return mapped ? [mapped] : []
  })
}

async function fetchCourtListenerDockets(source, env) {
  if (!sourceHasRequiredAuth(source, env)) return []

  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - 180)
  const params = qs({
    ...(source.params || {}),
    date_filed__gte: cutoff.toISOString().slice(0, 10),
  })
  const headers = { authorization: `Token ${env[source.auth_env_var]}` }
  const payload = await requestJson(`${source.source_url}?${params}`, { headers, timeout: 30_000 })
  const rows = payload.results || []

  return rows.flatMap((row, index) => {
    const title = first(row, ['case_name', 'case_name_full', 'caption'], 'Bankruptcy docket signal')
    const eventType = 'bankruptcy_docket'
    if (!isLikelyBusinessRecord(title, eventType)) return []

    const chapter = clean(row.chapter)
    const docketNumber = clean(row.docket_number)
    const court = clean(row.court, source.jurisdiction)
    let url = clean(row.absolute_url, source.source_url)
    if (url.startsWith('/')) url = `https://www.courtlistener.com${url}`

    return {
      raw: {
        source_record_id: clean(row.id || docketNumber, `${source.slug}-${index + 1}`),
        fetched_url: url,
        payload: row,
      },
      event: {
        entity_name: stripCasePrefix(title),
        event_type: storageEventType(eventType),
        title: `${financialLabel(eventType)}: ${stripCasePrefix(title)}`,
        summary:
          `RECAP bankruptcy docket metadata${chapter ? ` references Chapter ${chapter}` : ''}` +
          `${docketNumber ? `, docket ${docketNumber}` : ''}` +
          `${clean(row.case_name_full) && clean(row.case_name_full) !== stripCasePrefix(title) ? `. Full caption on record: ${clean(row.case_name_full)}` : ''}` +
          '. This is public-record docket metadata for business review, not a credit report, prediction, or judgment.',
        jurisdiction: court,
        filing_date: parseDate(first(row, ['date_filed', 'date_created', 'date_modified'])),
        amount: null,
        severity: financialSeverity(eventType),
        confidence: 86,
        status: clean(row.date_terminated) ? 'closed' : 'open',
        evidence_url: url,
      },
    }
  })
}

async function updateEntityTicker(env, entityId, companyName, tickerCache) {
  if (!entityId || !companyName) return null
  if (!isLikelyTickerMatchName(companyName)) return null
  const matchName = companyNameForTickerMatch(companyName)
  if (!matchName) return null
  const ticker = await matchTickerForCompany(matchName, tickerCache)
  if (!isValidTicker(ticker)) return null
  await supabaseRequest(
    env,
    'PATCH',
    'entities',
    { ticker },
    qs({ id: `eq.${entityId}` }),
  )
  return ticker
}

async function enrichEntityTicker(env, companyName, tickerCache) {
  const name = clean(companyName)
  if (!name) return null
  const rows = await supabaseRequest(
    env,
    'GET',
    'entities',
    undefined,
    qs({ select: 'id,ticker,canonical_name', canonical_name: postgrestEq(name), limit: '1' }),
  )
  const entity = rows[0]
  if (!entity?.id || entity.ticker) return entity?.ticker || null
  return updateEntityTicker(env, entity.id, entity.canonical_name || name, tickerCache)
}

async function enrichTickersForRecords(env, records, tickerCache) {
  // Prefer issuer company names (Form 4 ownership / congress asset). Never fuzzy-match people.
  const names = [
    ...new Set(
      (records || [])
        .map((record) => {
          const payload = record?.raw?.payload || {}
          const issuer = clean(payload.issuer || payload.issuerName || record?.event?.issuer_name)
          if (issuer && isLikelyTickerMatchName(issuer)) return issuer
          const entity = clean(record?.event?.entity_name)
          // Skip person-shaped Form 4 / congress entities; ticker belongs on the issuer.
          if (record?.event?.event_type === 'form_4' || record?.event?.event_type === 'congress_trade') {
            return issuer && isLikelyTickerMatchName(issuer) ? issuer : ''
          }
          return entity && isLikelyTickerMatchName(entity) ? entity : ''
        })
        .filter(Boolean),
    ),
  ]
  for (const name of names) {
    try {
      await enrichEntityTicker(env, name, tickerCache)
    } catch (error) {
      console.warn('ticker_enrich_failed', {
        company: companyNameForTickerMatch(name).slice(0, 120),
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

function secUserAgent(env) {
  const contact = String(env.SEC_USER_AGENT_CONTACT || env.PUBLIC_SITE_URL || 'https://vortxmkt.com').trim()
  return `VortxResearchBot/1.0 (${contact})`
}

async function enrichForm4Batch(entries, env, limit = 40) {
  const ua = secUserAgent(env)
  const out = []
  const slice = entries.slice(0, limit)
  for (let i = 0; i < slice.length; i += 1) {
    const entry = slice[i]
    try {
      out.push(
        await enrichForm4EntryFromOwnership(entry, {
          requestText,
          requestJson,
          userAgent: ua,
        }),
      )
    } catch {
      out.push(entry)
    }
    // EDGAR fair-access pacing between ownership XML fetches.
    if (i + 1 < slice.length) await sleep(175)
  }
  return out
}

async function fetchSecEdgarForm4(source, env) {
  const xml = await requestText(source.source_url, {
    headers: {
      accept: 'application/atom+xml,application/xml,text/xml,*/*',
      'user-agent': secUserAgent(env),
    },
  })
  const parsed = parseEdgarAtomEntries(xml, { formPrefix: '4' })
  // Prefer reporting-owner rows so the feed leads with people, not issuer shells.
  const reporting = parsed.filter((entry) => entry.role === 'reporting')
  const candidates = reporting.length ? reporting : parsed.filter((entry) => entry.role !== 'issuer')
  const batchSize = Math.min(Number(source.batch_size) || 80, 100)
  const atomSlice = candidates.slice(0, batchSize)
  const enriched = await enrichForm4Batch(atomSlice, env, Math.min(batchSize, 50))
  return enriched.map((entry, index) =>
    mapForm4Filing(
      {
        ...entry,
        filer: entry.filer || entry.companyName,
        issuer: entry.issuer || (entry.role === 'issuer' ? entry.companyName : ''),
        ticker: entry.ticker,
        filing_date: entry.filing_date,
        trade_date: entry.trade_date,
        link: entry.link,
        id: entry.id,
        cik: entry.cik,
        accession: entry.accession,
        issuerCik: entry.issuerCik || entry.cik,
      },
      source,
      index,
    ),
  )
}

async function fetchSecEdgar13f(source, env) {
  const xml = await requestText(source.source_url, {
    headers: {
      accept: 'application/atom+xml,application/xml,text/xml,*/*',
      'user-agent': secUserAgent(env),
    },
  })
  const batchSize = Math.min(Number(source.batch_size) || 60, 100)
  const entries = parseEdgarAtomEntries(xml, { formPrefix: '13F' }).slice(0, batchSize)
  return entries.map((entry, index) =>
    mapInstitutional13f(
      {
        ...entry,
        filer: entry.companyName,
        filing_date: entry.filing_date,
        link: entry.link,
        id: entry.id,
        cik: entry.cik,
        accession: entry.accession,
      },
      source,
      index,
    ),
  )
}

async function fetchHouseClerkPtr(source) {
  const mapped = await fetchHouseClerkPtrIndex(source, { requestBytes })
  if (!mapped.length) {
    throw new Error(
      'house_clerk_ptr_empty: Clerk FD ZIP returned no FilingType=P rows (bot-gate or year ZIP missing)',
    )
  }
  const batchSize = Math.min(Number(source.batch_size) || 80, 120)
  return mapped.slice(0, batchSize)
}

async function fetchSenateStockActEfd(source) {
  // Official Senate eFD is session-gated. Community S3 mirror is 403.
  // GitHub aggregate (timothycarambat) ends ~2020 — refuse as live feed.
  const url = clean(source.data_url)
  if (!url) {
    throw new Error(
      'senate_efd_unavailable: official eFD is session-gated; no live structured feed configured',
    )
  }
  let rows
  try {
    rows = await requestJson(url, { headers: { accept: 'application/json' } })
  } catch (error) {
    throw new Error(
      `senate_efd_fetch_failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error('senate_efd_empty: structured mirror returned no rows')
  }
  const newest = rows
    .map((row) =>
      String(row.disclosure_date || row.transaction_date || row.date || '').slice(0, 10),
    )
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .at(-1)
  const staleCutoff = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10)
  if (!newest || newest < staleCutoff) {
    throw new Error(
      `senate_efd_stale_mirror: newest disclosure ${newest || 'unknown'} is outside live window; refusing historical dump as current Congress tape`,
    )
  }
  const batchSize = Math.min(Number(source.batch_size) || 80, 120)
  const recent = rows
    .slice()
    .sort((a, b) =>
      String(b.disclosure_date || b.transaction_date || '').localeCompare(
        String(a.disclosure_date || a.transaction_date || ''),
      ),
    )
    .slice(0, batchSize)
  return recent.map((row, index) =>
    mapCongressTrade({ ...row, chamber: 'US-Senate' }, source, index),
  )
}

async function runSource(env, source, tickerCache) {
  let records = []
  let fetchError = null
  try {
    if (source.adapter_kind === 'warn_public') {
      records = await fetchWarn(source)
    } else if (source.adapter_kind === 'warn_ca_xlsx') {
      records = await fetchWarnCalifornia(source)
    } else if (source.adapter_kind === 'warn_il_api') {
      records = await fetchWarnIllinois(source)
    } else if (source.adapter_kind === 'warn_ny_csv') {
      records = await fetchWarnNewYork(source)
    } else if (source.adapter_kind === 'sec_edgar_form4_atom') {
      records = await fetchSecEdgarForm4(source, env)
    } else if (source.adapter_kind === 'sec_edgar_13f_atom') {
      records = await fetchSecEdgar13f(source, env)
    } else if (
      source.adapter_kind === 'house_clerk_ptr_index' ||
      source.adapter_kind === 'house_stock_act_ptr'
    ) {
      records = await fetchHouseClerkPtr(source)
    } else if (source.adapter_kind === 'senate_stock_act_efd') {
      records = await fetchSenateStockActEfd(source)
    } else if (source.adapter_kind === 'courtlistener_dockets') {
      records = await fetchCourtListenerDockets(source, env)
    } else {
      records = await fetchCourtListener(source, env)
    }
  } catch (error) {
    fetchError = error instanceof Error ? error.message : String(error)
    records = []
  }

  if (fetchError || !records.length) {
    // Still upsert catalog notes / last_success honesty when a source is dark.
    await supabaseRpc(env, 'ingest_legal_records', {
      source: sourceRow(source, env, {
        ok: false,
        recordCount: 0,
        error: fetchError || 'zero_rows',
      }),
      records: [],
    })
    if (fetchError) throw new Error(fetchError)
    return {
      source: source.slug,
      fetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      note: 'zero_rows',
    }
  }

  for (const record of records) {
    record.raw.payload_hash = await sha256Hex(
      `${source.slug}:${record.raw.source_record_id}:${JSON.stringify(record.raw.payload)}`,
    )
    record.raw.source_timestamp = new Date().toISOString()
    record.raw.retrieved_at = new Date().toISOString()
  }
  const result = await supabaseRpc(env, 'ingest_legal_records', {
    source: sourceRow(source, env, { ok: true, recordCount: records.length }),
    records,
  })
  await enrichTickersForRecords(env, records, tickerCache)
  return result
}

function boolEnv(value, fallback = false) {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

async function maybeRunRetention(env) {
  if (!boolEnv(env.RETENTION_ENABLED, false)) {
    return { skipped: true, reason: 'RETENTION_ENABLED is not true' }
  }
  // Weekly gate: only Sunday UTC during the 14:xx cron window (ingest is */6).
  const now = new Date()
  if (now.getUTCDay() !== 0 || now.getUTCHours() !== 14) {
    return { skipped: true, reason: 'outside_weekly_window' }
  }
  try {
    return await supabaseRpc(env, 'run_data_retention', {})
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function runIngest(env) {
  requireSupabase(env)
  const tickerCache = resolveTickerCache(env)
  const results = []
  for (const source of SOURCES) {
    try {
      await sleep(Number(env.INGEST_SOURCE_DELAY_MS || 1250))
      results.push(await runSource(env, source, tickerCache))
    } catch (error) {
      results.push({ source: source.slug, error: error instanceof Error ? error.message : String(error) })
    }
  }
  const retention = await maybeRunRetention(env)
  return { ok: true, ran_at: new Date().toISOString(), results, retention }
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

function authorizedIngestToken(request, env) {
  const expected = String(env.INGEST_ADMIN_TOKEN || '')
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  if (!expected || !provided) return false
  return timingSafeEqualString(provided, expected)
}

async function runCaseDraftsAfterIngest(env) {
  // Gated: only runs when CASE_DRAFTS_ENABLED=true. Drafts save as
  // pending_review and require a human approve click at /cases/drafts.
  try {
    const [{ runCaseDraftJob }, { supabaseRest }] = await Promise.all([
      import('../frontend/functions/lib/case-draft-generator.js'),
      import('../frontend/functions/lib/supabase-rest.js'),
    ])
    return await runCaseDraftJob(env, supabaseRest)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function runDiscordIngestPostsAfterIngest(env, { dryRun = false } = {}) {
  try {
    const { runDiscordIngestPosts } = await import('./discord-ingest-posts.js')
    return await runDiscordIngestPosts(env, { dryRun })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function runWatchlistAlertsAfterIngest(env, { dryRun = false } = {}) {
  try {
    const [{ runWatchlistAlertJob }, { supabaseRest }] = await Promise.all([
      import('../frontend/functions/lib/watchlist-alerts.js'),
      import('../frontend/functions/lib/supabase-rest.js'),
    ])
    return await runWatchlistAlertJob(env, supabaseRest, { dryRun })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export default {
  async scheduled(_event, env, _ctx) {
    await runIngest(env)
    await runCaseDraftsAfterIngest(env)
    await runWatchlistAlertsAfterIngest(env)
    await runDiscordIngestPostsAfterIngest(env)
  },
  async fetch(request, env) {
    if (!authorizedIngestToken(request, env)) {
      return json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
    const url = new URL(request.url)
    if (url.pathname === '/case-drafts' && request.method === 'POST') {
      return json(await runCaseDraftsAfterIngest(env))
    }
    if (url.pathname === '/watchlist-alerts' && request.method === 'POST') {
      const dryRun = url.searchParams.get('dry_run') === '1'
      return json(await runWatchlistAlertsAfterIngest(env, { dryRun }))
    }
    if (url.pathname === '/discord-ingest-posts' && request.method === 'POST') {
      const dryRun = url.searchParams.get('dry_run') === '1'
      return json(await runDiscordIngestPostsAfterIngest(env, { dryRun }))
    }
    const ingestResult = await runIngest(env)
    const alerts = await runWatchlistAlertsAfterIngest(env)
    const discord = await runDiscordIngestPostsAfterIngest(env)
    return json({ ...ingestResult, watchlist_alerts: alerts, discord_ingest_posts: discord })
  },
}
