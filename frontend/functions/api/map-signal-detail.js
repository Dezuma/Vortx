import {
  json,
  supabaseRest,
  supabaseRestByIds,
} from '../lib/supabase-rest.js'
import { resolveFeedAccess } from '../lib/feed-access.js'
import { rateLimit, rateLimitResponse } from '../lib/rate-limit.js'
import { deriveTradingSignalMeta, tradingRecordLabel } from '../lib/trading-filings.js'
import { extractAffectedWorkers } from '../lib/warn-notice.js'
import { loadEventEvidenceUrls, resolveEventSourceUrl } from '../lib/event-evidence.js'
import {
  loadMapCrossRows,
  loadMapLocationRows,
  parseMapBounds,
  parseMapFilters,
  searchBlobByEventId,
} from './map-signals.js'
import { API_RESEARCH_DISCLAIMER } from '../lib/product-positioning.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const CROSS_SIGNAL_DISCLAIMER =
  'This shows the timing relationship between two public filings. It is not evidence of insider knowledge, coordination, or wrongdoing.'

function mapSignalKey(url) {
  const raw = String(url.searchParams.get('id') || '').trim()
  if (raw.startsWith('cross-')) {
    const id = raw.slice(6)
    return UUID_PATTERN.test(id) ? { id, kind: 'cross', publicId: raw } : null
  }
  return UUID_PATTERN.test(raw) ? { id: raw, kind: 'signal', publicId: raw } : null
}

function signalTypeLabel(eventType) {
  const key = String(eventType || '').toLowerCase()
  if (key === 'warn_notice') return 'WARN workforce notice'
  if (key === 'bankruptcy_chapter_11') return 'Chapter 11 docket'
  if (key === 'bankruptcy_chapter_7') return 'Chapter 7 docket'
  if (key === 'bankruptcy_docket') return 'Bankruptcy docket'
  if (key === 'bankruptcy_adversary') return 'Bankruptcy adversary proceeding'
  if (key === 'mechanics_lien') return 'Lien filing'
  if (key === 'notice_of_intent') return 'Notice of intent'
  if (key === 'creditor_dispute') return 'Creditor dispute'
  if (key === 'receivership') return 'Receivership filing'
  return tradingRecordLabel(eventType)
}

function tradeAction(event) {
  const summary = String(event?.summary || '')
  const code = summary.match(/\bTransaction code:\s*([A-Z])\b/i)?.[1]?.toUpperCase()
  if (code === 'P' || /\bpurchase\b|\bbuy\b/i.test(event?.title || '')) return 'Purchase'
  if (code === 'S' || /\bsale\b|\bsell\b/i.test(event?.title || '')) return 'Sale'
  return event?.event_type === 'form_4' || event?.event_type === 'congress_trade'
    ? 'Transaction'
    : null
}

function publicLocation(location, event) {
  const fields =
    location?.source_fields && typeof location.source_fields === 'object'
      ? location.source_fields
      : {}
  const city = String(fields.city || '').trim()
  const county = String(fields.county || '').trim()
  const state = String(fields.state || '').trim().toUpperCase()
  const parts = [city, county, state].filter(
    (value, index, list) =>
      value && list.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index,
  )
  if (parts.length) return parts.join(', ')

  const label = String(location?.location_label || '')
  const addressMatch = label.match(
    /,\s*([^,]+),\s*([A-Z]{2})(?:,\s*|\s+)\d{5}(?:-\d{4})?\s*$/i,
  )
  if (addressMatch) return `${addressMatch[1].trim()}, ${addressMatch[2].toUpperCase()}`

  const jurisdiction = String(event?.jurisdiction || '').trim()
  if (jurisdiction && !/^US-(?:SEC|House|Senate|Federal|Bankruptcy)$/i.test(jurisdiction)) {
    return jurisdiction.slice(0, 120)
  }
  return 'Filed location on record'
}

const UTC_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function formatUtcDay(value) {
  const raw = String(value || '').trim().slice(0, 10)
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  const month = UTC_MONTHS[Number(match[2]) - 1]
  if (!month) return ''
  return `${month} ${Number(match[3])}, ${match[1]}`
}

