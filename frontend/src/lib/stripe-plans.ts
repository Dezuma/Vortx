export type PricingPlan = {
  id: 'nebula' | 'supernova' | 'galactic' | 'custom'
  name: string
  price: string
  cadence: string
  description: string
  bestFor: string
  features: string[]
  priceEnvKey: string
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'nebula',
    name: 'Nebula',
    price: '$9.99',
    cadence: 'per month',
    description: 'Starter access for early users and paper-trading spectators.',
    bestFor: 'Follow markets, widgets, and public oracle posts.',
    features: ['Watchlist-ready market UI', 'Newsletter widget previews', 'Public oracle feed access'],
    priceEnvKey: 'STRIPE_NEBULA_PRICE_ID',
  },
  {
    id: 'supernova',
    name: 'Supernova',
    price: '$19.99',
    cadence: 'per month',
    description: 'Pro tier for active analysts who want faster market discovery.',
    bestFor: 'Analysts, finance creators, and newsletter operators.',
    features: ['Everything in Nebula', 'Pro widget positioning', 'Priority beta access to oracle alerts'],
    priceEnvKey: 'STRIPE_SUPERNOVA_PRICE_ID',
  },
  {
    id: 'galactic',
    name: 'Galactic',
    price: '$49.99',
    cadence: 'per month',
    description: 'Enterprise-style early access for teams testing Vortx workflows.',
    bestFor: 'Small teams, research desks, and partner pilots.',
    features: ['Everything in Supernova', 'Partner pilot support', 'Early API / bot workflow previews'],
    priceEnvKey: 'STRIPE_GALACTIC_PRICE_ID',
  },
  {
    id: 'custom',
    name: 'Prediction price',
    price: 'You choose',
    cadence: 'one-time or recurring',
    description: 'Flexible payment link for pilots, deposits, or custom consulting packages.',
    bestFor: 'Custom onboarding and manual deals.',
    features: ['Customer chooses amount', 'Use for pilots or deposits', 'Manual follow-up from the funnel'],
    priceEnvKey: 'STRIPE_CUSTOM_PRICE_ID',
  },
]
