import { onRequestGet as health } from '../frontend/functions/api/health.js'
import { onRequestGet as publicStats } from '../frontend/functions/api/public-stats.js'
import { onRequestGet as filerPortraitGet } from '../frontend/functions/api/filer-portrait.js'
import {
  onAdminDashboard,
  onAdminServiceRequestPatch,
  onAdminSourcePatch,
  onAdminUserPatch,
  onAdminTests,
  onAdminStreamPulse,
  onCustomerDashboard,
  onCustomerExport,
  onCustomerWatchlistStar,
  onCustomerServiceRequest,
  onAuthLogin,
  onAuthMagicLink,
  onAuthOAuthStart,
  onAuthRecover,
  onAuthConsumeHandoff,
  onCustomerSignup,
  onMe,
} from '../frontend/functions/api/auth.js'
import {
  onPasskeyLoginOptions,
  onPasskeyLoginVerify,
  onPasskeyRegisterOptions,
  onPasskeyRegisterVerify,
  onRecoveryConsume,
} from '../frontend/functions/api/passkeys.js'
import { withSecurityHeaders } from '../frontend/functions/lib/html-security.js'
import { onRequestGet as requestAccessGet, onRequestPost as requestAccessPost } from '../frontend/functions/api/request-access.js'
import { onRequestPost as scanMatchPost, onRequestGet as scanMatchGet } from '../frontend/functions/api/scan-match.js'
import { onRequestPost as scanResultsPost, onRequestGet as scanResultsGet } from '../frontend/functions/api/scan-results.js'
import { onRequestPost as scanUnlockPost, onRequestGet as scanUnlockGet } from '../frontend/functions/api/scan-unlock.js'
import {
  onRequestGet as stripeCheckoutGet,
  onRequestPost as stripeCheckoutPost,
} from '../frontend/functions/api/stripe-checkout.js'
import { onRequestGet as stripeWebhookGet, onRequestPost as stripeWebhookPost } from '../frontend/functions/api/stripe-webhook.js'
import {
  onRequestGet as stripeBillingPortalGet,
  onRequestPost as stripeBillingPortalPost,
} from '../frontend/functions/api/stripe-billing-portal.js'
import { bearerToken, hasSupabase, json, supabaseRest, supabaseRestByIds, supabaseTableCount } from '../frontend/functions/lib/supabase-rest.js'
import { feedAccessPayload, resolveFeedAccess } from '../frontend/functions/lib/feed-access.js'
import { derivedEntityScore, daysSince } from '../frontend/functions/lib/derived-scores.js'
import { buildShortTitle } from '../frontend/functions/lib/display-title.js'
import { socialImageMetaTags } from '../frontend/functions/lib/social-card.js'
import {
  form4Severity,
  congressTradeSeverity,
  institutional13fSeverity,
  thirteenfFormLabel,
  thirteenfPeriodLabel,
} from '../frontend/functions/lib/trading-filings.js'
import {
  onCasesPublicList,
  onCasesDraftList,
  onCaseReview,
  onCasesGenerate,
} from '../frontend/functions/api/cases.js'
import { casesIndexPage, caseStoryPage, caseDraftsPage, caseDraftsScript } from './case-pages.js'
import { contractorCheckPage } from './contractor-check-page.js'
import { jobSafetyScorePage } from './job-safety-score-page.js'
import { landlordCheckPage } from './landlord-check-page.js'
import { legalPage } from './legal-page.js'
import { API_RESEARCH_DISCLAIMER } from '../frontend/functions/lib/product-positioning.js'
import {
  onContractorCheckSearch,
  onContractorCheckTrack,
  onContractorCheckVerifyUnlock,
  onContractorCheckGetHelp,
} from '../frontend/functions/api/contractor-check.js'
import {
  onJobSafetyScoreSearch,
  onJobSafetyScoreTrack,
  onJobSafetyScoreVerifyUnlock,
  onJobSafetyScoreGetHelp,
} from '../frontend/functions/api/job-safety-score.js'
import { onMarketingTrack } from '../frontend/functions/api/marketing-track.js'
import { onRequestGet as mostWatchedGet } from '../frontend/functions/api/most-watched.js'
import {
  onRequestGet as coverageEnrichGet,
  onRequestPost as coverageEnrichPost,
} from '../frontend/functions/api/coverage-enrich.js'
import { onRequestGet as mapSignalsGet } from '../frontend/functions/api/map-signals.js'
import {
  onMapSignalDetailGet,
  onMapSignalCsvGet,
  onMapVisibleCsvGet,
} from '../frontend/functions/api/map-signal-detail.js'
import { onEnterpriseMapSignalsGet } from '../frontend/functions/api/enterprise-map-signals.js'
import { enrichEventsWithNewsCoverage } from '../frontend/functions/lib/news-coverage.js'
import {
  isPublicRecordFilingUrl,
  loadEventEvidenceUrls,
  resolveEventSourceUrl,
  attachFilingIdentifiers,
} from '../frontend/functions/lib/event-evidence.js'
import {
  onLandlordCheckSearch,
  onLandlordCheckTrack,
  onLandlordCheckVerifyUnlock,
  onLandlordCheckGetHelp,
} from '../frontend/functions/api/landlord-check.js'

const disclaimer = API_RESEARCH_DISCLAIMER
const freshnessWindowDays = 180
const FINANCIAL_SOURCE_TYPES = new Set([
  'bankruptcy_chapter_11',
  'bankruptcy_chapter_7',
  'bankruptcy_docket',
  'bankruptcy_adversary',
  'receivership',
  'creditor_dispute',
])
import { mergeEntitlementRows } from '../frontend/functions/lib/plan-entitlements.js'
import {
  legacySignalSlugs,
  opaqueSignalSlug,
  resolveSignalSlug,
  stripInternalSignalFields,
} from '../frontend/functions/lib/signal-slugs.js'


function notFound() {
  return json({ ok: false, error: 'not_found' }, { status: 404 })
}

function normalizePagePath(pathname) {
  const path = String(pathname || '/').replace(/\/+$/, '') || '/'
  return path.toLowerCase()
}

function isContractorCheckPath(pathname) {
  return normalizePagePath(pathname) === '/contractor-check'
}

function isJobSafetyScorePath(pathname) {
  const path = normalizePagePath(pathname)
  return path === '/job-safety-score' || path === '/layoff-search'
}

function isLandlordCheckPath(pathname) {
  return normalizePagePath(pathname) === '/landlord-check'
}

function isLegalPath(pathname) {
  return normalizePagePath(pathname) === '/legal'
}

function legalPageResponse(request, canonicalSite) {
  return consumerToolPageResponse(request, canonicalSite, '/legal', legalPage)
}

function consumerToolPageResponse(request, canonicalSite, canonicalPath, pageFactory) {
  const url = new URL(request.url)
  const canonicalUrl = `${canonicalSite}${canonicalPath}${url.search}`

  if (url.pathname !== canonicalPath) {
    return Response.redirect(canonicalUrl, 301)
  }

  const page = pageFactory()
  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers: page.headers })
  }
  return page
}

function contractorCheckResponse(request, canonicalSite) {
  return consumerToolPageResponse(request, canonicalSite, '/contractor-check', contractorCheckPage)
}

function jobSafetyScoreResponse(request, canonicalSite) {
  const url = new URL(request.url)
  if (normalizePagePath(url.pathname) === '/job-safety-score') {
    return Response.redirect(`${canonicalSite}/layoff-search${url.search}`, 301)
  }
  return consumerToolPageResponse(request, canonicalSite, '/layoff-search', jobSafetyScorePage)
}

function landlordCheckResponse(request, canonicalSite) {
  return consumerToolPageResponse(request, canonicalSite, '/landlord-check', landlordCheckPage)
}


function injectLeadCapture(html) {
  return html
}

