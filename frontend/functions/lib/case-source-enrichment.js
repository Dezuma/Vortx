/**
 * Enrich case story source fields from CourtListener raw payloads and party APIs.
 * Adversary proceedings often have empty party rows; debtor/trustee names may live
 * on the linked lead bankruptcy docket. Only adds public-record API facts.
 */

import { extractNamedParties, stripRecordPrefix } from './case-stories.js'

const PARTY_ROLE_LABELS = {
  1: 'plaintiff',
  2: 'defendant',
  3: 'petitioner',
  4: 'respondent',
  5: 'debtor',
  6: 'creditor',
  7: 'trustee',
  8: 'attorney',
  9: 'interested party',
  10: 'plaintiff',
  11: 'defendant',
}

const LEAD_CASE_RE = /\b(\d:\d{2}-bk-\d+)\b/gi
const DOCKET_NUM_RE = /\b(\d{2}-\d{5,6})\b/g

const apiCache = new Map()

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function addParty(parties, seen, name, role) {
  const clean = cleanText(name)
  if (!clean || clean.length < 2) return
  const key = clean.toLowerCase()
  if (seen.has(key)) return
  seen.add(key)
  parties.push({ name: clean, role: cleanText(role) || 'party on record' })
}

function partyRoleLabel(party) {
  const types = Array.isArray(party?.party_types) ? party.party_types : []
  for (const row of types) {
    const label = cleanText(row?.name)
    if (label) return label
  }
  const roleId = party?.attorneys?.[0]?.role ?? party?.role
  if (roleId != null && PARTY_ROLE_LABELS[roleId]) return PARTY_ROLE_LABELS[roleId]
  return 'party on record'
}

function courtSlugFromPayload(payload) {
  const court = cleanText(payload?.court)
  if (!court) return null
  if (!/^https?:\/\//i.test(court)) return court.toLowerCase()
  return court.match(/\/courts\/([^/?#]+)/i)?.[1]?.replace(/\/$/, '')?.toLowerCase() || null
}

function contextFromPayload(payload) {
  const lines = []
  const caseNameFull = cleanText(payload?.case_name_full)
  const caseName = cleanText(payload?.case_name)
  const caption = cleanText(payload?.caption)
  const docketNumber = cleanText(payload?.docket_number)
  const chapter = cleanText(payload?.chapter)
  const court = cleanText(payload?.court)

  if (caseNameFull && caseNameFull !== caseName) lines.push(`Full case caption on record: ${caseNameFull}`)
  else if (caption && caption !== caseName) lines.push(`Caption on record: ${caption}`)
  if (docketNumber) lines.push(`Docket number on record: ${docketNumber}`)
  if (chapter) lines.push(`Bankruptcy chapter on record: ${chapter}`)
  if (court && !/^https?:\/\//i.test(court)) lines.push(`Court on record: ${court}`)

  return lines
}

async function fetchCourtListenerJson(url, token, timeoutMs = 20_000) {
  if (apiCache.has(url)) return apiCache.get(url)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: { authorization: `Token ${token}`, accept: 'application/json' },
      signal: controller.signal,
    })
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after') || 45)
      await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 60) * 1000))
      const retry = await fetch(url, {
        headers: { authorization: `Token ${token}`, accept: 'application/json' },
        signal: controller.signal,
      })
      if (!retry.ok) return null
      const payload = await retry.json().catch(() => null)
      apiCache.set(url, payload)
      return payload
    }
    if (!response.ok) return null
    const payload = await response.json().catch(() => null)
    apiCache.set(url, payload)
    return payload
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function fetchDocketDetail(docketId, env) {
  const token = String(env.COURTLISTENER_API_TOKEN || '').trim()
  if (!token || !docketId) return null
  return fetchCourtListenerJson(`https://www.courtlistener.com/api/rest/v4/dockets/${encodeURIComponent(String(docketId))}/`, token)
}

async function fetchPartiesForDocket(docketId, env) {
  const token = String(env.COURTLISTENER_API_TOKEN || '').trim()
  if (!token || !docketId) return []

  const url =
    `https://www.courtlistener.com/api/rest/v4/parties/?docket=${encodeURIComponent(String(docketId))}` +
    `&filter_nested_results=true&page_size=25`
  const payload = await fetchCourtListenerJson(url, token)
  return Array.isArray(payload?.results) ? payload.results : []
}

async function fetchBankruptcyInformationForDocket(docketId, env) {
  const token = String(env.COURTLISTENER_API_TOKEN || '').trim()
  if (!token || !docketId) return null

  const url =
    `https://www.courtlistener.com/api/rest/v4/bankruptcy-information/?docket=${encodeURIComponent(String(docketId))}&page_size=5`
  const payload = await fetchCourtListenerJson(url, token)
  const rows = Array.isArray(payload?.results) ? payload.results : []
  for (const row of rows) {
    const rowDocketId = row?.docket_id || String(row?.docket || '').match(/\/dockets\/(\d+)\/?$/)?.[1]
    if (String(rowDocketId) === String(docketId)) return row
  }
  return rows[0] || null
}

