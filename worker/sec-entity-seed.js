import { isValidTicker } from './match-ticker.js'

/** @typedef {{ cik_str?: number | string, ticker: string, title: string }} SecTickerEntry */

export function secEntityRow(entry) {
  const ticker = String(entry.ticker || '').trim().toUpperCase()
  const title = String(entry.title || '').trim()
  if (!isValidTicker(ticker) || !title) return null
  return {
    canonical_name: title,
    entity_type: 'company',
    ticker,
    jurisdiction: 'US',
    status: 'unknown',
  }
}

export function dedupeSecEntries(entries) {
  const byTicker = new Map()
  for (const entry of entries || []) {
    const row = secEntityRow(entry)
    if (!row) continue
    if (!byTicker.has(row.ticker)) byTicker.set(row.ticker, row)
  }
  return [...byTicker.values()]
}

export function filterNewSecRows(secRows, existingTickers) {
  const known = existingTickers instanceof Set ? existingTickers : new Set(existingTickers)
  return secRows.filter((row) => !known.has(String(row.ticker || '').toUpperCase()))
}
