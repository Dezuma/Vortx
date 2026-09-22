/**
 * Resolve an issuer entity id for a Form 4 (person) watch so alerts can match
 * filer OR issuer filings.
 */
import { deriveTradingSignalMeta } from './trading-filings.js'

export async function resolveLinkedIssuerEntity(env, supabaseRest, filerEntityId) {
  const filerId = String(filerEntityId || '').trim()
  if (!filerId) return null

  let events = []
  try {
    events = await supabaseRest(
      env,
      `legal_events?select=id,entity_id,event_type,title,summary&entity_id=eq.${encodeURIComponent(filerId)}&event_type=eq.form_4&order=filing_date.desc&limit=3`,
    )
  } catch {
    return null
  }

  const event = (events || [])[0]
  if (!event) return null
  const meta = deriveTradingSignalMeta(event)
  const ticker = String(meta.ticker_label || '').trim().toUpperCase()
  const issuerLabel = String(meta.issuer_label || '').trim()

  if (ticker) {
    try {
      const byTicker = await supabaseRest(
        env,
        `entities?select=id,canonical_name,ticker&ticker=eq.${encodeURIComponent(ticker)}&limit=5`,
      )
      const match = (byTicker || []).find((row) => String(row.id) !== filerId)
      if (match?.id) {
        return {
          issuer_entity_id: match.id,
          ticker,
          issuer_name: match.canonical_name || issuerLabel || null,
        }
      }
    } catch {
      // fall through
    }
  }

  if (issuerLabel && issuerLabel.length >= 3) {
    try {
      const byName = await supabaseRest(
        env,
        `entities?select=id,canonical_name,ticker&canonical_name=ilike.${encodeURIComponent(issuerLabel)}&limit=5`,
      )
      const match = (byName || []).find((row) => String(row.id) !== filerId)
      if (match?.id) {
        return {
          issuer_entity_id: match.id,
          ticker: String(match.ticker || ticker || '').toUpperCase() || null,
          issuer_name: match.canonical_name || issuerLabel,
        }
      }
    } catch {
      // ignore
    }
  }

  return ticker || issuerLabel
    ? { issuer_entity_id: null, ticker: ticker || null, issuer_name: issuerLabel || null }
    : null
}