function signupPage(request) {
  const url = new URL(request.url)
  const errorCode = String(url.searchParams.get('error') || '').trim()
  const errorQuery = errorCode ? `?error=${encodeURIComponent(errorCode)}` : ''

  return new Response(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vortx | Create Customer Account</title>
    <style>
      :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#020617;color:#f8fafc}
      body{margin:0;min-height:100vh;background:#020617;color:#f8fafc}
      #root:empty::before{content:"Loading sign-up…";display:block;padding:44px 20px;text-align:center;color:#94a3b8;font-size:14px}
    </style>
  </head>
  <body>
    <section id="lead-capture" hidden></section>
    <div id="root"></div>
    <script>history.replaceState(null, '', '/signup${errorQuery}');</script>
    <script src="/vortx-site.js"></script>
  </body>
</html>`, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function cutoffDate() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - freshnessWindowDays)
  return date.toISOString().slice(0, 10)
}

function freshnessLabel(value) {
  const timestamp = Date.parse(String(value || ''))
  if (!Number.isFinite(timestamp)) return 'Updated recently'
  const diffMs = Math.max(0, Date.now() - timestamp)
  const minutes = Math.max(1, Math.round(diffMs / 60_000))
  if (minutes < 60) return `Updated ${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `Updated ${hours}h ago`
  const days = Math.round(hours / 24)
  return `Updated ${days}d ago`
}

function sourceTrust(source, event) {
  const recordType = String(source?.record_type || event?.event_type || '').toLowerCase()
  const name = `${source?.name || ''} ${source?.slug || ''} ${source?.source_url || ''}`.toLowerCase()
  const terms = String(source?.terms_status || '').toLowerCase()
  const access = String(source?.access_method || '').toLowerCase()

  const sourceCategory =
    /pacer|recap|courtlistener|bankruptcy|civil_docket/.test(`${name} ${recordType}`)
      ? 'Federal PACER'
      : /warn|dol|department of labor|workforce/.test(`${name} ${recordType}`)
        ? 'State DOL'
        : /county|recorder|clerk|lien|notice_of_intent/.test(`${name} ${recordType}`)
          ? 'County recorder'
          : 'Public source'

  const trustLabel =
    terms === 'approved' || terms === 'licensed'
      ? 'Verified'
      : source?.id && event?.source_id
        ? 'Matched'
        : 'Inferred'

  const trustTier = trustLabel.toLowerCase()
  return {
    source_category_label: sourceCategory,
    source_trust_label: trustLabel,
    source_trust_tier: trustTier,
    source_access_method: access || null,
  }
}

function scoreEntity(entity, scores, entityEvents = []) {
  const score = scores.find((item) => item.entity_id === entity.id)
  const eventScore = derivedEntityScore(score, entityEvents, entity)
  return {
    ...entity,
    latest_score: eventScore,
    raw_score: score?.score ?? entity.latest_score ?? 0,
    confidence: score?.confidence ?? entity.confidence ?? 0,
    trend: score?.trend ?? entity.trend ?? 'flat',
    reasons: score?.reasons ?? entity.reasons ?? [],
  }
}
const COURT_SLUG_LABELS = {
  scb: 'Court of Chancery of Delaware',
  deb: 'U.S. Bankruptcy Court, District of Delaware',
  nysd: 'U.S. District Court, Southern District of New York',
  cand: 'U.S. District Court, Northern District of California',
  txed: 'U.S. District Court, Eastern District of Texas',
  ilnd: 'U.S. District Court, Northern District of Illinois',
}

function isUrlLike(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

function courtSlugFromUrl(value) {
  const match = String(value || '').match(/\/courts\/([^/?#]+)/i)
  return match?.[1]?.replace(/\/$/, '') || ''
}

function sanitizeJurisdiction(value, sourceName) {
  const raw = String(value || '').trim()
  if (!raw) return sourceName ? `${sourceName} jurisdiction` : 'Jurisdiction on file'
  if (!isUrlLike(raw)) return raw
  const slug = courtSlugFromUrl(raw)
  if (slug && COURT_SLUG_LABELS[slug]) return COURT_SLUG_LABELS[slug]
  if (/courtlistener/i.test(raw)) return slug ? `Court record (${slug.toUpperCase()})` : 'Federal or state court record'
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '')
    return `${host} public source`
  } catch {
    return 'Public court jurisdiction'
  }
}

function inferReasonEventType(label, events = []) {
  const text = String(label || '').toLowerCase()
  const matched = events.find((event) => event.title === label)
  if (matched?.event_type) return matched.event_type
  if (matched?.source_record_type) return matched.source_record_type
  if (text.includes('receivership')) return 'receivership'
  if (text.includes('chapter 11')) return 'bankruptcy_chapter_11'
  if (text.includes('chapter 7')) return 'bankruptcy_chapter_7'
  if (text.includes('bankruptcy')) return 'bankruptcy_docket'
  if (text.includes('warn')) return 'warn_notice'
  if (text.includes('lien')) return 'mechanics_lien'
  if (text.includes('pre-suit') || text.includes('notice of intent')) return 'notice_of_intent'
  if (text.includes('adversary')) return 'bankruptcy_adversary'
  return 'civil_docket'
}

function reasonHeadline(label, eventType, unlocked, entityName = '') {
  const map = {
    receivership: 'Receivership proceeding on file',
    bankruptcy_chapter_11: 'Chapter 11 bankruptcy signal',
    bankruptcy_chapter_7: 'Chapter 7 bankruptcy signal',
    bankruptcy_docket: 'Business bankruptcy docket',
    bankruptcy_adversary: 'Bankruptcy adversary proceeding',
    warn_notice: 'WARN workforce notice',
    form_4: 'SEC Form 4 insider filing',
    congress_trade: 'STOCK Act congressional disclosure',
    institutional_13f: 'SEC 13F institutional filing',
    mechanics_lien: 'Mechanics lien filed',
    notice_of_intent: 'Pre-suit notice of intent',
    civil_docket: 'Court record signal',
  }
  if (unlocked) {
    return buildShortTitle({
      entityName,
      eventType,
      rawCaption: label,
    })
  }
  return map[eventType] || String(label || '').split(':')[0]?.trim() || displayRecordType(eventType)
}

function consolidateReasonCards(cards = []) {
  const grouped = new Map()
  for (const card of cards) {
    const key = String(card.headline || card.label || '').trim().toLowerCase()
    if (!key) continue
    const existing = grouped.get(key)
    if (existing) {
      existing.count += 1
      existing.weight = Math.max(existing.weight, Number(card.weight) || 0)
    } else {
      grouped.set(key, { ...card, count: 1 })
    }
  }
  return [...grouped.values()]
    .map((card) => {
      if (card.count > 1) {
        const base = card.headline || 'Financial-distress public record signal'
        return {
          ...card,
          headline: base,
          detail: `${card.count} related ${base.toLowerCase()} records on file. ${card.detail}`,
        }
      }
      return card
    })
    .slice(0, 3)
}

function buildReasonCards(entity, entityEvents = [], unlocked = false) {
  const entityName = entity?.canonical_name || ''
  const reasons = entity?.reasons || []
  let cards = []
  if (!reasons.length && entityEvents.length) {
    cards = entityEvents.slice(0, 6).map((event) => {
      const eventType = event.event_type || event.source_record_type || 'civil_docket'
      return {
        label: unlocked
          ? event.title || displayRecordType(eventType)
          : redactReasonLabel(event.title || displayRecordType(eventType)),
        weight: Math.round(Number(event.severity) / 2) || 20,
        headline: reasonHeadline(event.title, eventType, unlocked, entityName),
        detail: reasonDetail(event.title, eventType, event, entity, unlocked),
      }
    })
  } else {
    cards = reasons.slice(0, 6).map((reason) => {
      const eventType = inferReasonEventType(reason.label, entityEvents)
      const matchedEvent =
        entityEvents.find((event) => event.title === reason.label) ||
        entityEvents.find((event) => (event.event_type || event.source_record_type) === eventType) ||
        entityEvents[0]
      return {
        ...reason,
        label: unlocked ? reason.label : redactReasonLabel(reason.label),
        headline: reasonHeadline(reason.label, eventType, unlocked, entityName),
        detail: reasonDetail(reason.label, eventType, matchedEvent, entity, unlocked),
      }
    })
  }
  return consolidateReasonCards(cards)
}

function reasonDetail(label, eventType, event, entity, unlocked) {
  const jurisdiction = sanitizeJurisdiction(event?.jurisdiction || entity?.jurisdiction, event?.source_name)
  const filed = event?.filing_date ? ` Filed ${event.filing_date}.` : ''
  const location = jurisdiction ? ` ${jurisdiction}.` : ''
  if (eventType === 'receivership') {
    return unlocked
      ? `A receivership record is on file for this entity.${location}${filed} Receivership filings indicate court-supervised asset or operational control. This is a high-priority distress signal for creditors, vendors, and equity holders.`
      : `A receivership-related public record surfaced recently.${filed} These filings often precede asset freezes, creditor actions, or operational disruption.`
  }
  if (eventType === 'warn_notice') {
    return unlocked
      ? `A WARN workforce notice references this entity.${location}${filed} WARN notices are advance layoff disclosures, useful for supply-chain and labor-risk monitoring before headlines.`
      : `A WARN workforce notice appeared in the public feed.${filed} WARN filings disclose upcoming layoffs before most news coverage.`
  }
  if (String(eventType).includes('bankruptcy')) {
    return unlocked
      ? `A bankruptcy-related court record is linked to this entity.${location}${filed} Bankruptcy dockets and adversary proceedings are leading indicators of financial distress and creditor disputes.`
      : `A bankruptcy-related public record surfaced recently.${filed} These records often precede restructuring announcements and vendor-payment delays.`
  }
  if (eventType === 'mechanics_lien') {
    return unlocked
      ? `A mechanics lien record references this entity.${location}${filed} Lien clusters can signal payment disputes, project delays, or cash-flow pressure.`
      : `A mechanics lien signal appeared in public records.${filed} Liens often indicate unpaid contractors or supplier disputes.`
  }
  if (eventType === 'notice_of_intent') {
    return unlocked
      ? `A pre-suit notice of intent is on file.${location}${filed} These notices can precede formal litigation by weeks or months.`
      : `A pre-suit notice signal surfaced in public records.${filed} Early notices can precede formal court filings.`
  }
  return unlocked
    ? `Public record activity contributed to this score.${location}${filed} Multiple recent filings increase review priority.`
    : `Recent public-record activity contributed to this score.${filed} Subscribe for entity-linked source documents and timelines.`
}

function vulnerabilityBasis(entityEvents = []) {
  const basis = []
  if (entityEvents.length > 1) basis.push('multiple recent records')
  const types = new Set(entityEvents.map((event) => event.event_type || event.source_record_type).filter(Boolean))
  if (types.size > 1) basis.push('mixed signal types')
  const newestDays = entityEvents.length
    ? Math.min(...entityEvents.map((event) => daysSince(event.updated_at || event.created_at || event.filing_date)))
    : 180
  if (newestDays <= 7) basis.push('recent filing')
  if (entityEvents.some((event) => Number(event.severity) >= 80)) basis.push('high severity')
  return basis.length ? basis : ['recency', 'severity', 'confidence']
}

function redactReasonLabel(label) {
  const head = String(label || '').split(':')[0]?.trim() || 'Public record signal'
  return `${head}: subscriber-only detail`
}

function redactEntity(entity) {
  return {
    ...entity,
    canonical_name: 'Locked entity',
    normalized_name: 'locked entity',
    ticker: null,
    cik: null,
    registered_agent: null,
    primary_address: null,
    website: null,
    reasons: (entity.reasons || []).map((reason) => ({
      ...reason,
      label: redactReasonLabel(reason.label),
    })),
  }
}

function deriveTradingSignalMeta(event) {
  const type = String(event.event_type || event.source_record_type || '').toLowerCase()
  if (!['form_4', 'congress_trade', 'institutional_13f'].includes(type)) return null

  const title = String(event.title || '')
  const summary = String(event.summary || '')
  const blob = `${title} ${summary}`
  let side = 'neutral'
  let action_label = 'DISCLOSED'

  if (type === 'institutional_13f') {
    side = 'institutional'
    action_label = 'REPORTED HOLDING'
  } else if (/transaction code:\s*P\b|\bpurchase\b|\bbought\b|\bbuy\b/i.test(blob)) {
    side = 'buy'
    action_label = 'BOUGHT'
  } else if (/transaction code:\s*S\b|\bsale\b|\bsold\b|\bsell\b/i.test(blob)) {
    side = 'sell'
    action_label = 'SOLD'
  } else if (type === 'congress_trade') {
    side = 'disclose'
    action_label = 'DISCLOSED'
  } else if (type === 'form_4') {
    side = 'disclose'
    action_label = 'FILED'
  }

  const blockedTickers = new Set(['ISSUER', 'OWNER', 'FILER', 'FORM', 'STOCK', 'SALE', 'BUY', 'SELL', 'LLC', 'INC', 'CORP'])
  const rawTicker =
    blob.match(/\bTicker on record:\s*([A-Z0-9.\-]{1,8})\b/i)?.[1] ||
    title.match(/\(([A-Z]{1,5})\)/)?.[1] ||
    ''
  const tickerCandidate = String(rawTicker || '').toUpperCase()
  const ticker_label =
    tickerCandidate &&
    /^[A-Z]{1,5}(\.[A-Z])?$/.test(tickerCandidate) &&
    !blockedTickers.has(tickerCandidate)
      ? tickerCandidate
      : null
  const issuerFromTitle =
    title.match(/Form 4 insider filing:\s*(.+?)(?:\s*\(|\s+purchase|\s+sale|\s+transaction|$)/i)?.[1] ||
    title.match(/STOCK Act disclosure:\s*(.+?)(?:\s*·|\s*$)/i)?.[1] ||
    title.match(/13F[^:]*:\s*(.+?)$/i)?.[1] ||
    ''
  const filerFromSummary =
    summary.match(/Reporting owner:\s*([^./]+)/i)?.[1] ||
    summary.match(/Congressional STOCK Act disclosure naming\s*([^./]+)/i)?.[1] ||
    ''
  const issuerFromSummary =
    summary.match(/Issuer on record:\s*([^./]+)/i)?.[1] ||
    summary.match(/Asset on record:\s*([^./]+)/i)?.[1] ||
    ''
  const cleanLabel = (value) =>
    String(value || '')
      .replace(/\s*\(Issuer\)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)

  let filer_label = cleanLabel(filerFromSummary)
  let issuer_label = cleanLabel(issuerFromSummary)

  if (type === 'form_4') {
    if (!filer_label) filer_label = cleanLabel(event.entity_name)
    if (
      issuer_label &&
      filer_label &&
      issuer_label.toLowerCase() === filer_label.toLowerCase()
    ) {
      issuer_label = ''
    }
  } else if (type === 'congress_trade') {
    if (!filer_label) filer_label = cleanLabel(event.entity_name)
    if (!issuer_label) {
      const asset = cleanLabel(issuerFromTitle)
      if (asset && asset.toLowerCase() !== String(filer_label || '').toLowerCase()) {
        issuer_label = asset
      }
    }
  } else if (type === 'institutional_13f') {
    if (!filer_label) filer_label = cleanLabel(event.entity_name || issuerFromTitle)
    issuer_label = ''
  }

  const form_label = type === 'institutional_13f' ? thirteenfFormLabel(title, summary) : null
  const period_label = type === 'institutional_13f' ? thirteenfPeriodLabel(event.filing_date) : null
  if (type === 'institutional_13f') {
    if (/\/A$/i.test(form_label || '')) action_label = 'AMENDED'
    else if (/13F-NT/i.test(form_label || '')) action_label = 'NOTICE'
    else action_label = 'HOLDINGS'
  }
  const holdingsMatch = blob.match(/Holdings entries on record:\s*(\d+)/i)

  return {
    side,
    action_label,
    filer_label: filer_label || null,
    issuer_label: issuer_label || null,
    ticker_label,
    category: type,
    ...(form_label ? { form_label } : {}),
    ...(period_label ? { period_label } : {}),
    ...(holdingsMatch ? { holdings_count: Number(holdingsMatch[1]) } : {}),
  }
}

function recomputeTradingSeverity(event, eventType) {
  const type = String(eventType || event.event_type || '').toLowerCase()
  const summary = String(event.summary || '')
  const title = String(event.title || '')
  const blob = `${title} ${summary}`
  const code =
    blob.match(/Transaction code:\s*([A-Z0-9]+)/i)?.[1] ||
    (/purchase|bought|\bbuy\b/i.test(blob) ? 'P' : /sale|sold|\bsell\b/i.test(blob) ? 'S' : '')
  const amountMatch = blob.match(/Amount(?:\/shares)? field on record:\s*([0-9.]+)/i)
  const amount = amountMatch ? Number(amountMatch[1]) : null
  const filer =
    summary.match(/Reporting owner:\s*([^./]+)/i)?.[1] ||
    summary.match(/Congressional STOCK Act disclosure naming\s*([^./]+)/i)?.[1] ||
    event.entity_name ||
    ''
  if (type === 'form_4') {
    return form4Severity({
      transactionCode: code,
      amount,
      filingDate: event.filing_date,
      filerName: filer,
      role: /Reporting owner:/i.test(summary) ? 'reporting' : '',
    })
  }
  if (type === 'congress_trade') {
    return congressTradeSeverity({ amount })
  }
  if (type === 'institutional_13f') {
    return institutional13fSeverity({ amount })
  }
  return Number(event.severity) || 50
}

function displayEvent(event, sourceById, evidenceByEventId, extras = {}) {
  const entity = extras.entity
  const identified = attachFilingIdentifiers(
    {
      ...event,
      entity_name: entity?.canonical_name || event.entity_name,
      cik: entity?.cik || event.cik || undefined,
    },
    { entity, raw: extras.raw },
  )
  const source = sourceById.get(event.source_id)
  const trust = sourceTrust(source, event)
  const sourceName = source?.name || null
  const eventType = source?.record_type && FINANCIAL_SOURCE_TYPES.has(source.record_type)
    ? source.record_type
    : event.event_type
  const signal_meta = deriveTradingSignalMeta({ ...event, event_type: eventType })
  const tradingSeverity = ['form_4', 'congress_trade', 'institutional_13f'].includes(
    String(eventType || '').toLowerCase(),
  )
    ? recomputeTradingSeverity(event, eventType)
    : Number(event.severity) || undefined
  const filingUrl = resolveEventSourceUrl(identified, sourceById, evidenceByEventId)
  const enriched = {
    ...event,
    entity_name: identified.entity_name,
    ...(entity?.cik ? { cik: entity.cik } : event.cik ? { cik: event.cik } : {}),
    ...(String(event.owner_cik || ``).replace(/\D/g, ``)
      ? { owner_cik: String(event.owner_cik).replace(/\D/g, ``) }
      : {}),
    ...(tradingSeverity != null ? { severity: tradingSeverity } : {}),
    ...trust,
    freshness_label: freshnessLabel(event.updated_at || event.created_at || event.filing_date),
    source_domain_hint: sourceDomainHint(filingUrl || source?.source_url, sourceName),
    source_url: filingUrl || undefined,
    jurisdiction_display: sanitizeJurisdiction(event.jurisdiction, sourceName),
    short_title: buildShortTitle({
      entityName: identified.entity_name,
      eventType,
      rawCaption: event.title,
    }),
    signal_meta,
  }
  if (!source || !FINANCIAL_SOURCE_TYPES.has(source.record_type)) {
    return {
      ...enriched,
      source_record_type: source?.record_type || null,
      source_name: source?.name || null,
    }
  }

  return {
    ...enriched,
    event_type: source.record_type,
    source_record_type: source.record_type,
    source_name: source.name,
  }
}

function displayRecordType(value) {
  return String(value || 'public record').replaceAll('_', ' ')
}

function sourceDomainHint(...values) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (!text) continue
    try {
      const url = new URL(text)
      const host = url.hostname.replace(/^www\./, '')
      if (host) return `${host}/...`
    } catch {
      if (/courtlistener/i.test(text)) return 'courtlistener.com/...'
      if (/pacer|recap/i.test(text)) return 'pacer.uscourts.gov/...'
      if (/warn/i.test(text)) return 'public WARN source/...'
      if (/county|clerk|court/i.test(text)) return 'public court source/...'
    }
  }
  return 'source document/...'
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isLikelyBusinessEntityName(value) {
  const name = String(value || '').trim()
  if (name.length < 3) return false
  if (/\s+v[.]?\s+/i.test(name)) return false
  if (/\bplaintiff|defendant|debtor no\.|case no\.|estate of\b/i.test(name)) return false
  return /\b(llc|l\.l\.c\.|inc|inc\.|corp|corporation|company|co\.|ltd|lp|l\.p\.|llp|pllc|bank|holdings|group|services|systems|construction|partners|capital|energy|logistics|medical|health|restaurant|retail|manufacturing|properties|enterprises)\b/i.test(name)
}

function redactEvent(event) {
  const isFinancialDistress = FINANCIAL_SOURCE_TYPES.has(event.source_record_type)
  const publicTitle = isFinancialDistress
    ? 'Financial-distress public record signal'
    : 'Public record signal'
  return {
    ...event,
    title: publicTitle,
    short_title: publicTitle,
    entity_name: 'Locked entity',
    summary: isFinancialDistress
      ? 'Subscribe for business entity names, evidence links, timelines, watchlists, and exports.'
      : 'Subscribe for entity-linked evidence and source URLs.',
    source_url: `Locked source: ${event.source_domain_hint || 'source document/...'}`,
    cik: undefined,
  }
}

const AUTO_PREVIEW_ENTITY_COUNT = 3
const MAX_BONUS_PREVIEW_IDS = 1

function parseBonusPreviewIds(request, ranked) {
  const rankedIds = new Set((ranked || []).map((entity) => entity.id))
  const raw = String(new URL(request.url).searchParams.get('bonus_preview') || '')
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((id, index, list) => list.indexOf(id) === index)
    .filter((id) => rankedIds.has(id))
    .slice(0, MAX_BONUS_PREVIEW_IDS)
}

const TRADING_PREVIEW_TYPES = new Set(['form_4', 'congress_trade', 'institutional_13f'])

/** Prefer real Form 4 / named Congress over thin PTR shells or anonymous 13F for the free aha. */
function previewQualityScore(entity, eventsByEntity = new Map()) {
  const name = String(entity?.canonical_name || '').trim()
  if (!name || /^locked entity$/i.test(name)) return -1
  const rows = eventsByEntity.get(entity.id) || []
  let best = -1
  for (const event of rows) {
    const type = String(event.event_type || '')
    if (!TRADING_PREVIEW_TYPES.has(type)) continue
    const summary = String(event.summary || '')
    const title = String(event.title || '')
    let score = 0
    if (type === 'form_4') {
      score = 100
      if (/\bTicker on record:/i.test(summary) || /\([A-Z]{1,5}\)/.test(title)) score += 15
    } else if (type === 'congress_trade') {
      if (/PTR index row/i.test(summary) || /open the filing PDF/i.test(summary)) score = 25
      else score = 80
      if (/\bTicker on record:/i.test(summary) || /·\s*[A-Z]{1,5}\b/.test(title)) score += 15
    } else if (type === 'institutional_13f') {
      score = 45
    }
    score += Math.min(10, Math.round((Number(event.severity) || 0) / 10))
    if (score > best) best = score
  }
  return best
}

function buildPreviewIdSet(ranked, bonusPreviewIds = [], eventsByEntity = new Map()) {
  const scored = (ranked || [])
    .map((entity) => ({ entity, score: previewQualityScore(entity, eventsByEntity) }))
    .filter((row) => row.score >= 40)
    .sort(
      (a, b) =>
        b.score - a.score || (Number(b.entity.latest_score) || 0) - (Number(a.entity.latest_score) || 0),
    )
  const tradingFirst = (ranked || []).filter((entity) => {
    const rows = eventsByEntity.get(entity.id) || []
    return rows.some((event) => TRADING_PREVIEW_TYPES.has(String(event.event_type || '')))
  })
  const pool = tradingFirst.length ? tradingFirst : ranked || []
  const autoIds = scored.length
    ? scored.slice(0, AUTO_PREVIEW_ENTITY_COUNT).map((row) => row.entity.id)
    : pool.slice(0, AUTO_PREVIEW_ENTITY_COUNT).map((entity) => entity.id)
  return new Set([...autoIds, ...bonusPreviewIds.slice(0, MAX_BONUS_PREVIEW_IDS)])
}

async function frictionFeed({ request, env }) {
  if (!hasSupabase(env)) {
    return json({ ok: true, source: 'unconfigured', entities: [], events: [], disclaimer })
  }

  const access = await resolveFeedAccess(request, env)
  // Per-type pulls: a single filing_date.desc limit=100 was ~96% 13F and starved Form 4 / Congress.
  const eventSelect = `legal_events?select=*&filing_date=gte.${cutoffDate()}&order=filing_date.desc`
  const [form4Events, congressEvents, thirteenfEvents, otherEvents, sources] = await Promise.all([
    supabaseRest(env, `${eventSelect}&event_type=eq.form_4&limit=40`).catch(() => []),
    supabaseRest(env, `${eventSelect}&event_type=eq.congress_trade&limit=40`).catch(() => []),
    supabaseRest(env, `${eventSelect}&event_type=eq.institutional_13f&limit=40`).catch(() => []),
    supabaseRest(
      env,
      `${eventSelect}&event_type=not.in.(form_4,congress_trade,institutional_13f)&limit=40`,
    ).catch(() => []),
    supabaseRest(env, 'source_catalog?select=id,slug,name,record_type,terms_status,access_method,source_url'),
  ])
  const seenEventIds = new Set()
  const events = []
  for (const row of [
    ...(Array.isArray(form4Events) ? form4Events : []),
    ...(Array.isArray(congressEvents) ? congressEvents : []),
    ...(Array.isArray(thirteenfEvents) ? thirteenfEvents : []),
    ...(Array.isArray(otherEvents) ? otherEvents : []),
  ]) {
    const id = String(row?.id || '')
    if (id && seenEventIds.has(id)) continue
    if (id) seenEventIds.add(id)
    events.push(row)
  }
  events.sort(
    (a, b) =>
      String(b.filing_date || '').localeCompare(String(a.filing_date || '')) ||
      (Number(b.severity) || 0) - (Number(a.severity) || 0),
  )

  const activeIds = [...new Set((events || []).map((event) => event.entity_id).filter(Boolean))]
  const eventIds = [...new Set((events || []).map((event) => event.id).filter(Boolean))]
  const rawIds = [...new Set((events || []).map((event) => event.raw_record_id).filter(Boolean))]
  const [entities, scores, evidenceByEventId, rawRecords] = await Promise.all([
    supabaseRestByIds(env, { table: 'entities', select: '*', ids: activeIds }),
    supabaseRestByIds(env, { table: 'friction_scores', select: '*', ids: activeIds, idColumn: 'entity_id' }),
    loadEventEvidenceUrls(env, supabaseRest, eventIds),
    supabaseRestByIds(env, {
      table: 'raw_records',
      select: 'id,source_record_id,fetched_url,payload',
      ids: rawIds,
    }).catch(() => []),
  ])

  const sourceById = new Map((sources || []).map((source) => [source.id, source]))
  const entityById = new Map((entities || []).map((entity) => [entity.id, entity]))
  const rawById = new Map((rawRecords || []).map((row) => [row.id, row]))
  const displayEvents = (events || []).map((event) =>
    displayEvent(event, sourceById, evidenceByEventId, {
      entity: entityById.get(event.entity_id),
      raw: rawById.get(event.raw_record_id),
    }),
  )
  const eventsByEntity = new Map()
  for (const event of displayEvents) {
    const rows = eventsByEntity.get(event.entity_id) || []
    rows.push(event)
    eventsByEntity.set(event.entity_id, rows)
  }
  const activeIdSet = new Set(activeIds)
  const ranked = (entities || [])
    .filter((entity) => activeIdSet.has(entity.id))
    .map((entity) => scoreEntity(entity, scores || [], eventsByEntity.get(entity.id) || []))
    .sort((a, b) => (b.latest_score || 0) - (a.latest_score || 0))

  const bonusPreviewIds = access.allowBonusPreview ? parseBonusPreviewIds(request, ranked) : []
  const previewIds = access.showFullNames
    ? new Set(ranked.map((entity) => entity.id))
    : buildPreviewIdSet(ranked, bonusPreviewIds, eventsByEntity)

  const sourceAccessLabel = access.showSourceUrls
    ? null
    : access.isSubscriber
      ? 'Source document · upgrade to Operator or higher'
      : 'Source document · subscriber access'

  const sourcePreviewEventId =
    access.allowSourcePreview && displayEvents.length
      ? [...displayEvents].sort(
          (a, b) => (Number(b.severity) || 0) - (Number(a.severity) || 0),
        )[0]?.id || null
      : null

  const tradingForCoverage = displayEvents
    .filter((event) =>
      TRADING_PREVIEW_TYPES.has(String(event.event_type || event.source_record_type || '')),
    )
    .sort((a, b) => {
      const rank = (event) => {
        const key = String(event.event_type || event.source_record_type || '')
        if (key === 'form_4') return 0
        if (key === 'congress_trade') return 1
        return 2
      }
      return rank(a) - rank(b) || (Number(b.severity) || 0) - (Number(a.severity) || 0)
    })
  const coverageEnriched = await enrichEventsWithNewsCoverage(tradingForCoverage, {
    maxEvents: 24,
    concurrency: 4,
    budgetMs: 3500,
    env,
    supabaseRest,
  })
  const coverageById = new Map(
    coverageEnriched
      .filter((event) => event?.id && event?.news_mentioned_at)
      .map((event) => [
        event.id,
        {
          detected_at: event.detected_at || event.created_at || null,
          news_mentioned_at: event.news_mentioned_at,
          coverage_first_seen_at: event.coverage_first_seen_at || event.news_mentioned_at,
          coverage_source: event.signal_meta?.coverage_source || 'google_news_rss',
          coverage_title: event.signal_meta?.coverage_title || null,
        },
      ]),
  )

  const payloadEvents = displayEvents.map((event) => {
    const nameUnlocked = previewIds.has(event.entity_id)
    // Guest names stay locked unless the viewer passed a bonus_preview id they chose.
    const keepEvent =
      access.showFullNames ||
      (nameUnlocked && (access.showSignalMeta || access.allowBonusPreview))
    const base = keepEvent ? event : redactEvent(event)
    const coverage = coverageById.get(event.id)
    const withJurisdiction = {
      ...base,
      free_preview: Boolean(nameUnlocked && !access.showFullNames),
      preview_unlocked: Boolean(nameUnlocked),
      jurisdiction: base.jurisdiction_display || sanitizeJurisdiction(base.jurisdiction, base.source_name),
      ...(coverage
        ? {
            detected_at: coverage.detected_at,
            news_mentioned_at: coverage.news_mentioned_at,
            coverage_first_seen_at: coverage.coverage_first_seen_at,
            signal_meta: {
              ...(base.signal_meta || {}),
              detected_at: coverage.detected_at,
              news_mentioned_at: coverage.news_mentioned_at,
              coverage_first_seen_at: coverage.coverage_first_seen_at,
              coverage_source: coverage.coverage_source,
              coverage_title: coverage.coverage_title,
            },
          }
        : { detected_at: base.detected_at || base.created_at || null }),
    }
    if (!keepEvent && withJurisdiction.signal_meta) {
      withJurisdiction.signal_meta = {
        ...withJurisdiction.signal_meta,
        filer_label: null,
      }
    }
    const publicFiling = isPublicRecordFilingUrl(event.source_url) ? event.source_url : ''
    if (access.showSourceUrls) {
      return publicFiling && !withJurisdiction.source_url
        ? { ...withJurisdiction, source_url: publicFiling }
        : withJurisdiction
    }
    if (publicFiling) {
      return {
        ...withJurisdiction,
        source_url: publicFiling,
      }
    }
    if (sourcePreviewEventId && event.id === sourcePreviewEventId) {
      return {
        ...withJurisdiction,
        source_url: event.source_url,
        source_access_label: 'Starter preview · 1 source link this session',
        source_preview: true,
      }
    }
    return {
      ...withJurisdiction,
      source_url: undefined,
      source_access_label: sourceAccessLabel,
    }
  })

  const payloadEntities = ranked.map((entity) => {
    const unlocked = previewIds.has(entity.id)
    const entityEvents = eventsByEntity.get(entity.id) || []
    const showEntityName = access.showFullNames || unlocked
    const showEntityDetail = access.showFullNames || unlocked
    const base = showEntityName ? entity : redactEntity(entity)
    return {
      ...base,
      preview_unlocked: showEntityDetail,
      jurisdiction_display: sanitizeJurisdiction(entity.jurisdiction, entityEvents[0]?.source_name),
      jurisdiction: sanitizeJurisdiction(base.jurisdiction || entity.jurisdiction, entityEvents[0]?.source_name),
      reason_cards: buildReasonCards(entity, entityEvents, showEntityDetail),
      vulnerability_basis: vulnerabilityBasis(entityEvents),
    }
  })

  return json(
    {
      ok: true,
      source: 'supabase',
      freshness_window_days: freshnessWindowDays,
      free_preview_auto: AUTO_PREVIEW_ENTITY_COUNT,
      free_preview_bonus_max: MAX_BONUS_PREVIEW_IDS,
      access: feedAccessPayload(access),
      entities: payloadEntities,
      events: payloadEvents,
      disclaimer,
    },
    {
      headers: {
        'cache-control': access.isAuthenticated
          ? 'no-store'
          : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}

function redactPublicSignal(signal) {
  return {
    ...signal,
    entity_name: 'Locked entity',
    ticker: null,
    free_value: 'Record type, jurisdiction, filing date, score, and source category.',
  }
}

async function buildPublicSignalRows(env) {
  if (!hasSupabase(env)) return []

  const [events, sources] = await Promise.all([
    supabaseRest(
      env,
      `legal_events?select=id,entity_id,source_id,event_type,title,jurisdiction,filing_date,severity,confidence,created_at,updated_at&filing_date=gte.${cutoffDate()}&order=filing_date.desc&limit=250`,
    ),
    supabaseRest(env, 'source_catalog?select=id,slug,name,record_type,terms_status,access_method,source_url'),
  ])

  const activeIds = [...new Set((events || []).map((event) => event.entity_id).filter(Boolean))]
  const [entities, scores] = await Promise.all([
    supabaseRestByIds(env, {
      table: 'entities',
      select: 'id,canonical_name,entity_type,jurisdiction,ticker',
      ids: activeIds,
    }),
    supabaseRestByIds(env, {
      table: 'friction_scores',
      select: 'entity_id,score,confidence,computed_at',
      ids: activeIds,
      idColumn: 'entity_id',
    }),
  ])

  const sourceById = new Map((sources || []).map((source) => [source.id, source]))
  const entityById = new Map((entities || []).map((entity) => [entity.id, entity]))
  const scoreByEntity = new Map()
  for (const score of scores || []) {
    if (!scoreByEntity.has(score.entity_id)) scoreByEntity.set(score.entity_id, score)
  }

  const seen = new Set()
  const signals = []
  for (const event of events || []) {
    if (seen.has(event.entity_id)) continue
    const entity = entityById.get(event.entity_id)
    if (!entity) continue
    if (String(entity.entity_type || '').toLowerCase().includes('person')) continue
    if (!isLikelyBusinessEntityName(entity.canonical_name)) continue

    seen.add(event.entity_id)
    const source = sourceById.get(event.source_id)
    const sourceRecordType = source?.record_type || event.event_type
    const score = scoreByEntity.get(event.entity_id)
    const legacy = legacySignalSlugs(entity.canonical_name, event.id)
    const slug = opaqueSignalSlug(entity.id)
    signals.push({
      id: event.id,
      entity_id: entity.id,
      signal_slug: slug,
      signal_short_slug: slug,
      _legacy_short: legacy.short,
      _legacy_long: legacy.long,
      entity_name: entity.canonical_name,
      ticker: entity.ticker || null,
      record_type: displayRecordType(sourceRecordType),
      jurisdiction: event.jurisdiction || entity.jurisdiction || 'multi-jurisdiction',
      filing_date: event.filing_date || null,
      score: Number(score?.score ?? 0),
      confidence: Number(score?.confidence ?? event.confidence ?? 0),
      source_name: source?.name || 'Public record source',
      ...sourceTrust(source, event),
      freshness_label: freshnessLabel(event.updated_at || event.created_at || event.filing_date),
      source_domain_hint: sourceDomainHint(source?.source_url, source?.name),
      free_value: 'Company, record type, jurisdiction, filing date, score, and source category.',
      subscriber_unlocks: [
        'source URL',
        'full entity timeline',
        'watchlist alerts',
        'CSV export',
        'subscriber evidence packet',
      ],
      locked: {
        source_url: true,
        event_evidence: true,
        export_csv: true,
        watchlist_alerts: true,
      },
    })
    if (signals.length >= 75) break
  }

  return signals
}

async function buildTradingSignalRows(env) {
  const rows = await buildPublicSignalRows(env)
  return rows.filter((row) => String(row.ticker || '').trim()).slice(0, 100)
}

async function publicSignals({ env }) {
  if (!hasSupabase(env)) {
    return json({ ok: true, source: 'unconfigured', signals: [], disclaimer })
  }

  const rows = await buildPublicSignalRows(env)
  const signals = rows.map((row) => redactPublicSignal(stripInternalSignalFields(row)))

  return json(
    {
      ok: true,
      source: 'supabase',
      signals,
      count: signals.length,
      disclaimer,
    },
    {
      headers: { 'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600' },
    },
  )
}

async function tradingSignals({ env }) {
  if (!hasSupabase(env)) {
    return json({ ok: true, source: 'unconfigured', signals: [], count: 0, disclaimer })
  }

  const rows = await buildTradingSignalRows(env)
  const signals = rows.map((row) => stripInternalSignalFields(row))

  return json(
    {
      ok: true,
      source: 'supabase',
      signals,
      count: signals.length,
      disclaimer,
    },
    {
      headers: {
        'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
      },
    },
  )
}

async function signalLandingPage({ request, env }) {
  const url = new URL(request.url)
  const requested = decodeURIComponent(url.pathname.replace(/^\/signal\//, '')).replace(/\/$/, '')
  const rows = await buildPublicSignalRows(env)
  const { signal: matched, redirectTo } = resolveSignalSlug(rows, requested)

  if (!matched) return notFound()

  if (redirectTo && redirectTo !== requested) {
    const location = `${url.origin}/signal/${encodeURIComponent(redirectTo)}`
    return new Response(null, {
      status: 301,
      headers: {
        location,
        'cache-control': 'no-store',
      },
    })
  }

  const signal = redactPublicSignal(stripInternalSignalFields(matched))

  const title = `Public-record signal | Vortx`
  const description = `${signal.record_type} filed ${signal.filing_date || 'recent'} in ${signal.jurisdiction}. ${signal.source_category_label} · ${signal.source_trust_label}. Subscribe for entity names and source links.`
  const canonical = `${url.origin}/signal/${signal.signal_slug}`
  const priceHref = `${url.origin}/?view=pricing`
  const sampleCsv = `${url.origin}/api/public-signals.csv`
  const sourceHint = signal.source_domain_hint || 'source document/...'

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    ${socialImageMetaTags(url.origin)}
    <title>${escapeHtml(title)}</title>
    <style>
      :root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#fff;color:#0f172a}
      body{margin:0;min-height:100vh;background:#fff;color:#0f172a}
      a{color:inherit}.wrap{position:relative;max-width:1120px;margin:0 auto;padding:34px 20px 56px}.eyebrow{font:700 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#50b4ff}.glass{position:relative;overflow:hidden;border:1px solid rgba(100,116,139,.45);border-radius:28px;background:linear-gradient(165deg,rgba(51,65,85,.93) 0%,rgba(30,41,59,.95) 35%,rgba(15,23,42,.97) 70%,rgba(2,6,23,.98) 100%),radial-gradient(circle at top left,rgba(80,180,255,.1),transparent 18rem);box-shadow:0 24px 90px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.12);backdrop-filter:blur(22px) saturate(135%);color:#f8fafc}
      .hero{padding:28px}.brand{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:46px}.brand b{font-size:28px;letter-spacing:-.04em}.nav{font-size:14px;color:#cbd5e1}.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:20px}.headline{font-size:clamp(42px,7vw,88px);line-height:.92;letter-spacing:-.06em;margin:14px 0 18px}.muted{color:#cbd5e1;line-height:1.65}.panel{padding:22px}.pill{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(80,180,255,.32);border-radius:999px;background:rgba(80,180,255,.1);color:#7dd3fc;padding:7px 11px;font:700 12px monospace;text-transform:uppercase;letter-spacing:.08em}.score{font:700 72px monospace;color:#48ff9b;line-height:1}.kv{display:grid;gap:12px;margin-top:18px}.kv div{border:1px solid rgba(148,163,184,.22);border-radius:16px;background:rgba(0,0,0,.32);padding:14px}.kv span{display:block;color:#94a3b8;font:700 11px monospace;text-transform:uppercase;letter-spacing:.14em}.kv strong{display:block;margin-top:6px;color:#f8fafc}.blur{filter:blur(4px);user-select:none}.cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}.button{border:1px solid rgba(125,211,252,.65);border-radius:14px;background:linear-gradient(135deg,#38bdf8,#7dd3fc);color:#020617;padding:13px 16px;font-weight:800;text-decoration:none}.ghost{border:1px solid rgba(80,180,255,.42);border-radius:14px;background:rgba(80,180,255,.1);color:#7dd3fc;padding:13px 16px;font-weight:700;text-decoration:none}
      form{display:flex;gap:10px;margin-top:18px}input{flex:1;border:1px solid rgba(148,163,184,.28);border-radius:14px;background:rgba(0,0,0,.45);color:#f8fafc;padding:13px 14px}button{border:1px solid rgba(125,211,252,.65);border-radius:14px;background:linear-gradient(135deg,#38bdf8,#7dd3fc);color:#020617;padding:13px 16px;font-weight:800}.steps{margin-top:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.steps .glass{padding:18px}.legal{font-size:12px;color:#94a3b8;margin-top:24px;line-height:1.6}@media(max-width:840px){.grid,.steps{grid-template-columns:1fr}form{display:block}input,button{box-sizing:border-box;width:100%;margin-top:10px}}
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="glass hero">
        <div class="brand"><b>Vortxmkt</b><a class="nav" href="/">Main site</a></div>
        <div class="grid">
          <div>
            <p class="eyebrow">Exact signal from today&apos;s queue</p>
            <h1 class="headline">${escapeHtml(signal.entity_name)}</h1>
            <p class="muted">${escapeHtml(signal.record_type)} · ${escapeHtml(signal.jurisdiction)} · filed ${escapeHtml(signal.filing_date || 'recent')} · ${escapeHtml(signal.freshness_label || 'Updated recently')}</p>
            <div class="cta">
              <a class="button" href="#capture">Get 5 free signals by email</a>
              <a class="ghost" href="${escapeHtml(priceHref)}">Unlock full access for $150/mo</a>
            </div>
          </div>
          <aside class="glass panel">
            <span class="pill">${escapeHtml(signal.source_category_label)} · ${escapeHtml(signal.source_trust_label)}</span>
            <p class="score">${escapeHtml(signal.score)}</p>
            <div class="kv">
              <div><span>Source document</span><strong class="blur">${escapeHtml(sourceHint)}</strong></div>
              <div><span>Subscriber unlocks</span><strong>source link · full timeline · watchlist alerts · CSV export</strong></div>
            </div>
          </aside>
        </div>
      </section>
      <section id="capture" class="glass panel" style="margin-top:20px">
        <p class="eyebrow">Free follow-up sequence</p>
        <h2>Get 5 real signal alerts before you pay.</h2>
        <p class="muted">We&apos;ll send a short 5-day drip of live public-record signals. If it&apos;s useful, unlock full source documents and exports.</p>
        <form action="/api/request-access" method="post">
          <input type="email" name="email" placeholder="work email" required />
          <input type="hidden" name="name" value="Signal landing subscriber" />
          <input type="hidden" name="use_case" value="other" />
          <input type="hidden" name="message" value="Send me the 5-day signal drip for ${escapeHtml(signal.entity_name)}." />
          <button type="submit">Send 5 free signals</button>
        </form>
        <div class="cta"><a class="ghost" href="${escapeHtml(sampleCsv)}" download>Download sample CSV</a><a class="ghost" href="/signup">Create customer account</a></div>
      </section>
      <section class="steps">
        <div class="glass"><p class="eyebrow">1. Post</p><p class="muted">One real public-record lead from the queue.</p></div>
        <div class="glass"><p class="eyebrow">2. Capture</p><p class="muted">Email gets the 5-day drip and sample CSV.</p></div>
        <div class="glass"><p class="eyebrow">3. Convert</p><p class="muted">Paid access unlocks source documents and timelines.</p></div>
      </section>
      <p class="legal">${escapeHtml(disclaimer)} Records are for research only and are not predictions or advice.</p>
    </main>
  </body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
    },
  })
}

async function sourceTransparency({ env }) {
  const sources = await supabaseRest(env, 'source_catalog?select=*&order=jurisdiction.asc')
  return json(
    { ok: true, source: hasSupabase(env) ? 'supabase' : 'unconfigured', sources, disclaimer },
    {
      headers: { 'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=300' },
    },
  )
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

async function publicSignalsCsv(context) {
  const response = await publicSignals(context)
  const payload = await response.json()
  const rows = [
    ['company', 'record_type', 'jurisdiction', 'filing_date', 'score', 'source_category', 'trust_tier', 'freshness', 'locked_source_hint'],
    ...(payload.signals || []).map((signal) => [
      signal.entity_name,
      signal.record_type,
      signal.jurisdiction,
      signal.filing_date,
      signal.score,
      signal.source_category_label,
      signal.source_trust_label,
      signal.freshness_label,
      signal.source_domain_hint,
    ]),
  ]
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="vortx-public-signal-sample.csv"',
      'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
    },
  })
}

async function getEntitlements({ env }) {
  const entitlements = await supabaseRest(
    env,
    'entitlements?select=plan,label,monthly_price,watchlist_limit,alert_limit&order=plan.asc',
  )
  const merged = mergeEntitlementRows(entitlements || [])
  return json({ ok: true, source: hasSupabase(env) ? 'supabase' : 'unconfigured', entitlements: merged })
}

async function handleApi(request, env, ctx) {
  const url = new URL(request.url)
  const context = { request, env, ctx }

  if (url.pathname === '/api/health' && request.method === 'GET') {
    return health(context)
  }

  if (url.pathname === '/api/stripe-checkout') {
    if (request.method === 'POST') return stripeCheckoutPost(context)
    if (request.method === 'GET') return stripeCheckoutGet(context)
  }

  if (url.pathname === '/api/stripe-billing-portal') {
    if (request.method === 'POST') return stripeBillingPortalPost(context)
    if (request.method === 'GET') return stripeBillingPortalGet(context)
  }

  if (url.pathname === '/api/stripe-webhook') {
    if (request.method === 'POST') return stripeWebhookPost(context)
    if (request.method === 'GET') return stripeWebhookGet(context)
  }

  if (url.pathname === '/api/scan/match') {
    if (request.method === 'POST') return scanMatchPost(context)
    if (request.method === 'GET') return scanMatchGet(context)
  }

  if (url.pathname === '/api/scan/results') {
    if (request.method === 'POST') return scanResultsPost(context)
    if (request.method === 'GET') return scanResultsGet(context)
  }

  if (url.pathname === '/api/scan/unlock') {
    if (request.method === 'POST') return scanUnlockPost(context)
    if (request.method === 'GET') return scanUnlockGet(context)
  }

  if (url.pathname === '/api/request-access') {
    if (request.method === 'POST') return requestAccessPost(context)
    if (request.method === 'GET') return requestAccessGet(context)
  }

  if (url.pathname === '/api/public-stats' && request.method === 'GET') {
    return publicStats(context)
  }

  if (url.pathname === '/api/filer-portrait' && request.method === 'GET') {
    return filerPortraitGet(context)
  }

  if (url.pathname === '/api/marketing/track' && request.method === 'POST') {
    return onMarketingTrack(context)
  }

  if (url.pathname === '/api/friction-feed' && request.method === 'GET') {
    return frictionFeed(context)
  }

  if (url.pathname === '/api/public-signals' && request.method === 'GET') {
    return publicSignals(context)
  }

  if (url.pathname === '/api/trading-signals' && request.method === 'GET') {
    return tradingSignals(context)
  }

  if (url.pathname === '/api/most-watched' && request.method === 'GET') {
    return mostWatchedGet(context)
  }

  if (url.pathname === '/api/coverage-enrich') {
    if (request.method === 'POST') return coverageEnrichPost(context)
    if (request.method === 'GET') return coverageEnrichGet(context)
  }

  if (url.pathname === '/api/map/signals' && request.method === 'GET') {
    return mapSignalsGet(context)
  }

  if (url.pathname === '/api/map/signal' && request.method === 'GET') {
    return onMapSignalDetailGet(context)
  }

  if (url.pathname === '/api/map/signal.csv' && request.method === 'GET') {
    return onMapSignalCsvGet(context)
  }

  if (url.pathname === '/api/map/signals.csv' && request.method === 'GET') {
    return onMapVisibleCsvGet(context)
  }

  if (url.pathname === '/api/enterprise/map/signals' && request.method === 'GET') {
    return onEnterpriseMapSignalsGet(context)
  }

  if (url.pathname === '/api/public-signals.csv' && request.method === 'GET') {
    return publicSignalsCsv(context)
  }

  if (url.pathname === '/api/source-transparency' && request.method === 'GET') {
    return sourceTransparency(context)
  }

  if (url.pathname === '/api/entitlements' && request.method === 'GET') {
    return getEntitlements(context)
  }

  if (url.pathname === '/api/me' && request.method === 'GET') {
    return onMe(context)
  }

  if (url.pathname === '/api/customer/dashboard' && request.method === 'GET') {
    return onCustomerDashboard(context)
  }

  if (url.pathname === '/api/customer/service-requests' && request.method === 'POST') {
    return onCustomerServiceRequest(context)
  }

  if (url.pathname === '/api/customer/watchlist-star' && request.method === 'POST') {
    return onCustomerWatchlistStar(context)
  }

  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    return onAuthLogin(context)
  }

  if (url.pathname === '/api/auth/oauth' && request.method === 'GET') {
    return onAuthOAuthStart(context)
  }

  if (url.pathname === '/api/auth/magic-link' && request.method === 'POST') {
    return onAuthMagicLink(context)
  }

  if (url.pathname === '/api/auth/recover' && request.method === 'POST') {
    return onAuthRecover(context)
  }

  if (url.pathname === '/api/auth/consume-handoff' && request.method === 'POST') {
    return onAuthConsumeHandoff(context)
  }

  if (url.pathname === '/api/auth/passkey/register/options' && request.method === 'POST') {
    return onPasskeyRegisterOptions(context)
  }

  if (url.pathname === '/api/auth/passkey/register/verify' && request.method === 'POST') {
    return onPasskeyRegisterVerify(context)
  }

  if (url.pathname === '/api/auth/passkey/login/options' && request.method === 'POST') {
    return onPasskeyLoginOptions(context)
  }

  if (url.pathname === '/api/auth/passkey/login/verify' && request.method === 'POST') {
    return onPasskeyLoginVerify(context)
  }

  if (url.pathname === '/api/auth/recovery/consume' && request.method === 'POST') {
    return onRecoveryConsume(context)
  }

  if (url.pathname === '/api/contractor-check/search' && request.method === 'POST') {
    return onContractorCheckSearch(context)
  }

  if (url.pathname === '/api/contractor-check/track' && request.method === 'POST') {
    return onContractorCheckTrack(context)
  }

  if (url.pathname === '/api/contractor-check/verify-unlock' && request.method === 'POST') {
    return onContractorCheckVerifyUnlock(context)
  }

  if (url.pathname === '/api/contractor-check' && request.method === 'GET') {
    return onContractorCheckGetHelp()
  }

  if (url.pathname === '/api/job-safety-score/search' && request.method === 'POST') {
    return onJobSafetyScoreSearch(context)
  }

  if (url.pathname === '/api/job-safety-score/track' && request.method === 'POST') {
    return onJobSafetyScoreTrack(context)
  }

  if (url.pathname === '/api/job-safety-score/verify-unlock' && request.method === 'POST') {
    return onJobSafetyScoreVerifyUnlock(context)
  }

  if (url.pathname === '/api/job-safety-score' && request.method === 'GET') {
    return onJobSafetyScoreGetHelp()
  }

  if (url.pathname === '/api/landlord-check/search' && request.method === 'POST') {
    return onLandlordCheckSearch(context)
  }

  if (url.pathname === '/api/landlord-check/track' && request.method === 'POST') {
    return onLandlordCheckTrack(context)
  }

  if (url.pathname === '/api/landlord-check/verify-unlock' && request.method === 'POST') {
    return onLandlordCheckVerifyUnlock(context)
  }

  if (url.pathname === '/api/landlord-check' && request.method === 'GET') {
    return onLandlordCheckGetHelp()
  }

  if (url.pathname === '/api/customer/signup' && request.method === 'POST') {
    return onCustomerSignup(context)
  }

  if (url.pathname === '/api/customer/export' && request.method === 'GET') {
    return onCustomerExport(context)
  }

  if (url.pathname === '/api/admin/dashboard' && request.method === 'GET') {
    return onAdminDashboard(context)
  }

  if (url.pathname === '/api/admin/sources' && request.method === 'PATCH') {
    return onAdminSourcePatch(context)
  }

  if (url.pathname === '/api/admin/service-requests' && request.method === 'PATCH') {
    return onAdminServiceRequestPatch(context)
  }

  if (url.pathname === '/api/admin/users' && request.method === 'PATCH') {
    return onAdminUserPatch(context)
  }

  if (url.pathname === '/api/admin/tests' && request.method === 'POST') {
    return onAdminTests(context)
  }

  if (url.pathname === '/api/admin/stream-pulse' && request.method === 'GET') {
    return onAdminStreamPulse(context)
  }

  if (url.pathname === '/api/cases' && request.method === 'GET') {
    return onCasesPublicList(context)
  }

  if (url.pathname === '/api/cases/drafts' && request.method === 'GET') {
    return onCasesDraftList(context)
  }

  if (url.pathname === '/api/cases/review' && request.method === 'POST') {
    return onCaseReview(context)
  }

  if (url.pathname === '/api/cases/generate' && request.method === 'POST') {
    return onCasesGenerate(context)
  }

  return notFound()
}

async function runWatchlistAlerts(env) {
  try {
    const { runWatchlistAlertJob } = await import('../frontend/functions/lib/watchlist-alerts.js')
    return await runWatchlistAlertJob(env, supabaseRest)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function runWatchedWeeklyDigest(env) {
  try {
    const { runWatchedWeeklyDigestJob } = await import(
      '../frontend/functions/lib/watchlist-weekly-digest.js'
    )
    return await runWatchedWeeklyDigestJob(env, supabaseRest)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function runIncrementalMapGeocoding(env) {
  try {
    const { runMapGeocodingJob } = await import(
      '../frontend/functions/lib/map-geocoding-job.js'
    )
    const geocoding = await runMapGeocodingJob(env, supabaseRest)
    const crossRows = await supabaseRest(env, 'rpc/refresh_map_cross_signals', {
      method: 'POST',
      body: JSON.stringify({}),
    }).catch(() => null)
    return { geocoding, cross_signals: Number(crossRows) || 0 }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export default {
  async scheduled(_event, env, _ctx) {
    await runWatchlistAlerts(env)
    // Digest self-gates to Mon UTC (and Tue <06 UTC catch-up).
    await runWatchedWeeklyDigest(env)
    await runIncrementalMapGeocoding(env)
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const canonicalSite = String(env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
    if (url.hostname === 'www.vortxmkt.com') {
      return Response.redirect(`${canonicalSite}${url.pathname}${url.search}${url.hash}`, 301)
    }

    if (
      (url.pathname === '/pricing' || url.pathname === '/pricing/') &&
      (request.method === 'GET' || request.method === 'HEAD')
    ) {
      const target = new URL('/', canonicalSite)
      target.searchParams.set('view', 'pricing')
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== 'view') target.searchParams.set(key, value)
      }
      const destination = `${target.toString()}${url.hash}`
      return Response.redirect(destination, 301)
    }

    const browsePathRedirects = {
      '/congress-trades': 'congress',
      '/insider-trades': 'insider',
      '/fund-holdings': 'thirteenf',
    }
    const browseType = browsePathRedirects[normalizePagePath(url.pathname)]
    if (browseType && (request.method === 'GET' || request.method === 'HEAD')) {
      const target = new URL('/', canonicalSite)
      target.searchParams.set('view', 'browse')
      target.searchParams.set('type', browseType)
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== 'view' && key !== 'type') target.searchParams.set(key, value)
      }
      return Response.redirect(`${target.toString()}${url.hash}`, 301)
    }

    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      url.searchParams.get('view') === 'heatmap'
    ) {
      const target = new URL(url.href)
      target.searchParams.delete('view')
      return Response.redirect(`${canonicalSite}${target.pathname}${target.search}${url.hash}`, 302)
    }

    if (
      url.pathname === '/' &&
      url.searchParams.has('vortx_ssr') &&
      (request.method === 'GET' || request.method === 'HEAD')
    ) {
      return Response.redirect(`${canonicalSite}/contractor-check`, 301)
    }

    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'HEAD') {
        const headRequest = new Request(request.url, {
          method: 'GET',
          headers: request.headers,
        })
        const response = await withSecurityHeaders(await handleApi(headRequest, env, ctx))
        return new Response(null, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })
      }

      return withSecurityHeaders(await handleApi(request, env, ctx))
    }

    if (url.pathname.startsWith('/signal/') && (request.method === 'GET' || request.method === 'HEAD')) {
      const pageResponse = await withSecurityHeaders(await signalLandingPage({ request, env, ctx }))
      if (request.method === 'HEAD') {
        return new Response(null, {
          status: pageResponse.status,
          statusText: pageResponse.statusText,
          headers: pageResponse.headers,
        })
      }
      return pageResponse
    }

    if (url.pathname === '/signup' && request.method === 'GET') {
      return withSecurityHeaders(signupPage(request))
    }

    if (isContractorCheckPath(url.pathname) && (request.method === 'GET' || request.method === 'HEAD')) {
      return withSecurityHeaders(contractorCheckResponse(request, canonicalSite))
    }

    if (isJobSafetyScorePath(url.pathname) && (request.method === 'GET' || request.method === 'HEAD')) {
      return withSecurityHeaders(jobSafetyScoreResponse(request, canonicalSite))
    }

    if (isLandlordCheckPath(url.pathname) && (request.method === 'GET' || request.method === 'HEAD')) {
      return withSecurityHeaders(landlordCheckResponse(request, canonicalSite))
    }

    if (isLegalPath(url.pathname) && (request.method === 'GET' || request.method === 'HEAD')) {
      return withSecurityHeaders(legalPageResponse(request, canonicalSite))
    }

    if ((url.pathname === '/cases' || url.pathname === '/cases/') && request.method === 'GET') {
      return withSecurityHeaders(await casesIndexPage({ env }))
    }

    if (url.pathname === '/cases/drafts' && request.method === 'GET') {
      return withSecurityHeaders(caseDraftsPage())
    }

    if (url.pathname === '/cases/drafts.js' && request.method === 'GET') {
      return withSecurityHeaders(caseDraftsScript())
    }

    if (url.pathname.startsWith('/cases/') && request.method === 'GET') {
      const caseResponse = await caseStoryPage({ request, env })
      if (caseResponse) return withSecurityHeaders(caseResponse)
    }

    const assetResponse = await env.ASSETS.fetch(request)
    if ((assetResponse.headers.get('content-type') || '').includes('text/html')) {
      if (isContractorCheckPath(url.pathname) && (request.method === 'GET' || request.method === 'HEAD')) {
        return withSecurityHeaders(contractorCheckResponse(request, canonicalSite))
      }
      if (isJobSafetyScorePath(url.pathname) && (request.method === 'GET' || request.method === 'HEAD')) {
        return withSecurityHeaders(jobSafetyScoreResponse(request, canonicalSite))
      }
      if (isLandlordCheckPath(url.pathname) && (request.method === 'GET' || request.method === 'HEAD')) {
        return withSecurityHeaders(landlordCheckResponse(request, canonicalSite))
      }
      if (isLegalPath(url.pathname) && (request.method === 'GET' || request.method === 'HEAD')) {
        return withSecurityHeaders(legalPageResponse(request, canonicalSite))
      }
      const html = await assetResponse.text()
      return withSecurityHeaders(new Response(injectLeadCapture(html), assetResponse))
    }
    return withSecurityHeaders(assetResponse)
  },
}
