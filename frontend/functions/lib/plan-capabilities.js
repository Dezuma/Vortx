/** Tier capabilities aligned with pricing cards and export/API gates. */
const TIER_CAPABILITIES = {
  scout: {
    liveFeed: true,
    fullEntityNames: false,
    namesOnAlert: true,
    signalTypeAndState: false,
    sourceUrls: false,
    csvExport: false,
    apiAccess: false,
  },
  sentinel: {
    liveFeed: true,
    fullEntityNames: false,
    namesOnAlert: false,
    signalTypeAndState: true,
    sourceUrls: false,
    csvExport: false,
    apiAccess: false,
  },
  nebula: {
    liveFeed: true,
    fullEntityNames: true,
    namesOnAlert: true,
    signalTypeAndState: true,
    sourceUrls: true,
    csvExport: false,
    apiAccess: false,
  },
  pulsar: {
    liveFeed: true,
    fullEntityNames: true,
    namesOnAlert: true,
    signalTypeAndState: true,
    sourceUrls: true,
    csvExport: true,
    apiAccess: false,
  },
  supernova: {
    liveFeed: true,
    fullEntityNames: true,
    namesOnAlert: true,
    signalTypeAndState: true,
    sourceUrls: true,
    csvExport: true,
    apiAccess: true,
  },
  galactic: {
    liveFeed: true,
    fullEntityNames: true,
    namesOnAlert: true,
    signalTypeAndState: true,
    sourceUrls: true,
    csvExport: true,
    apiAccess: true,
    mapBulkExport: true,
    unlimitedWatchlists: true,
  },
  custom: {
    liveFeed: true,
    fullEntityNames: true,
    namesOnAlert: true,
    signalTypeAndState: true,
    sourceUrls: true,
    csvExport: true,
    apiAccess: true,
    customSla: true,
  },
}

const ADMIN_CAPABILITIES = {
  liveFeed: true,
  fullEntityNames: true,
  namesOnAlert: true,
  signalTypeAndState: true,
  sourceUrls: true,
  csvExport: true,
  apiAccess: true,
  mapBulkExport: true,
  unlimitedWatchlists: true,
  customSla: true,
}

export function planCapabilities(plan, role = 'customer') {
  if (role === 'admin') return { ...ADMIN_CAPABILITIES }
  return { ...(TIER_CAPABILITIES[String(plan || '').trim()] || TIER_CAPABILITIES.scout) }
}

export function capabilityLocks(capabilities) {
  const caps = capabilities || TIER_CAPABILITIES.scout
  return {
    entity_names: !caps.fullEntityNames,
    source_url: !caps.sourceUrls,
    csv_export: !caps.csvExport,
    api_access: !caps.apiAccess,
  }
}

export function pricingFeatureIncluded(plan, feature) {
  const p = String(plan || '').trim()
  if (p === 'galactic' || p === 'custom') return true
  const caps = TIER_CAPABILITIES[p] || TIER_CAPABILITIES.scout
  switch (feature) {
    case 'live_feed':
      return caps.liveFeed
    case 'names_on_alert':
      return caps.namesOnAlert
    case 'signal_meta':
      return caps.signalTypeAndState
    case 'full_names':
      return caps.fullEntityNames
    case 'source_urls':
      return caps.sourceUrls
    case 'csv_export':
      return caps.csvExport
    case 'api_access':
      return caps.apiAccess
    case 'map_bulk_export':
      return Boolean(caps.mapBulkExport)
    case 'unlimited':
      return Boolean(caps.unlimitedWatchlists)
    case 'custom_sla':
      return Boolean(caps.customSla)
    default:
      return false
  }
}
