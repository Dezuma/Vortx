/**
 * Frontend catalog mirroring frontend/functions/lib/consumer-tools.js
 * Keep these strings in sync when marketing copy changes.
 */

export const CONSUMER_REPORT_PRICE = '$5'
export const SCOUT_MONTHLY_PRICE = '$20/mo'

export const SCOUT_SOFT_UPSELL = {
  headline: 'Want ongoing alerts on this company instead of a one-time check?',
  cta: `Start Scout · ${SCOUT_MONTHLY_PRICE}`,
  href: '/?view=pricing',
  plan: 'scout',
} as const

export const CONSUMER_TRUST_QUOTE = {
  quote:
    'Vortx is the first tool where I get the filing date, jurisdiction, and source trail in one place; not just a recap thread.',
  name: 'Priya K.',
  title: 'Paralegal lead',
  company: 'Regional law firm',
  segment: 'Legal ops',
} as const

export const CONSUMER_TOOLS = [
  {
    id: 'job_safety_score',
    title: 'Job Safety Score',
    navLabel: 'Job Safety Score',
    href: '/job-safety-score',
    description: 'Research public WARN / mass-layoff notices by employer name. Research only; not a consumer report or employment decision tool.',
    prompt: 'Researching layoff notices?',
    reportPrice: CONSUMER_REPORT_PRICE,
    reportLabel: 'One-time Job Safety Score report',
    cta: 'Check now',
  },
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
  },
] as const

export const HERO_COPY = {
  eyebrow: 'Public-record checks for everyday decisions',
  headline: 'Public-record research for employers, contractors, and property entities.',
  subcopy:
    'Three research tools over public filings. One-time $5 reports when you want source details. Not consumer reports and not for hiring, tenant screening, or other eligibility decisions.',
  pulseEyebrow: 'Live Pulse',
  pulseTitle: 'Signals moving now',
  pulseSocialProof: 'People are checking public records like these right now.',
  pulseHint: 'Same feed powering Job Safety Score, Contractor Check, and Landlord Check.',
} as const

export const PRICING_COPY = {
  eyebrow: 'Pricing',
  headline: 'One-time checks for $5 per report',
  subcopy:
    'Run Job Safety Score, Contractor Check, or Landlord Check without a subscription. Pay $5 only when you want the source documents and full filing details.',
  investorToggle: 'Need ongoing monitoring? For funds, firms, and teams',
  investorSubcopy:
    'Scout through Enterprise plans add watchlists, alerts, source links, and exports for teams who monitor counterparties continuously.',
} as const
