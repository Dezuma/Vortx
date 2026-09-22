/** Source URLs for legal_events live in event_evidence, not on legal_events. */

import { urgencyDisplayLabel, urgencyFromScore } from './derived-scores.js'

const FINANCIAL_SOURCE_TYPES = new Set([
  'bankruptcy_chapter_11',
  'bankruptcy_chapter_7',
  'bankruptcy_docket',
  'bankruptcy_adversary',
  'receivership',
  'creditor_dispute',
])

const ACTION_TEMPLATES = {
  form_4: {
    urgent: 'Urgent: Form 4 filed. Open the EDGAR link, confirm ticker and transaction code, and decide whether this belongs on your watchlist.',
    review: 'Review this week: Insider Form 4 on record. Note filer role, share count, and filing date before your next research pass.',
    monitor: 'Monitor: Form 4 signal detected. Track for follow-on insider filings on the same issuer.',
  },
  congress_trade: {
    urgent: 'Urgent: STOCK Act disclosure filed. Confirm chamber, transaction window, and issuer before treating it as a research lead.',
    review: 'Review this week: Congressional periodic transaction report on file. Cross-check against your ticker or sector watch.',
    monitor: 'Monitor: STOCK Act disclosure detected. Add the issuer to a light watch until the next disclosure cycle.',
  },
  institutional_13f: {
    urgent: 'Urgent: 13F holdings report filed. Pull manager and top positions for your research queue.',
    review: 'Review this week: Institutional 13F on record. Note manager, reporting period, and material position changes.',
    monitor: 'Monitor: 13F filing detected. Track for quarter-over-quarter position shifts on your watchlist names.',
  },
  warn_notice: {
    urgent: 'Urgent: WARN notice on file. Confirm workforce exposure, vendor dependency, and contract renewal risk before your next payment or wire release.',
    review: 'Review this week: WARN notices often precede layoffs. Check counterparty headcount plans and service-level commitments.',
    monitor: 'Monitor: Workforce notice filed. Add to your vendor watch and revisit before the next renewal cycle.',
  },
  bankruptcy_chapter_11: {
    urgent: 'Urgent: Chapter 11 filing on record. Open the evidence link, freeze new exposure, and notify credit, treasury, and legal immediately.',
    review: 'Review this week: Chapter 11 docket activity warrants receivables review and covenant watch updates.',
    monitor: 'Monitor: Chapter 11 signal detected. Track docket updates and receivables exposure.',
  },
  bankruptcy_chapter_7: {
    urgent: 'Urgent: Chapter 7 filing on record. Stop new orders, review open receivables, and escalate to collections or legal.',
    review: 'Review this week: Chapter 7 filing may indicate liquidation risk: validate outstanding invoices and guarantees.',
    monitor: 'Monitor: Chapter 7 signal on file. Track for asset-sale or trustee actions.',
  },
  bankruptcy_docket: {
    urgent: 'Urgent: Bankruptcy docket activity on record. Open the evidence link, update credit hold, and notify risk or treasury.',
    review: 'Review this week: Bankruptcy docket update: pull source documents and reassess counterparty exposure.',
    monitor: 'Monitor: Bankruptcy docket signal. Add to covenant watch and revisit before the next payment run.',
  },
  bankruptcy_adversary: {
    urgent: 'Urgent: Adversary proceeding filed. Pull the complaint, notify legal, and assess clawback or preference exposure.',
    review: 'Review this week: Adversary proceeding may signal creditor disputes: route to litigation counsel.',
    monitor: 'Monitor: Adversary proceeding on docket. Track for settlement or judgment risk.',
  },
  receivership: {
    urgent: 'Urgent: Receivership proceeding on record. Halt new exposure, secure collateral, and notify legal and treasury.',
    review: 'Review this week: Receivership filing: validate liens, contracts, and payment priority.',
    monitor: 'Monitor: Receivership signal detected. Track receiver reports and asset disposition.',
  },
  mechanics_lien: {
    urgent: 'Urgent: Mechanics lien filed. Verify project status, payment chain, and bond coverage before releasing funds.',
    review: 'Review this week: Lien filing may affect property or project collateral: pull source documents.',
    monitor: 'Monitor: Lien signal on file. Confirm it does not affect your collateral or tenant.',
  },
  notice_of_intent: {
    urgent: 'Urgent: Pre-suit notice of intent on record. Route to legal and preserve documents before response deadlines.',
    review: 'Review this week: Pre-suit notice filed: assess claim exposure and insurance notification requirements.',
    monitor: 'Monitor: Pre-suit notice detected. Log in your litigation tracker.',
  },
  creditor_dispute: {
    urgent: 'Urgent: Creditor dispute on record. Review receivables, guarantees, and payment priority with treasury.',
    review: 'Review this week: Creditor dispute filing: validate exposure and escalation path.',
    monitor: 'Monitor: Creditor dispute signal. Track for settlement or judgment.',
  },
  civil_docket: {
    urgent: 'Urgent: New court record on file. Open the source document and log the finding in your diligence tracker.',
    review: 'Review this week: Court or administrative record surfaced: pull documents and assess counterparty risk.',
    monitor: 'Monitor: Court record detected. Add to your litigation or counterparty watch.',
  },
  regulatory_notice: {
    urgent: 'Urgent: Regulatory or agency notice on record. Confirm compliance exposure and notify relevant stakeholders.',
    review: 'Review this week: Agency notice filed: validate licensing, permit, or enforcement implications.',
    monitor: 'Monitor: Regulatory notice detected. Track for follow-on enforcement actions.',
  },
}

