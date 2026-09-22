export type FrictionEntity = {
  id: string
  canonical_name: string
  entity_type: string
  ticker: string | null
  jurisdiction: string | null
  registered_agent: string | null
  primary_address: string | null
  latest_score: number
  confidence: number
  trend: 'up' | 'down' | 'flat'
  reasons: Array<{ label: string; weight: number }>
  vulnerability_score?: number
  vulnerability_label?: string
}

export type LegalEvent = {
  id: string
  entity_id: string
  event_type: string
  title: string
  summary: string
  jurisdiction: string
  filing_date: string
  amount: number | null
  severity: number
  confidence: number
  source_url?: string
}

export type SourceRecord = {
  slug: string
  name: string
  jurisdiction: string
  record_type: string
  access_method: string
  terms_status: string
  refresh_cadence: string
  source_url: string | null
  enabled: boolean
}

export type Entitlement = {
  plan: string
  label: string
  monthly_price: string
  watchlist_limit: number | null
  alert_limit: number | null
}

export type AppProfile = {
  user_id: string
  email: string
  role: string
  plan: string
  subscription_status: string
}

export type PublicSignal = {
  id: string
  entity_name: string
  ticker: string | null
  record_type: string
  jurisdiction: string
  filing_date: string | null
  score: number
  confidence: number
  source_name: string
  source_domain_hint: string
  free_value: string
  subscriber_unlocks: string[]
  locked: {
    source_url: boolean
    event_evidence: boolean
    export_csv: boolean
    watchlist_alerts: boolean
  }
}

export type ScanMode = 'holdings' | 'competitors'

export type ScanEntityMatch = {
  entity_id: string
  name: string
  jurisdiction: string | null
  ticker: string | null
  confidence: number
}

export type ScanMatchResult = {
  input: string
  matches: ScanEntityMatch[]
}

export type ScanEventDetail = {
  id: string
  event_type?: string
  record_type: string
  title?: string
  summary?: string | null
  jurisdiction: string | null
  filing_date: string | null
  severity?: number
  confidence?: number
  source_name?: string | null
  source_url?: string | null
  locked: boolean
}

export type ScanAdjacentSignals = {
  count: number
  scope_label: string
  window_label: string
  message: string
}

export type ScanEntityResult = {
  entity_id: string
  name: string
  jurisdiction: string | null
  ticker: string | null
  score: number
  event_count_90d: number
  events_by_type: Record<string, number>
  headline: string
  no_signals_message?: string
  adjacent_signals?: ScanAdjacentSignals | null
  top_event: ScanEventDetail | null
  additional_events: ScanEventDetail[]
  additional_locked_count: number
  locked_summary?: string | null
  teaser_unlocked: boolean
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json()) as T & { message?: string; error?: string }
  if (!response.ok) throw new Error(payload.message || payload.error || `Request failed: ${response.status}`)
  return payload
}

export function postScanMatch(names: string[], mode: ScanMode) {
  return postJson<{ ok: true; results: ScanMatchResult[]; max_names: number }>('/api/scan/match', { names, mode })
}

export function postScanResults(entityIds: string[]) {
  return postJson<{ ok: true; entities: ScanEntityResult[]; disclaimer: string }>('/api/scan/results', {
    entity_ids: entityIds,
  })
}

export function postScanUnlock(email: string, entityIds: string[], mode: ScanMode) {
  return postJson<{ ok: true; entities: ScanEntityResult[]; email_notice: string }>('/api/scan/unlock', {
    email,
    entity_ids: entityIds,
    mode,
  })
}

async function getJson<T>(url: string, token?: string): Promise<T> {
  const response = await fetch(url, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  })
  const payload = (await response.json()) as T & { message?: string; error?: string }
  if (!response.ok) throw new Error(payload.message || payload.error || `Request failed: ${response.status}`)
  return payload
}

async function authedJson<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })
  const payload = (await response.json()) as T & { message?: string; error?: string }
  if (!response.ok) throw new Error(payload.message || payload.error || `Request failed: ${response.status}`)
  return payload
}

export function getFrictionFeed(token?: string) {
  return getJson<{ ok: true; source: string; entities: FrictionEntity[]; events: LegalEvent[] }>(
    '/api/friction-feed',
    token,
  )
}

export function getPublicSignals() {
  return getJson<{ ok: true; source: string; signals: PublicSignal[]; count: number; disclaimer: string }>(
    '/api/public-signals',
  )
}

export function getTradingSignals() {
  return getJson<{ ok: true; source: string; signals: PublicSignal[]; count: number; disclaimer: string }>(
    '/api/trading-signals',
  )
}

export function getSourceTransparency() {
  return getJson<{ ok: true; source: string; sources: SourceRecord[] }>('/api/source-transparency')
}

export function getEntitlements() {
  return getJson<{ ok: true; entitlements: Entitlement[] }>('/api/entitlements')
}

export function getMe(token: string) {
  return authedJson<{ ok: true; user: { id: string; email: string }; profile: AppProfile | null }>('/api/me', token)
}

export function getCustomerDashboard(token: string) {
  return authedJson<{
    ok: true
    profile: AppProfile
    entitlement: Entitlement | null
    watchlists: unknown[]
    live_feed: Array<Record<string, unknown>>
    capabilities: Record<string, boolean>
    locks: Record<string, boolean>
    visit_summary: {
      headline: string | null
      new_since_visit: number
      urgent_since_visit: number
      quiet: boolean
    }
    since_subscribed: {
      label: string
      value: number
      copy: string
    }
    desk_state: {
      show_onboarding_expanded: boolean
      is_returning: boolean
    }
    service_summary: Record<string, number>
  }>('/api/customer/dashboard', token)
}

export function getAdminDashboard(token: string) {
  return authedJson<{ ok: true }>('/api/admin/dashboard', token)
}

export function patchAdminSource(token: string, body: Record<string, unknown>) {
  return authedJson('/api/admin/sources', token, { method: 'PATCH', body: JSON.stringify(body) })
}

export function postCustomerServiceRequest(token: string, body: Record<string, unknown>) {
  return authedJson('/api/customer/service-requests', token, { method: 'POST', body: JSON.stringify(body) })
}

export function patchAdminServiceRequest(token: string, body: Record<string, unknown>) {
  return authedJson('/api/admin/service-requests', token, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function requestAccess(body: Record<string, unknown>) {
  const response = await fetch('/api/request-access', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json()) as { ok: boolean; message?: string; error?: string }
  if (!response.ok || !payload.ok) throw new Error(payload.message || payload.error || 'Request failed.')
  return payload
}
