/**
 * Shared consumer-tool catalog for homepage hero, pricing, and result upsells.
 * Worker SSR pages and React marketing surfaces should pull from here.
 */

import {
  AUDIENCE_SEGMENTS,
  DISCLAIMER_ONE_LINER,
  HERO_COPY as POSITIONED_HERO,
  PRICING_COPY as POSITIONED_PRICING,
} from './product-positioning.js'

export const CONSUMER_REPORT_PRICE = '$5'
export const SCOUT_MONTHLY_PRICE = '$20/mo'

export const SCOUT_SOFT_UPSELL = {
  headline: 'Want ongoing alerts on this filer instead of a one-time check?',
  subcopy: 'Scout monitors one watchlist with weekly refresh and email alerts when new Form 4, STOCK Act, or 13F filings hit.',
  cta: `Start Scout · ${SCOUT_MONTHLY_PRICE}`,
  href: '/?view=pricing&plan=scout',
  plan: 'scout',
}

export const CONSUMER_TRUST_QUOTE = {
  quote: 'I knew a member of Congress had traded before it hit the news.',
  name: 'Sam K.',
  title: 'Retail trader',
  company: 'Options desk',
  segment: 'Retail trader',
}

export const RESEARCHER_TRUST_QUOTE = {
  quote:
    'Vortx is the first place I see congressional and insider filings with the date and source trail in one screen, not just a screenshot thread.',
  name: 'Alex R.',
  title: 'Independent researcher',
  company: 'Equities desk',
  segment: 'Research',
}

/** Primary a-la-carte product: WARN / layoff search ($5). */
export const LAYOFF_SEARCH_TOOL = {
  id: 'layoff_search',
  title: 'Layoff Search',
  navLabel: 'Layoff Search',
  href: '/layoff-search',
  description: 'Search public WARN / mass-layoff notices by employer. $5 per search unlocks dates, locations, headcount, and source links. Research only; not a consumer report or employment decision tool.',
  prompt: 'Need a WARN check?',
  reportPrice: CONSUMER_REPORT_PRICE,
  reportLabel: 'One-time Layoff Search report',
  cta: 'Search layoffs',
  unlockPlan: 'job_safety_unlock',
  caseRecordTypes: ['warn_notice', 'warn', 'layoff', 'workforce'],
  caseCta: 'Run Layoff Search on this employer',
}

export const CONSUMER_TOOLS = [
  LAYOFF_SEARCH_TOOL,
  {
    id: 'contractor_check',
    title: 'Contractor Check',
    navLabel: 'Contractor Check',
    href: '/contractor-check',
    description: 'Research public liens, lawsuits, and bankruptcy filings tied to a contractor or business name. Research only; not a consumer report or hiring tool.',
    prompt: 'Researching a contractor?',
    reportPrice: CONSUMER_REPORT_PRICE,
    reportLabel: 'One-time Contractor Check report',
    cta: 'Check now',
    unlockPlan: 'contractor_unlock',
    caseRecordTypes: ['mechanics_lien', 'lien', 'lawsuit', 'civil_docket', 'construction'],
    caseCta: 'Run a Contractor Check on this business',
  },
  {
    id: 'landlord_check',
    title: 'Landlord Check',
    navLabel: 'Landlord Check',
    href: '/landlord-check',
    description: 'Research public liens, judgments, and distress filings tied to a landlord or property entity. Research only; not a consumer report or tenant-screening tool.',
    prompt: 'Researching a landlord?',
    reportPrice: CONSUMER_REPORT_PRICE,
    reportLabel: 'One-time Landlord Check report',
    cta: 'Check now',
    unlockPlan: 'landlord_unlock',
    caseRecordTypes: ['foreclosure', 'eviction', 'property', 'landlord', 'judgment', 'receivership'],
    caseCta: 'Run a Landlord Check on this property owner',
  },
]

export const INVESTOR_MONITORING_TIERS = [
  { id: 'scout', name: 'Scout', price: '$20/mo', band: 'b2c' },
  { id: 'sentinel', name: 'Sentinel', price: '$50/mo', band: 'b2c' },
  { id: 'nebula', name: 'Nebula', price: '$150/mo', band: 'b2c' },
  { id: 'pulsar', name: 'Operator', price: '$450/mo', band: 'b2b' },
  { id: 'supernova', name: 'Professional', price: '$1,500/mo', band: 'b2b' },
  { id: 'galactic', name: 'Enterprise', price: '$5,000/mo', band: 'b2b' },
]

export const HERO_COPY = POSITIONED_HERO
export const PRICING_COPY = POSITIONED_PRICING
export const AUDIENCE = AUDIENCE_SEGMENTS
export const SITE_DISCLAIMER = DISCLAIMER_ONE_LINER

/**
 * Pick the best consumer tool CTA for a case-file record type.
 * @param {string} recordType
 */
export function consumerToolForRecordType(recordType) {
  const key = String(recordType || '')
    .toLowerCase()
    .replaceAll('-', '_')
  for (const tool of CONSUMER_TOOLS) {
    if (tool.caseRecordTypes.some((token) => key.includes(token))) return tool
  }
  if (/warn|layoff|workforce|employment/i.test(key)) return CONSUMER_TOOLS[0]
  if (/lien|contractor|mechanics|lawsuit|bankruptcy/i.test(key)) return CONSUMER_TOOLS[1]
  if (/landlord|property|foreclosure|eviction|judgment|receivership/i.test(key)) return CONSUMER_TOOLS[2]
  return CONSUMER_TOOLS[0]
}

export function scoutUpsellHtml({ className = 'scout-upsell' } = {}) {
  return `<aside class="${className}">
  <p><strong>${SCOUT_SOFT_UPSELL.headline}</strong></p>
  <a href="${SCOUT_SOFT_UPSELL.href}">${SCOUT_SOFT_UPSELL.cta}</a>
</aside>`
}
