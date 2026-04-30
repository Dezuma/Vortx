import type { Market } from '../types/market'

/** Shown when Supabase is not configured so the UI is never an empty shell. */
export const DEMO_MARKETS: Market[] = [
  {
    id: 'demo-fed-cut',
    slug: 'fed-cut-q3',
    title: 'Fed cuts ≥25bp before Oct 1?',
    description: 'Illustrative macro contract — wire the oracle to FOMC statements + futures.',
    yes_price: 0.42,
    outcome: 'open',
  },
  {
    id: 'demo-ma',
    slug: 'mega-cap-ma',
    title: 'Top-5 tech M&A rumor confirmed by two tier-1 wires?',
    description: 'Resolution uses timestamped headlines you already ingest.',
    yes_price: 0.18,
    outcome: 'open',
  },
  {
    id: 'demo-iphone',
    slug: 'iphone-button',
    title: 'Next iPhone ships with a physical Action button variant?',
    description: 'Observable product SKU / keynote criteria.',
    yes_price: 0.67,
    outcome: 'open',
  },
]
