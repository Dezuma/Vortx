export const SCOUT_ENTITLEMENT = {
  plan: 'scout',
  label: 'Scout',
  monthly_price: '$20/month',
  watchlist_limit: 1,
  alert_limit: 2,
}

export const SENTINEL_ENTITLEMENT = {
  plan: 'sentinel',
  label: 'Sentinel',
  monthly_price: '$50/month',
  watchlist_limit: 3,
  alert_limit: 5,
}

export const NEBULA_ENTITLEMENT = {
  plan: 'nebula',
  label: 'Nebula',
  monthly_price: '$150/month',
  watchlist_limit: 5,
  alert_limit: 10,
}

export const PULSAR_ENTITLEMENT = {
  plan: 'pulsar',
  label: 'Operator',
  monthly_price: '$450/month',
  watchlist_limit: 12,
  alert_limit: 40,
}

export const SUPERNOVA_ENTITLEMENT = {
  plan: 'supernova',
  label: 'Professional',
  monthly_price: '$1500/month',
  watchlist_limit: 25,
  alert_limit: 100,
}

export const GALACTIC_ENTITLEMENT = {
  plan: 'galactic',
  label: 'Enterprise',
  monthly_price: '$5000/month',
  watchlist_limit: 100,
  alert_limit: 1000,
}

export const PLAN_ENTITLEMENT_OVERRIDES = {
  scout: SCOUT_ENTITLEMENT,
  sentinel: SENTINEL_ENTITLEMENT,
  nebula: NEBULA_ENTITLEMENT,
  pulsar: PULSAR_ENTITLEMENT,
  supernova: SUPERNOVA_ENTITLEMENT,
  galactic: GALACTIC_ENTITLEMENT,
}

export const OVERRIDE_PLAN_IDS = new Set(Object.keys(PLAN_ENTITLEMENT_OVERRIDES))

export const PLAN_ORDER = ['scout', 'sentinel', 'nebula', 'pulsar', 'supernova', 'galactic', 'custom']

export function entitlementForPlan(plan) {
  return PLAN_ENTITLEMENT_OVERRIDES[String(plan || '').trim()] || null
}

export function mergeEntitlementRows(rows) {
  const overridePlans = Object.values(PLAN_ENTITLEMENT_OVERRIDES)
  const merged = [
    ...(rows || []).filter((row) => !OVERRIDE_PLAN_IDS.has(row.plan)),
    ...overridePlans,
  ]
  const order = new Map(PLAN_ORDER.map((plan, index) => [plan, index]))
  merged.sort((a, b) => (order.get(a.plan) ?? 99) - (order.get(b.plan) ?? 99))
  return merged
}