export function eventEvidenceListPath(eventIds, { order = true } = {}) {
  const ids = [...new Set((eventIds || []).map((id) => String(id || '').trim()).filter(Boolean))]
  const filter = ids.map((id) => encodeURIComponent(id)).join(',')
  const base = `event_evidence?select=event_id,source_url&event_id=in.(${filter})`
  // event_evidence uses retrieved_at, not created_at. Ordering by a missing column 400s the join.
  return order ? `${base}&order=retrieved_at.desc` : base
}

export async function loadEventEvidenceUrls(env, supabaseRest, eventIds) {
  const ids = [...new Set((eventIds || []).map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 500)
  if (!ids.length) return new Map()

  const map = new Map()
  for (let offset = 0; offset < ids.length; offset += 80) {
    const chunk = ids.slice(offset, offset + 80)
    let rows = []
    try {
      rows = await supabaseRest(env, eventEvidenceListPath(chunk))
    } catch {
      try {
        rows = await supabaseRest(env, eventEvidenceListPath(chunk, { order: false }))
      } catch {
        rows = []
      }
    }
    for (const row of rows || []) {
      if (row.source_url && !map.has(row.event_id)) {
        map.set(row.event_id, row.source_url)
      }
    }
  }
  return map
}

export function attachFilingIdentifiers(event = {}, { entity = null, raw = null } = {}) {
  const payload =
    raw?.payload && typeof raw.payload === 'object' && !Array.isArray(raw.payload) ? raw.payload : {}
  const cik =
    String(
      event.cik ||
        entity?.cik ||
        payload.cik ||
        payload.filerCik ||
        payload.filer_cik ||
        payload.issuerCik ||
        payload.issuer_cik ||
        '',
    ).replace(/\D/g, '') || ''
  const accession =
    event.accession ||
    event.accessionNumber ||
    payload.accession ||
    payload.accessionNumber ||
    raw?.source_record_id ||
    event.source_record_id ||
    ''
  return {
    ...event,
    ...(cik ? { cik } : {}),
    ...(entity?.cik && !event.issuer_cik
      ? { issuer_cik: String(entity.cik).replace(/\D/g, '') }
      : {}),
    accession: accession || event.accession,
    source_record_id: raw?.source_record_id || event.source_record_id,
    link: payload.link || payload.url || payload.filing_url || raw?.fetched_url || event.link,
  }
}

export function isGenericSourceDeskUrl(raw) {
  const url = String(raw || '').trim()
  if (!url) return true
  if (/PublicDisclosure\/FinancialDisclosure\/?(\?|#|$)/i.test(url) && !/ptr-pdfs/i.test(url)) {
    return true
  }
  if (/browse-edgar/i.test(url)) return true
  return false
}

export function isEdgarArchivesFilingUrl(raw) {
  try {
    const url = new URL(String(raw || '').trim())
    if (url.protocol !== 'https:') return false
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    if (host !== 'sec.gov') return false
    return /\/Archives\/edgar\/data\/\d+\//i.test(url.pathname)
  } catch {
    return false
  }
}

export function accessionFromSourceValue(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''
  const tagged = text.match(/accession-number=([0-9-]{18,})/i)
  if (tagged?.[1]) return tagged[1]
  const labeled = text.match(/\bAccession:\s*([0-9-]{18,})/i)
  if (labeled?.[1]) return labeled[1]
  const dashed = text.match(/\b(\d{10}-\d{2}-\d{6})\b/)
  if (dashed?.[1]) return dashed[1]
  // UUIDs can contain 18 digits after stripping hex; do not treat them as accessions.
  if (/[a-f]/i.test(text) || /[0-9a-f]{8}-[0-9a-f]{4}-/i.test(text)) return ''
  const digits = text.replace(/\D/g, '')
  return digits.length === 18 ? digits : ''
}

export function cikFromSourceValue(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''
  const tagged = text.match(/\bCIK(?:\s+on record)?:\s*(\d{6,10})\b/i)
  if (tagged?.[1]) return tagged[1].replace(/\D/g, '')
  const archives = text.match(/\/Archives\/edgar\/data\/(\d+)\//i)
  if (archives?.[1]) return archives[1]
  return ''
}

export function edgarFilingIndexUrl(cik, accession) {
  const cikDigits = String(cik || '').replace(/\D/g, '')
  const accessionDigits = String(accession || '').replace(/\D/g, '')
  if (!cikDigits || accessionDigits.length !== 18) return ''
  const dashed = `${accessionDigits.slice(0, 10)}-${accessionDigits.slice(10, 12)}-${accessionDigits.slice(12)}`
  return `https://www.sec.gov/Archives/edgar/data/${Number(cikDigits)}/${accessionDigits}/${dashed}-index.htm`
}

export function officialSecFilingUrl(event = {}, evidenceUrl = '') {
  const candidates = [
    evidenceUrl,
    event.evidence_url,
    event.source_url,
    event.link,
    event.filing_url,
    event.url,
    event.fetched_url,
  ]
  for (const raw of candidates) {
    if (isEdgarArchivesFilingUrl(raw)) return String(raw).trim()
  }
  const accession =
    accessionFromSourceValue(evidenceUrl) ||
    accessionFromSourceValue(event.accession) ||
    accessionFromSourceValue(event.accessionNumber) ||
    accessionFromSourceValue(event.source_record_id) ||
    accessionFromSourceValue(event.title) ||
    accessionFromSourceValue(event.summary) ||
    accessionFromSourceValue(event.id)
  const cik =
    String(event.issuer_cik || event.owner_cik || event.cik || '').replace(/\D/g, '') ||
    cikFromSourceValue(evidenceUrl) ||
    cikFromSourceValue(event.title) ||
    cikFromSourceValue(event.summary) ||
    cikFromSourceValue(event.link)
  return edgarFilingIndexUrl(cik, accession)
}

export function isPublicRecordFilingUrl(raw) {
  try {
    const url = new URL(String(raw || '').trim())
    if (url.protocol !== 'https:') return false
    if (isGenericSourceDeskUrl(url.toString())) return false
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'sec.gov') return isEdgarArchivesFilingUrl(url.toString())
    if (host === 'disclosures-clerk.house.gov') return /ptr-pdfs/i.test(url.pathname)
    return false
  } catch {
    return false
  }
}

function usableFilingUrl(raw) {
  const href = String(raw || '').trim()
  if (!href || isGenericSourceDeskUrl(href)) return ''
  return isPublicRecordFilingUrl(href) ? href : ''
}

export function resolveEventSourceUrl(event, sourceById, evidenceByEventId) {
  const fromEvidence = evidenceByEventId?.get(event.id)
  const fromFiling = officialSecFilingUrl(event, fromEvidence)
  if (fromFiling) return fromFiling
  const usableEvidence = usableFilingUrl(fromEvidence)
  if (usableEvidence) return usableEvidence
  const source = sourceById?.get(event.source_id)
  const catalog = usableFilingUrl(source?.source_url || '')
  if (catalog) return catalog
  return ''
}

export function noticeKindForEvent(event, source) {
  const key = String(event.event_type || source?.record_type || '').toLowerCase()
  if (key === 'form_4' || key.includes('form_4') || key.includes('insider')) return 'insider'
  if (key === 'congress_trade' || key.includes('congress') || key.includes('stock_act')) return 'congress'
  if (key === 'institutional_13f' || key.includes('13f')) return 'institutional'
  if (event.event_type === 'warn_notice') return 'workforce'
  if (FINANCIAL_SOURCE_TYPES.has(source?.record_type || event.event_type)) return 'financial'
  return 'court'
}

export function resolveRecordType(event, source) {
  const sourceType = source?.record_type
  if (sourceType && FINANCIAL_SOURCE_TYPES.has(sourceType)) return sourceType
  return event.event_type || sourceType || 'civil_docket'
}

export function urgencyLabel(severityOrScore) {
  return urgencyFromScore(severityOrScore)
}

export function urgencyLabelText(severityOrScore) {
  return urgencyDisplayLabel(urgencyFromScore(severityOrScore))
}

function actionTier(displaySeverity) {
  const value = Number(displaySeverity) || 0
  if (value >= 85) return 'urgent'
  if (value >= 65) return 'review'
  return 'monitor'
}

export function customerActionHint(event, noticeKind, options = {}) {
  const recordType = options.recordType || event.event_type || 'civil_docket'
  const displaySeverity = options.displaySeverity ?? event.severity
  const tier = actionTier(displaySeverity)

  const typed = ACTION_TEMPLATES[recordType]
  if (typed?.[tier]) return typed[tier]

  if (noticeKind === 'insider') return ACTION_TEMPLATES.form_4[tier]
  if (noticeKind === 'congress') return ACTION_TEMPLATES.congress_trade[tier]
  if (noticeKind === 'institutional') return ACTION_TEMPLATES.institutional_13f[tier]
  if (noticeKind === 'workforce') {
    return ACTION_TEMPLATES.warn_notice[tier]
  }
  if (noticeKind === 'financial') {
    return ACTION_TEMPLATES.bankruptcy_docket[tier]
  }
  return ACTION_TEMPLATES.civil_docket[tier]
}