function formatRecordAmount(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function dayDelta(from, to) {
  const a = Date.parse(`${String(from || '').slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${String(to || '').slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.round((b - a) / 86_400_000)
}

function tradeVerb(action) {
  const key = String(action || '').toLowerCase()
  if (key === 'purchase') return 'bought'
  if (key === 'sale') return 'sold'
  return ''
}

function companyClause(issuerName, ticker) {
  const issuer = String(issuerName || '').trim()
  const symbol = String(ticker || '').trim().toUpperCase()
  if (issuer && symbol && !issuer.toUpperCase().includes(symbol)) return `${issuer} (${symbol})`
  if (issuer) return issuer
  if (symbol) return symbol
  return ''
}

/**
 * Readable drawer copy from structured fields. Never echo the ingest field dump.
 */
export function formatMapSignalNarrative({
  eventType,
  full,
  entityName,
  ticker,
  issuerName,
  locationLabel,
  typeLabel,
  filingDate,
  tradeDate,
  workers,
  transactionAction,
  amount,
}) {
  const place = String(locationLabel || '').trim() || 'the filed location'
  const filed = formatUtcDay(filingDate)
  const traded = formatUtcDay(tradeDate)
  const type = String(eventType || '').toLowerCase()
  const label = String(typeLabel || 'Public filing').trim()
  const who = String(entityName || '').trim()
  const company = companyClause(issuerName, ticker)
  const verb = tradeVerb(transactionAction)
  const qty = formatRecordAmount(amount)

  if (!full) {
    if (type === 'warn_notice' && workers) {
      return `${Number(workers).toLocaleString('en-US')} workers are on a WARN notice in ${place}.`
    }
    if (type === 'form_4' || type === 'congress_trade') {
      const kind = type === 'congress_trade' ? 'A STOCK Act' : 'An insider'
      const move = String(transactionAction || 'filing').toLowerCase()
      return company
        ? `${kind} ${move} of ${company} is mapped to ${place}.`
        : `${kind} ${move} is mapped to ${place}.`
    }
    return `${label} filed in ${place}.`
  }

  if (type === 'warn_notice') {
    const jobs =
      workers && Number(workers) > 0
        ? `${Number(workers).toLocaleString('en-US')} workers`
        : 'a workforce change'
    const employer = who || 'An employer'
    const when = filed ? ` The state posted it ${filed}.` : ''
    return `${employer} put ${jobs} on a WARN notice in ${place}.${when} This is a workforce notice, not a verdict.`
  }

  if (type === 'form_4' || type === 'congress_trade') {
    const actor = who || (type === 'congress_trade' ? 'A lawmaker' : 'An insider')
    const when = traded || filed
    const lead = when ? `On ${when}, ${actor}` : actor
    const target = company ? ` ${company}` : ' the issuer on the filing'
    const move = verb ? ` ${verb}` : ' filed on'
    const qtyLine = qty ? ` The filing lists ${qty} in the amount/shares field.` : ''
    let posted = ''
    if (traded && filed && traded !== filed) {
      const delta = dayDelta(tradeDate, filingDate)
      posted =
        delta === 1
          ? ' The SEC posted it the next day.'
          : ` The SEC posted the filing on ${filed}.`
    } else if (filed && !traded) {
      posted = ` Filed ${filed}.`
    }
    const form = type === 'congress_trade' ? ' STOCK Act disclosure' : ''
    return `${lead}${move}${target}.${form ? ` This is a${form}.` : ''}${qtyLine}${posted} Address on the record: ${place}.`.replace(
      /\s+/g,
      ' ',
    )
  }

  const nameBit = who ? ` for ${who}` : ''
  const whenBit = filed ? ` Filed ${filed}.` : ''
  return `A ${label.toLowerCase()}${nameBit} is on the public record in ${place}.${whenBit} Public metadata only.`
}

export function mapExportPermissions(access) {
  const isAdmin = access?.profile?.role === 'admin'
  return {
    individual: Boolean(
      access?.isSubscriber && (access?.capabilities?.csvExport || isAdmin),
    ),
    bulk: Boolean(
      access?.isSubscriber && (access?.capabilities?.mapBulkExport || isAdmin),
    ),
  }
}

export function buildMapSignalDetail({
  event,
  entity,
  location,
  sourceUrl,
  sourceName,
  access,
}) {
  const full = Boolean(access?.showFullNames)
  const tradingMeta = deriveTradingSignalMeta({
    ...event,
    entity_name: entity?.canonical_name || null,
    ticker: entity?.ticker || null,
  })
  const workers =
    event?.event_type === 'warn_notice'
      ? extractAffectedWorkers(event.summary || event.title)
      : null
  const locationLabel = publicLocation(location, event)
  const typeLabel = signalTypeLabel(event?.event_type)
  const isTrade =
    event?.event_type === 'form_4' || event?.event_type === 'congress_trade'
  const publicTicker = tradingMeta.ticker_label || entity?.ticker || null
  const publicIssuer = tradingMeta.issuer_label || null
  const maskedEntityLabel = isTrade ? 'Filer [LOCKED]' : 'Company [LOCKED]'
  const entityName = full
    ? String(entity?.canonical_name || tradingMeta.filer_label || 'Entity on record').trim()
    : null
  const amount = Number.isFinite(Number(event?.amount)) ? Number(event.amount) : null
  const permissions = mapExportPermissions(access)
  const plan = String(access?.profile?.plan || 'guest').trim() || 'guest'
  const narrativeArgs = {
    eventType: event?.event_type,
    full,
    entityName,
    ticker: publicTicker,
    issuerName: publicIssuer,
    locationLabel,
    typeLabel,
    filingDate: event?.filing_date,
    tradeDate: event?.trade_date,
    workers,
    transactionAction: tradeAction(event),
    amount,
  }
  const summary = full ? formatMapSignalNarrative(narrativeArgs).slice(0, 1200) : null
  const maskedSummary = formatMapSignalNarrative({ ...narrativeArgs, full: false })

  return {
    ok: true,
    signal: {
      id: event.id,
      eventType: event.event_type,
      signalGroup: location.signal_group,
      signalTypeLabel: typeLabel,
      filingDate: event.filing_date,
      tradeDate: full ? event.trade_date || null : null,
      entityName,
      maskedEntityLabel,
      ticker: full || isTrade ? publicTicker : null,
      issuerName: full || isTrade ? publicIssuer : null,
      title: full ? String(event.title || '').trim().slice(0, 240) : null,
      summary,
      maskedSummary,
      workers,
      transactionAction: full ? tradeAction(event) : null,
      amount: full ? amount : null,
      amountLabel:
        full && amount != null && event.event_type !== 'warn_notice'
          ? 'Amount / shares field on record'
          : null,
      location: {
        label: locationLabel,
        confidence: location.geocoding_confidence,
        precision: location.location_precision,
        longitude: Number(location.longitude),
        latitude: Number(location.latitude),
      },
      sourceName: full ? sourceName || null : null,
      sourceUrl: full && access?.showSourceUrls ? sourceUrl || null : null,
      watchEntityId: event.entity_id,
      signalLink: `/?view=map&signal=${encodeURIComponent(event.id)}`,
      disclaimer: API_RESEARCH_DISCLAIMER,
    },
    access: {
      authenticated: Boolean(access?.isAuthenticated),
      subscriber: Boolean(access?.isSubscriber),
      plan,
      tierLabel: access?.tierLabel || null,
      masked: !full,
      canExportSignal: permissions.individual,
      canExportVisible: permissions.bulk,
    },
  }
}

function crossTimingPhrase(daysBetween) {
  const days = Number(daysBetween) || 0
  if (days === 0) return 'on the same date as'
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ${days > 0 ? 'before' : 'after'}`
}

export function buildCrossSignalCopy({
  tradeEvent,
  distressEvent,
  tradeEntity,
  distressEntity,
  location,
  ticker,
  daysBetween,
  full,
}) {
  const tradeMeta = deriveTradingSignalMeta({
    ...tradeEvent,
    entity_name: tradeEntity?.canonical_name || null,
  })
  const tradeName = full
    ? String(tradeEntity?.canonical_name || tradeMeta.filer_label || 'Filer on record').trim()
    : 'Filer [LOCKED]'
  const distressName = full
    ? String(distressEntity?.canonical_name || 'Company on record').trim()
    : 'Company [LOCKED]'
  const action = tradeAction(tradeEvent)
  const publicTicker = full ? String(ticker || tradeMeta.ticker_label || '').trim() : ''
  const tradeDescription =
    tradeEvent.event_type === 'congress_trade'
      ? `a STOCK Act transaction${publicTicker ? ` in ${publicTicker}` : ''}`
      : `a Form 4 ${String(action || 'transaction').toLowerCase()}${publicTicker ? ` in ${publicTicker}` : ''}`
  const amount = Number.isFinite(Number(tradeEvent.amount))
    ? Number(tradeEvent.amount).toLocaleString('en-US')
    : null
  const amountClause = full && amount ? ` with an amount/shares field of ${amount}` : ''
  const distressType = signalTypeLabel(distressEvent.event_type)
  const locationLabel = publicLocation(location, distressEvent)
  return `${tradeName} disclosed ${tradeDescription}${amountClause} on ${tradeEvent.trade_date || tradeEvent.filing_date}; ${crossTimingPhrase(daysBetween)} ${distressName} filed ${distressType} on ${distressEvent.filing_date} in ${locationLabel}.`
}

export function buildCrossSignalDetail({
  cross,
  tradeEvent,
  distressEvent,
  tradeEntity,
  distressEntity,
  location,
  tradeSourceUrl,
  distressSourceUrl,
  access,
}) {
  const full = Boolean(access?.showFullNames)
  const copy = buildCrossSignalCopy({
    tradeEvent,
    distressEvent,
    tradeEntity,
    distressEntity,
    location,
    ticker: cross.ticker,
    daysBetween: cross.days_between,
    full,
  })
  const permissions = mapExportPermissions(access)
  const workers =
    distressEvent.event_type === 'warn_notice'
      ? extractAffectedWorkers(distressEvent.summary || distressEvent.title)
      : null
  const tradeMeta = deriveTradingSignalMeta({
    ...tradeEvent,
    entity_name: tradeEntity?.canonical_name || null,
  })
  const sourceUrls =
    full && access?.showSourceUrls
      ? [
          tradeSourceUrl
            ? { label: 'Trade filing', url: tradeSourceUrl }
            : null,
          distressSourceUrl
            ? { label: 'Distress filing', url: distressSourceUrl }
            : null,
        ].filter(Boolean)
      : []
  return {
    ok: true,
    signal: {
      id: `cross-${cross.id}`,
      eventType: 'cross_signal',
      signalGroup: 'cross',
      signalTypeLabel: 'Cross-signal timing',
      filingDate: cross.distress_date,
      tradeDate: cross.trade_date,
      entityName: full ? distressEntity?.canonical_name || 'Company on record' : null,
      maskedEntityLabel: 'Company [LOCKED]',
      ticker: cross.ticker || tradeMeta.ticker_label || null,
      issuerName: full ? tradeMeta.issuer_label || null : null,
      title: full ? 'Timing relationship between two public filings' : null,
      summary: full ? copy : null,
      maskedSummary: copy,
      workers,
      transactionAction: full ? tradeAction(tradeEvent) : null,
      amount:
        full && Number.isFinite(Number(tradeEvent.amount))
          ? Number(tradeEvent.amount)
          : null,
      amountLabel: full ? 'Amount / shares field on trade filing' : null,
      location: {
        label: publicLocation(location, distressEvent),
        confidence: cross.location_confidence,
        precision: cross.location_precision,
        longitude: Number(cross.longitude),
        latitude: Number(cross.latitude),
      },
      sourceName: full ? 'Two public filings' : null,
      sourceUrl: sourceUrls[0]?.url || null,
      sourceUrls,
      watchEntityId: cross.distress_entity_id,
      signalLink: `/?view=map&signal=cross-${encodeURIComponent(cross.id)}`,
      disclaimer: `${API_RESEARCH_DISCLAIMER} Neither filing is proof of wrongdoing.`,
      crossSignal: {
        tradeSignalId: cross.trade_event_id,
        distressSignalId: cross.distress_event_id,
        correlationKeyType: cross.correlation_key_type,
        ticker: full ? cross.ticker || null : null,
        tradeEventType: cross.trade_event_type,
        distressEventType: cross.distress_event_type,
        tradeDate: cross.trade_date,
        distressDate: cross.distress_date,
        daysBetween: cross.days_between,
        factualCopy: copy,
        standingDisclaimer: CROSS_SIGNAL_DISCLAIMER,
      },
    },
    access: {
      authenticated: Boolean(access?.isAuthenticated),
      subscriber: Boolean(access?.isSubscriber),
      plan: String(access?.profile?.plan || 'guest').trim() || 'guest',
      tierLabel: access?.tierLabel || null,
      masked: !full,
      canExportSignal: permissions.individual,
      canExportVisible: permissions.bulk,
    },
  }
}

async function loadSignalRecord(env, eventId) {
  const locations = await supabaseRest(
    env,
    `map_signal_locations?select=*&event_id=eq.${encodeURIComponent(eventId)}&geocoding_confidence=neq.unresolved&limit=1`,
  )
  const location = locations?.[0]
  if (!location) return null

  const events = await supabaseRest(
    env,
    `legal_events?select=id,entity_id,source_id,event_type,title,summary,jurisdiction,filing_date,trade_date,amount,severity,confidence&id=eq.${encodeURIComponent(eventId)}&limit=1`,
  )
  const event = events?.[0]
  if (!event) return null

  const [entities, evidenceByEventId, sources] = await Promise.all([
    supabaseRest(
      env,
      `entities?select=id,canonical_name,ticker&id=eq.${encodeURIComponent(event.entity_id)}&limit=1`,
    ).catch(() => []),
    loadEventEvidenceUrls(env, supabaseRest, [event.id]),
    event.source_id
      ? supabaseRest(
          env,
          `source_catalog?select=id,name,source_url&id=eq.${encodeURIComponent(event.source_id)}&limit=1`,
        ).catch(() => [])
      : Promise.resolve([]),
  ])
  const source = sources?.[0] || null
  const sourceUrl = resolveEventSourceUrl(
    event,
    new Map(source ? [[source.id, source]] : []),
    evidenceByEventId,
  )
  return {
    event,
    entity: entities?.[0] || null,
    location,
    sourceUrl,
    sourceName: source?.name || null,
  }
}

async function loadCrossSignalRecord(env, crossId) {
  const rows = await supabaseRest(
    env,
    `map_cross_signals?select=*&id=eq.${encodeURIComponent(crossId)}&limit=1`,
  )
  const cross = rows?.[0]
  if (!cross) return null
  const events = await supabaseRestByIds(env, {
    table: 'legal_events',
    select:
      'id,entity_id,source_id,event_type,title,summary,jurisdiction,filing_date,trade_date,amount,severity,confidence',
    ids: [cross.trade_event_id, cross.distress_event_id],
  })
  const eventById = new Map(events.map((event) => [event.id, event]))
  const tradeEvent = eventById.get(cross.trade_event_id)
  const distressEvent = eventById.get(cross.distress_event_id)
  if (!tradeEvent || !distressEvent) return null
  const [entities, locations, sources, evidenceByEventId] = await Promise.all([
    supabaseRestByIds(env, {
      table: 'entities',
      select: 'id,canonical_name,ticker',
      ids: [cross.trade_entity_id, cross.distress_entity_id],
    }),
    supabaseRest(
      env,
      `map_signal_locations?select=*&event_id=eq.${encodeURIComponent(cross.distress_event_id)}&limit=1`,
    ).catch(() => []),
    supabaseRestByIds(env, {
      table: 'source_catalog',
      select: 'id,name,source_url',
      ids: [tradeEvent.source_id, distressEvent.source_id].filter(Boolean),
    }).catch(() => []),
    loadEventEvidenceUrls(env, supabaseRest, [
      cross.trade_event_id,
      cross.distress_event_id,
    ]),
  ])
  const entityById = new Map(entities.map((entity) => [entity.id, entity]))
  const sourceById = new Map(sources.map((source) => [source.id, source]))
  return {
    cross,
    tradeEvent,
    distressEvent,
    tradeEntity: entityById.get(cross.trade_entity_id) || null,
    distressEntity: entityById.get(cross.distress_entity_id) || null,
    location:
      locations?.[0] || {
        geocoding_confidence: cross.location_confidence,
        location_precision: cross.location_precision,
        source_fields: {},
      },
    tradeSourceUrl: resolveEventSourceUrl(
      tradeEvent,
      sourceById,
      evidenceByEventId,
    ),
    distressSourceUrl: resolveEventSourceUrl(
      distressEvent,
      sourceById,
      evidenceByEventId,
    ),
  }
}

function exportDenied() {
  return json(
    {
      ok: false,
      error: 'map_export_upgrade_required',
      message: 'CSV export requires Operator, Professional, or Enterprise.',
    },
    { status: 403 },
  )
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function detailCsvRows(details) {
  return details.map(({ signal }) => [
    signal.id,
    signal.entityName,
    signal.ticker,
    signal.issuerName,
    signal.eventType,
    signal.signalTypeLabel,
    signal.filingDate,
    signal.tradeDate,
    signal.location.label,
    signal.location.confidence,
    signal.location.precision,
    signal.workers,
    signal.transactionAction,
    signal.amount,
    signal.summary,
    signal.sourceUrl,
    signal.crossSignal?.daysBetween ?? null,
    signal.crossSignal?.standingDisclaimer || null,
  ])
}

/**
 * Serialize already-gated map details into the canonical CSV export.
 * @param {object[]} details Tier-shaped visible signal details.
 * @param {string} filename Static download filename.
 * @returns {Response} Private CSV response.
 * @example mapDetailsCsvResponse(details, 'vortx-visible-map.csv')
 */
export function mapDetailsCsvResponse(details, filename) {
  const rows = [
    [
      'signal_id',
      'entity',
      'ticker',
      'issuer',
      'event_type',
      'signal_type',
      'filing_date',
      'trade_date',
      'location',
      'location_confidence',
      'location_precision',
      'affected_workers',
      'transaction_action',
      'amount_or_shares',
      'summary',
      'source_url',
      'cross_days_between',
      'cross_disclaimer',
    ],
    ...detailCsvRows(details),
  ]
  return new Response(rows.map((row) => row.map(csvCell).join(',')).join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'private, no-store',
    },
  })
}

export async function onMapSignalDetailGet({ request, env }) {
  const retryAfter = rateLimit(request, {
    keyPrefix: 'map-signal-detail',
    limit: 90,
    windowMs: 60_000,
  })
  if (retryAfter) return rateLimitResponse(retryAfter)

  const key = mapSignalKey(new URL(request.url))
  if (!key) return json({ ok: false, error: 'valid_signal_id_required' }, { status: 400 })

  try {
    const [record, access] = await Promise.all([
      key.kind === 'cross'
        ? loadCrossSignalRecord(env, key.id)
        : loadSignalRecord(env, key.id),
      resolveFeedAccess(request, env),
    ])
    if (!record) return json({ ok: false, error: 'map_signal_not_found' }, { status: 404 })
    return json(
      key.kind === 'cross'
        ? buildCrossSignalDetail({ ...record, access })
        : buildMapSignalDetail({ ...record, access }),
    )
  } catch {
    return json(
      {
        ok: false,
        error: 'map_signal_unavailable',
        message: 'Signal details are temporarily unavailable.',
      },
      { status: 500 },
    )
  }
}

export async function onMapSignalCsvGet({ request, env }) {
  const retryAfter = rateLimit(request, {
    keyPrefix: 'map-signal-csv',
    limit: 30,
    windowMs: 60_000,
  })
  if (retryAfter) return rateLimitResponse(retryAfter)

  const key = mapSignalKey(new URL(request.url))
  if (!key) return json({ ok: false, error: 'valid_signal_id_required' }, { status: 400 })
  const access = await resolveFeedAccess(request, env)
  if (!mapExportPermissions(access).individual) return exportDenied()

  try {
    const record =
      key.kind === 'cross'
        ? await loadCrossSignalRecord(env, key.id)
        : await loadSignalRecord(env, key.id)
    if (!record) return json({ ok: false, error: 'map_signal_not_found' }, { status: 404 })
    const detail =
      key.kind === 'cross'
        ? buildCrossSignalDetail({ ...record, access })
        : buildMapSignalDetail({ ...record, access })
    return mapDetailsCsvResponse([detail], `vortx-map-signal-${key.publicId}.csv`)
  } catch {
    return json({ ok: false, error: 'map_export_failed' }, { status: 500 })
  }
}

/**
 * Hydrate the exact filtered signal set represented in a map viewport.
 * @param {object} env Worker environment.
 * @param {{west:number,south:number,east:number,north:number}} bounds Validated viewport bounds.
 * @param {{eventTypes:string[],query:string,crossOnly:boolean}} filters Parsed map filters.
 * @param {object} access Resolved full-access capability object.
 * @returns {Promise<object[]>} Tier-shaped detail payloads in the visible viewport.
 * @example await loadVisibleMapDetails(env, bounds, filters, enterpriseAccess)
 */
export async function loadVisibleMapDetails(env, bounds, filters, access) {
  let [locations, crossRows] = await Promise.all([
    filters.crossOnly
      ? Promise.resolve([])
      : loadMapLocationRows(env, bounds, {
          select:
            'event_id,entity_id,event_type,signal_group,filing_date,longitude,latitude,location_label,geocoding_confidence,location_precision,source_fields',
          eventTypes: filters.eventTypes,
        }),
    loadMapCrossRows(env, bounds),
  ])
  const allowedEventTypes = new Set(filters.eventTypes)
  crossRows = crossRows.filter(
    (row) =>
      allowedEventTypes.has(row.trade_event_type) ||
      allowedEventTypes.has(row.distress_event_type),
  )
  if (filters.query) {
    const query = filters.query.toLowerCase()
    const searchBlobs = await searchBlobByEventId(env, [
      ...locations.map((row) => row.event_id),
      ...crossRows.flatMap((row) => [row.trade_event_id, row.distress_event_id]),
    ])
    locations = locations.filter((row) =>
      String(searchBlobs.get(row.event_id) || '').includes(query),
    )
    crossRows = crossRows.filter((row) =>
      [
        searchBlobs.get(row.trade_event_id),
        searchBlobs.get(row.distress_event_id),
        row.ticker,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }
  const eventIds = locations.map((row) => row.event_id)
  const events = await supabaseRestByIds(env, {
    table: 'legal_events',
    select:
      'id,entity_id,source_id,event_type,title,summary,jurisdiction,filing_date,trade_date,amount,severity,confidence',
    ids: eventIds,
  })
  const entities = await supabaseRestByIds(env, {
    table: 'entities',
    select: 'id,canonical_name,ticker',
    ids: events.map((row) => row.entity_id).filter(Boolean),
  })
  const sources = await supabaseRestByIds(env, {
    table: 'source_catalog',
    select: 'id,name,source_url',
    ids: events.map((row) => row.source_id).filter(Boolean),
  })
  const evidenceByEventId = await loadEventEvidenceUrls(env, supabaseRest, eventIds)
  const eventById = new Map(events.map((row) => [row.id, row]))
  const entityById = new Map(entities.map((row) => [row.id, row]))
  const sourceById = new Map(sources.map((row) => [row.id, row]))
  const details = []
  for (const location of locations) {
    const event = eventById.get(location.event_id)
    if (!event) continue
    const source = sourceById.get(event.source_id)
    details.push(
      buildMapSignalDetail({
        event,
        entity: entityById.get(event.entity_id) || null,
        location,
        sourceName: source?.name || null,
        sourceUrl: resolveEventSourceUrl(event, sourceById, evidenceByEventId),
        access,
      }),
    )
  }
  const crossRecords = await Promise.all(
    crossRows.map((row) => loadCrossSignalRecord(env, row.id)),
  )
  for (const record of crossRecords) {
    if (record) details.push(buildCrossSignalDetail({ ...record, access }))
  }
  return details
}

export async function onMapVisibleCsvGet({ request, env }) {
  const retryAfter = rateLimit(request, {
    keyPrefix: 'map-visible-csv',
    limit: 10,
    windowMs: 60_000,
  })
  if (retryAfter) return rateLimitResponse(retryAfter)

  const access = await resolveFeedAccess(request, env)
  if (!mapExportPermissions(access).bulk) {
    return json(
      {
        ok: false,
        error: 'enterprise_required',
        message: 'Visible-map bulk export requires Enterprise.',
      },
      { status: 403 },
    )
  }
  const url = new URL(request.url)
  const bounds = parseMapBounds(url)
  if (!bounds) return json({ ok: false, error: 'valid_bounds_required' }, { status: 400 })

  try {
    const filters = parseMapFilters(url)
    const details = await loadVisibleMapDetails(env, bounds, filters, access)
    return mapDetailsCsvResponse(
      details,
      `vortx-visible-map-${new Date().toISOString().slice(0, 10)}.csv`,
    )
  } catch {
    return json({ ok: false, error: 'map_bulk_export_failed' }, { status: 500 })
  }
}
