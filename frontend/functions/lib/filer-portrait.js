const WIKI_UA = 'VortxFilerPortrait/1.0 (https://vortxmkt.com; public-record research)'
const WIKI_HOST = 'en.wikipedia.org'
const WIKIDATA_HOST = 'www.wikidata.org'
const IMAGE_HOST = 'upload.wikimedia.org'
const COMMONS_HOST = 'commons.wikimedia.org'
const FMP_HOST = 'financialmodelingprep.com'
const STOP = new Set([
  'the',
  'of',
  'and',
  'inc',
  'llc',
  'corp',
  'ltd',
  'lp',
  'co',
  'company',
  'group',
])
const PERSON_HINT =
  /politician|representative|senator|congress|chief executive|\bceo\b|businessperson|executive|director|investor|chair|officer|founder|journalist|attorney|governor/i
const ORG_HINT =
  /compan(y|ies)|corporation|\bbank\b|fund|investment|asset management|holdings|financial|\bllc\b|\binc\b|partners|trust|manager|etf|capital|mining|energy|enterprise/i
const ORG_P31 = new Set([
  'Q783794',
  'Q4830453',
  'Q6881511',
  'Q891723',
  'Q161726',
  'Q159941',
  'Q22687',
  'Q43229',
  'Q167037',
])
const cache = new Map()
const CACHE_MS = 6 * 60 * 60 * 1000
export const COMPANY_EVENT_TYPES = new Set([
  'warn_notice',
  'notice_of_intent',
  'mechanics_lien',
  'creditor_dispute',
  'receivership',
  'bankruptcy_chapter_11',
  'bankruptcy_chapter_7',
  'bankruptcy_docket',
  'bankruptcy_adversary',
])

export function isPortraitType(type) {
  return type === 'form_4' || type === 'institutional_13f' || COMPANY_EVENT_TYPES.has(String(type || ''))
}

