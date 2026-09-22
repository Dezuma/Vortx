import { matchConfidence, normalizeCompanyName, isValidTicker } from '../../../worker/match-ticker.js'

export const MATCH_MIN_CONFIDENCE = 0.55
export const MATCH_TOP_N = 5

export function parseCompanyNames(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || '').trim()).filter(Boolean)
  }
  return String(raw || '')
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function scoreEntityCandidates(inputName, entities) {
  const query = String(inputName || '').trim()
  if (!query) return []

  const normalizedQuery = normalizeCompanyName(query)
  const tickerQuery = query.toUpperCase()
  const scored = []

  for (const entity of entities || []) {
    let confidence = matchConfidence(query, entity.canonical_name || '')
    if (entity.ticker && isValidTicker(entity.ticker) && entity.ticker.toUpperCase() === tickerQuery) {
      confidence = Math.max(confidence, 0.99)
    }
    if (entity.ticker && isValidTicker(query) && entity.ticker.toUpperCase() === tickerQuery) {
      confidence = Math.max(confidence, 0.99)
    }
    if (confidence >= MATCH_MIN_CONFIDENCE) {
      scored.push({
        entity_id: entity.id,
        name: entity.canonical_name,
        jurisdiction: entity.jurisdiction || null,
        ticker: entity.ticker || null,
        confidence: Math.round(confidence * 1000) / 1000,
      })
    }
  }

  scored.sort((a, b) => b.confidence - a.confidence || String(a.name).localeCompare(String(b.name)))

  if (!scored.length && normalizedQuery.length >= 2) {
    return []
  }

  return scored.slice(0, MATCH_TOP_N)
}

export function buildIlikeFilter(names) {
  const tokens = new Set()
  for (const name of names) {
    const cleaned = String(name || '')
      .replace(/[%_]/g, ' ')
      .trim()
    if (!cleaned) continue
    tokens.add(cleaned.slice(0, 80))
    const first = cleaned.split(/\s+/)[0]
    if (first && first.length >= 3) tokens.add(first.slice(0, 40))
    if (isValidTicker(cleaned)) tokens.add(cleaned.toUpperCase())
  }
  return [...tokens]
}

export async function fetchEntityCandidates(env, supabaseRest, names) {
  const tokens = buildIlikeFilter(names)
  const select = 'id,canonical_name,jurisdiction,ticker,entity_type'
  const fetched = new Map()

  for (const name of names) {
    const ticker = String(name || '').trim().toUpperCase()
    if (!isValidTicker(ticker)) continue
    const rows = await supabaseRest(env, `entities?select=${select}&ticker=eq.${encodeURIComponent(ticker)}&limit=5`)
    for (const row of rows || []) {
      if (String(row.entity_type || '').toLowerCase().includes('person')) continue
      fetched.set(row.id, row)
    }
  }

  for (const token of tokens.slice(0, 12)) {
    if (isValidTicker(token)) continue
    const encoded = encodeURIComponent(`*${token}*`)
    const rows = await supabaseRest(
      env,
      `entities?select=${select}&or=(canonical_name.ilike.${encoded},ticker.ilike.${encoded})&limit=40`,
    )
    for (const row of rows || []) {
      if (String(row.entity_type || '').toLowerCase().includes('person')) continue
      fetched.set(row.id, row)
    }
  }

  return [...fetched.values()]
}