async function fetchDocketEntries(docketId, env) {
  const token = String(env.COURTLISTENER_API_TOKEN || '').trim()
  if (!token || !docketId) return []

  const url =
    `https://www.courtlistener.com/api/rest/v4/docket-entries/?docket=${encodeURIComponent(String(docketId))}` +
    `&order_by=recap_sequence_number&page_size=15`
  const payload = await fetchCourtListenerJson(url, token)
  return Array.isArray(payload?.results) ? payload.results : []
}

async function searchDockets(query, courtSlug, env) {
  const token = String(env.COURTLISTENER_API_TOKEN || '').trim()
  if (!token || !query) return []

  const params = new URLSearchParams({
    type: 'd',
    q: query,
    page_size: '5',
  })
  if (courtSlug) params.set('court', courtSlug)
  const payload = await fetchCourtListenerJson(
    `https://www.courtlistener.com/api/rest/v4/search/?${params.toString()}`,
    token,
  )
  return Array.isArray(payload?.results) ? payload.results : []
}

async function fetchDocketByNumber(courtSlug, docketNumber, env) {
  const token = String(env.COURTLISTENER_API_TOKEN || '').trim()
  if (!token || !docketNumber) return null
  const params = new URLSearchParams({ docket_number: String(docketNumber), page_size: '3' })
  if (courtSlug) params.set('court', courtSlug)
  const payload = await fetchCourtListenerJson(
    `https://www.courtlistener.com/api/rest/v4/dockets/?${params.toString()}`,
    token,
  )
  return payload?.results?.[0] || null
}

function parentDocketId(detail) {
  const candidates = [
    detail?.parent_docket_id,
    detail?.parent_docket,
    detail?.appeal_from_id,
    detail?.referred_to_id,
  ]
  for (const value of candidates) {
    if (value == null) continue
    const asString = String(value)
    const fromUrl = asString.match(/\/dockets\/(\d+)\/?$/)?.[1]
    if (fromUrl) return fromUrl
    if (/^\d+$/.test(asString)) return asString
  }
  return null
}

function collectRelatedDocketHints(detail, entries, sourceFields) {
  const hints = new Set()
  const textParts = [
    stripRecordPrefix(sourceFields?.title || ''),
    sourceFields?.summary,
    detail?.case_name,
    detail?.case_name_full,
    detail?.cause,
  ]
  for (const entry of entries || []) {
    textParts.push(entry?.description || '')
    textParts.push(entry?.short_description || '')
  }

  const blob = textParts.join('\n')
  for (const match of blob.matchAll(LEAD_CASE_RE)) hints.add(`num:${match[1]}`)
  for (const match of blob.matchAll(DOCKET_NUM_RE)) hints.add(`num:${match[1]}`)

  const parentId = parentDocketId(detail)
  if (parentId) hints.add(`id:${parentId}`)

  return { hints: [...hints], court: courtSlugFromPayload(detail) }
}

async function resolveRelatedDocketIds(hints, courtSlug, env) {
  const ids = new Set()
  for (const hint of hints) {
    if (hint.startsWith('id:')) {
      ids.add(hint.slice(3))
      continue
    }
    if (!hint.startsWith('num:')) continue
    const number = hint.slice(4)
    const row = await fetchDocketByNumber(courtSlug, number.replace(/^\d:/, ''), env)
    if (row?.id) ids.add(row.id)
    const shortNumber = number.match(/(\d{2}-\d{5,6})$/)?.[1]
    if (shortNumber && shortNumber !== number) {
      const shortRow = await fetchDocketByNumber(courtSlug, shortNumber, env)
      if (shortRow?.id) ids.add(shortRow.id)
    }
  }
  return [...ids].slice(0, 3)
}

function bankruptcyContextLines(info, docketDetail) {
  if (!info || typeof info !== 'object') return []
  const lines = []
  const chapter = cleanText(info.chapter || docketDetail?.chapter)
  const trustee = cleanText(info.trustee_str || info.trustee)
  const debtor = cleanText(info.debtor || info.debtor_name || docketDetail?.case_name)
  const leadCase = cleanText(info.lead_case || info.lead_case_number || info.main_case_number)

  if (chapter) lines.push(`Bankruptcy chapter on record: ${chapter}`)
  if (debtor) lines.push(`Debtor named on bankruptcy record: ${debtor}`)
  if (trustee) lines.push(`Trustee named on bankruptcy record: ${trustee}`)
  if (leadCase) lines.push(`Lead bankruptcy case number on record: ${leadCase}`)
  return lines
}