export function cleanQuery(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

export function looksLikePersonName(name) {
  const raw = cleanQuery(name)
  const words = raw.split(' ').filter(Boolean)
  if (words.length < 2 || words.length > 5) return false
  if (
    /\b(llc|inc|corp|fund|lp|trust|partners|holdings|capital|bank|etf|financial|advisors|management|lp)\b/i.test(
      raw,
    )
  ) {
    return false
  }
  return /^[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*)+(?:\s+[A-Za-z])?$/.test(raw)
}

export function personQueryVariants(name) {
  const raw = cleanQuery(name)
  const words = raw.split(' ').filter(Boolean)
  const out = []
  const push = (value) => {
    const next = cleanQuery(value)
    if (next && !out.includes(next)) out.push(next)
  }
  push(raw)
  if (words.length === 2) push(`${words[1]} ${words[0]}`)
  if (words.length === 3 && words[2].length === 1) push(`${words[1]} ${words[0]}`)
  if (words.length === 3 && words[2].length > 1) {
    push(`${words[1]} ${words[2]} ${words[0]}`)
    push(`${words[1]} ${words[0]}`)
  }
  return out
}

export function cleanOrgName(name) {
  return cleanQuery(name)
    .replace(/^HR\/A\s*-\s*/i, '')
    .replace(/\s+[A-Z]$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function queryTokens(value) {
  return cleanQuery(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word && !STOP.has(word))
}

export function titleFits(query, title) {
  const q = queryTokens(query)
  const t = queryTokens(title)
  if (!q.length || !t.length) return false
  const hits = q.filter((word) => t.includes(word) || t.some((part) => part.startsWith(word)))
  return hits.length >= Math.min(2, q.length)
}

export function safePublicImageUrl(raw) {
  try {
    const url = new URL(String(raw || ''))
    if (url.protocol !== 'https:') return ''
    if (url.username || url.password) return ''
    if (url.hostname === IMAGE_HOST) return url.toString()
    if (url.hostname === COMMONS_HOST && url.pathname.startsWith('/wiki/Special:FilePath/')) {
      return url.toString()
    }
    if (url.hostname === FMP_HOST && /^\/image-stock\/[A-Z]{1,5}\.png$/.test(url.pathname)) {
      return url.toString()
    }
    return ''
  } catch {
    return ''
  }
}

export function safeWikiImageUrl(raw) {
  return safePublicImageUrl(raw)
}

function pageBlob(summary) {
  return `${summary?.description || ''} ${summary?.extract || ''}`
}

export function classifyWikiPage(summary, role) {
  if (!summary || summary.type === 'disambiguation') return ''
  const src = safePublicImageUrl(summary.thumbnail?.source || summary.originalimage?.source)
  if (!src) return ''
  const blob = pageBlob(summary)
  if (role === 'person') return PERSON_HINT.test(blob) ? 'person' : ''
  if (role === 'building') {
    return ORG_HINT.test(blob) || /headquarters|building|tower|campus/i.test(blob) ? 'building' : ''
  }
  return ORG_HINT.test(blob) ? 'company' : ''
}

export function portraitCandidates({ type, name, issuer, ticker } = {}) {
  const out = []
  const seen = new Set()
  const push = (q, role) => {
    const query = role === 'org' || role === 'building' ? cleanOrgName(q) : cleanQuery(q)
    const key = `${role}:${query.toLowerCase()}`
    if (!query || seen.has(key)) return
    if (role !== 'person' && /^[A-Z]{1,5}$/.test(query)) return
    seen.add(key)
    out.push({ query, role })
  }
  if (type === 'institutional_13f') {
    if (name) {
      push(name, 'org')
      push(`${cleanOrgName(name)} headquarters`, 'building')
    }
    if (issuer) push(issuer, 'org')
  } else if (type === 'form_4') {
    if (name && looksLikePersonName(name)) {
      for (const variant of personQueryVariants(name)) push(variant, 'person')
    } else if (name) {
      push(name, 'org')
      push(`${cleanOrgName(name)} headquarters`, 'building')
    }
    if (issuer) {
      push(issuer, 'org')
      push(`${cleanOrgName(issuer)} headquarters`, 'building')
    }
  } else if (COMPANY_EVENT_TYPES.has(type)) {
    if (name) {
      push(name, 'org')
      push(`${cleanOrgName(name)} headquarters`, 'building')
    }
    if (issuer) {
      push(issuer, 'org')
      push(`${cleanOrgName(issuer)} headquarters`, 'building')
    }
  }
  return out
}

function jsonHeaders() {
  return {
    accept: 'application/json',
    'user-agent': WIKI_UA,
  }
}

async function wikiSummary(query, fetchImpl) {
  const title = encodeURIComponent(query.replace(/\s+/g, '_'))
  const url = `https://${WIKI_HOST}/api/rest_v1/page/summary/${title}`
  const response = await fetchImpl(url, { headers: jsonHeaders() })
  if (!response.ok) return null
  return response.json()
}

async function wikidataSearch(query, fetchImpl) {
  const url = `https://${WIKIDATA_HOST}/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&limit=5&format=json`
  const response = await fetchImpl(url, { headers: jsonHeaders() })
  if (!response.ok) return []
  const body = await response.json()
  return Array.isArray(body?.search) ? body.search : []
}

async function wikidataEntity(id, fetchImpl) {
  if (!/^Q\d+$/.test(String(id || ''))) return null
  const url = `https://${WIKIDATA_HOST}/w/api.php?action=wbgetentities&ids=${id}&props=claims|descriptions|labels&languages=en&format=json`
  const response = await fetchImpl(url, { headers: jsonHeaders() })
  if (!response.ok) return null
  const body = await response.json()
  return body?.entities?.[id] || null
}

function claimId(entity, prop) {
  return (entity?.claims?.[prop] || [])
    .map((row) => row?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean)
}

function claimFile(entity, prop) {
  return String(entity?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value || '')
}

function isHuman(entity) {
  return claimId(entity, 'P31').includes('Q5')
}

function isOrgEntity(entity) {
  return claimId(entity, 'P31').some((id) => ORG_P31.has(id))
}

export function commonsFileUrl(fileName) {
  const file = String(fileName || '').trim()
  if (!file || /[<>\r\n]/.test(file)) return ''
  return safePublicImageUrl(
    `https://${COMMONS_HOST}/wiki/Special:FilePath/${encodeURIComponent(file)}?width=330`,
  )
}

function wikidataImage(entity, role) {
  const props = role === 'person' ? ['P18'] : ['P18', 'P154']
  for (const prop of props) {
    const src = commonsFileUrl(claimFile(entity, prop))
    if (src) return src
  }
  return ''
}

function classifyWikidata(entity, hit, role, query) {
  if (!entity) return ''
  const label = entity.labels?.en?.value || hit?.label || ''
  const desc = entity.descriptions?.en?.value || hit?.description || ''
  const blob = `${label} ${desc}`
  const fitQuery = query.replace(/ headquarters$/i, '')
  if (!titleFits(fitQuery, label) && !titleFits(fitQuery, hit?.label || '')) return ''
  if (role === 'person') {
    if (!isHuman(entity) && !PERSON_HINT.test(blob)) return ''
    return wikidataImage(entity, 'person') ? 'person' : ''
  }
  if (isHuman(entity)) return ''
  if (!ORG_HINT.test(blob) && !isOrgEntity(entity) && !/headquarters|building|tower|campus/i.test(blob)) {
    return ''
  }
  if (!wikidataImage(entity, role)) return ''
  return role === 'building' ? 'building' : 'company'
}

export function tickerLogoUrl(ticker) {
  const symbol = cleanQuery(ticker).toUpperCase()
  if (!/^[A-Z]{1,5}$/.test(symbol)) return ''
  return safePublicImageUrl(`https://${FMP_HOST}/image-stock/${symbol}.png`)
}

export async function confirmTickerLogo(ticker, fetchImpl = globalThis.fetch) {
  const src = tickerLogoUrl(ticker)
  if (!src) return ''
  try {
    const response = await fetchImpl(src, {
      method: 'HEAD',
      headers: { 'user-agent': WIKI_UA },
    })
    if (!response.ok) return ''
    const type = String(response.headers.get('content-type') || '')
    return type.startsWith('image/') ? src : ''
  } catch {
    return ''
  }
}

async function resolveCandidate(candidate, fetchImpl) {
  try {
    const summary = await wikiSummary(candidate.query, fetchImpl)
    const kind = classifyWikiPage(summary, candidate.role)
    if (kind) {
      const src = safePublicImageUrl(summary.thumbnail?.source || summary.originalimage?.source)
      if (src && titleFits(candidate.query.replace(/ headquarters$/i, ''), summary.title)) {
        return { src, kind }
      }
    }
  } catch {
    // try Wikidata next
  }
  try {
    const hits = await wikidataSearch(candidate.query.replace(/ headquarters$/i, ''), fetchImpl)
    for (const hit of hits.slice(0, 4)) {
      const entity = await wikidataEntity(hit.id, fetchImpl)
      const kind = classifyWikidata(entity, hit, candidate.role, candidate.query)
      if (!kind) continue
      const src = wikidataImage(entity, candidate.role)
      if (src) return { src, kind }
    }
  } catch {
    return null
  }
  return null
}

export async function resolveFilerPortrait(input = {}, fetchImpl = globalThis.fetch) {
  const type = String(input.type || '')
  if (!isPortraitType(type)) return null
  const name = cleanQuery(input.name)
  const issuer = cleanQuery(input.issuer)
  const ticker = cleanQuery(input.ticker).toUpperCase()
  const cacheKey = `${type}|${name}|${issuer}|${ticker}`
  const hit = cache.get(cacheKey)
  if (hit && hit.exp > Date.now()) return hit.value
  const candidates = portraitCandidates({ type, name, issuer, ticker })
  let value = null
  for (const candidate of candidates) {
    value = await resolveCandidate(candidate, fetchImpl)
    if (value) break
  }
  if (!value && type !== 'institutional_13f' && ticker) {
    const src = await confirmTickerLogo(ticker, fetchImpl)
    if (src) value = { src, kind: 'company' }
  }
  cache.set(cacheKey, { exp: Date.now() + CACHE_MS, value })
  return value
}
