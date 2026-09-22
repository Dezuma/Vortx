import type { PublicSignal } from '../api'
import { getTradingSignals } from '../api'
import { supabase } from './supabase'

type CompanyRow = {
  id: string
  name: string
  ticker: string | null
  jurisdiction: string | null
}

type SignalRow = {
  id: string
  company_id: string
  record_type: string
  title: string
  jurisdiction: string | null
  filing_date: string | null
  score: number | null
  confidence: number | null
  companies?: CompanyRow | CompanyRow[] | null
}

const SUBSCRIBER_UNLOCKS = [
  'source URL',
  'full entity timeline',
  'watchlist alerts',
  'CSV export',
  'subscriber evidence packet',
]

function companyFromRow(row: SignalRow, companyById?: Map<string, CompanyRow>): CompanyRow | null {
  const embedded = row.companies
  if (embedded) {
    return Array.isArray(embedded) ? embedded[0] ?? null : embedded
  }
  if (companyById && row.company_id) {
    return companyById.get(row.company_id) ?? null
  }
  return null
}

function toPublicSignal(row: SignalRow, companyById?: Map<string, CompanyRow>): PublicSignal | null {
  const company = companyFromRow(row, companyById)
  if (!company?.ticker) return null

  return {
    id: row.id,
    entity_name: company.name,
    ticker: company.ticker,
    record_type: row.record_type,
    jurisdiction: row.jurisdiction || company.jurisdiction || 'multi-jurisdiction',
    filing_date: row.filing_date,
    score: Number(row.score ?? 0),
    confidence: Number(row.confidence ?? 0),
    source_name: 'Public record source',
    source_domain_hint: 'source document/...',
    free_value: 'Ticker, record type, jurisdiction, filing date, and friction score.',
    subscriber_unlocks: SUBSCRIBER_UNLOCKS,
    locked: {
      source_url: true,
      event_evidence: true,
      export_csv: true,
      watchlist_alerts: true,
    },
  }
}

const SIGNAL_SELECT = `
  id,
  company_id,
  record_type,
  title,
  jurisdiction,
  filing_date,
  score,
  confidence,
  companies!inner (
    id,
    name,
    ticker,
    jurisdiction
  )
`

async function fetchTradingSignalsEmbedded(): Promise<PublicSignal[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('signals')
    .select(SIGNAL_SELECT)
    .not('companies.ticker', 'is', null)
    .order('filing_date', { ascending: false })
    .limit(100)

  if (error) return null

  return (data as SignalRow[] | null ?? [])
    .map((row) => toPublicSignal(row))
    .filter((signal): signal is PublicSignal => signal !== null)
}

async function fetchTradingSignalsFallback(): Promise<PublicSignal[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured for this environment.')
  }

  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id,name,ticker,jurisdiction')
    .not('ticker', 'is', null)
    .limit(500)

  if (companiesError) {
    throw new Error(companiesError.message)
  }

  const tickerCompanies = (companies as CompanyRow[] | null ?? []).filter((row) => row.ticker)
  if (!tickerCompanies.length) return []

  const companyById = new Map(tickerCompanies.map((row) => [row.id, row]))
  const companyIds = tickerCompanies.map((row) => row.id)

  const { data: signals, error: signalsError } = await supabase
    .from('signals')
    .select('id,company_id,record_type,title,jurisdiction,filing_date,score,confidence')
    .in('company_id', companyIds)
    .order('filing_date', { ascending: false })
    .limit(100)

  if (signalsError) {
    throw new Error(signalsError.message)
  }

  return (signals as SignalRow[] | null ?? [])
    .map((row) => toPublicSignal(row, companyById))
    .filter((signal): signal is PublicSignal => signal !== null)
}

async function fetchTradingSignalsFromApi(): Promise<PublicSignal[]> {
  const payload = await getTradingSignals()
  return payload.signals ?? []
}

export async function fetchTradingSignals(): Promise<PublicSignal[]> {
  if (supabase) {
    const embedded = await fetchTradingSignalsEmbedded()
    if (embedded !== null) return embedded

    try {
      return await fetchTradingSignalsFallback()
    } catch {
      // Fall through to Worker API when views/RLS are not deployed yet.
    }
  }

  return fetchTradingSignalsFromApi()
}