async function enrichFromDocketId(docketId, env, parties, seen, contextLines, labelPrefix = '') {
  const detail = await fetchDocketDetail(docketId, env)
  if (detail?.case_name) {
    contextLines.push(`${labelPrefix}Related docket on record: ${cleanText(detail.case_name)} (${cleanText(detail.docket_number) || `id ${docketId}`})`)
    addParty(parties, seen, detail.case_name, `${labelPrefix}party named on related docket`)
  }

  const [partyRows, bankruptcyInfo] = await Promise.all([
    fetchPartiesForDocket(docketId, env),
    fetchBankruptcyInformationForDocket(docketId, env),
  ])

  for (const row of partyRows) {
    addParty(parties, seen, row?.name, `${labelPrefix}${partyRoleLabel(row)} on related docket`)
  }
  contextLines.push(...bankruptcyContextLines(bankruptcyInfo, detail).map((line) => `${labelPrefix}${line}`))

  if (bankruptcyInfo) {
    const debtor = cleanText(bankruptcyInfo.debtor || bankruptcyInfo.debtor_name || detail?.case_name)
    const trustee = cleanText(bankruptcyInfo.trustee_str || bankruptcyInfo.trustee)
    if (debtor) addParty(parties, seen, debtor, `${labelPrefix}debtor on related bankruptcy docket`)
    if (trustee) addParty(parties, seen, trustee, `${labelPrefix}trustee on related bankruptcy docket`)
  }

  return detail
}

/**
 * Merge raw CourtListener payload + live party lookup into case source fields.
 */
export async function enrichCaseSourceFields(env, sourceFields, { rawPayload } = {}) {
  const parties = [...(sourceFields?.named_parties || [])]
  const seen = new Set(parties.map((row) => row.name.toLowerCase()))
  const contextLines = []

  if (rawPayload && typeof rawPayload === 'object') {
    contextLines.push(...contextFromPayload(rawPayload))
    for (const row of extractNamedParties({
      title: cleanText(rawPayload.case_name_full || rawPayload.case_name || rawPayload.caption),
      summary: contextLines.join(' '),
    })) {
      addParty(parties, seen, row.name, row.role)
    }
  }

  const docketId = rawPayload?.id || rawPayload?.docket_id
  if (!docketId || !env?.COURTLISTENER_API_TOKEN) {
    return {
      ...sourceFields,
      named_parties: parties.slice(0, 12),
      record_context: contextLines.filter(Boolean).join('\n') || null,
    }
  }

  const [primaryDetail, entries] = await Promise.all([
    enrichFromDocketId(docketId, env, parties, seen, contextLines),
    fetchDocketEntries(docketId, env),
  ])

  const { hints, court } = collectRelatedDocketHints(primaryDetail || rawPayload, entries, sourceFields)
  const relatedIds = await resolveRelatedDocketIds(hints, court, env)
  for (const relatedId of relatedIds) {
    if (String(relatedId) === String(docketId)) continue
    await enrichFromDocketId(relatedId, env, parties, seen, contextLines, 'Related case: ')
  }

  const versus = stripRecordPrefix(primaryDetail?.case_name || sourceFields?.title || '').match(/^(.+?)\s+v\.?\s+(.+)$/i)
  if (versus) {
    addParty(parties, seen, versus[1], 'party named in adversary caption')
    addParty(parties, seen, versus[2], 'party named in adversary caption')
  }

  return {
    ...sourceFields,
    named_parties: parties.slice(0, 12),
    record_context: contextLines.filter(Boolean).join('\n') || null,
  }
}

/** Merge related legal_events rows already in our database (same court, linked docket numbers). */
export function mergeRelatedRecordContext(sourceFields, relatedEvents = []) {
  if (!Array.isArray(relatedEvents) || !relatedEvents.length) return sourceFields
  const parties = [...(sourceFields?.named_parties || [])]
  const seen = new Set(parties.map((row) => row.name.toLowerCase()))
  const contextLines = sourceFields?.record_context ? [sourceFields.record_context] : []

  for (const row of relatedEvents) {
    const title = String(row?.title || '').trim()
    const summary = String(row?.summary || '').trim()
    if (title) contextLines.push(`Related record in Vortx database: ${title}`)
    if (summary) contextLines.push(summary)
    for (const party of extractNamedParties({ title, summary })) {
      const key = party.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      parties.push({ ...party, role: `${party.role}; related record in database` })
    }
  }

  return {
    ...sourceFields,
    named_parties: parties.slice(0, 12),
    record_context: contextLines.filter(Boolean).join('\n') || null,
  }
}
