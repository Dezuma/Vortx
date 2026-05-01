export type PricingPlan = {
  id: 'nebula' | 'supernova' | 'galactic' | 'custom'
  name: string
  price: string
  cadence: string
  description: string
  bestFor: string
  features: string[]
  locked: string[]
  priceEnvKey: string
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'nebula',
    name: 'Nebula',
    price: '$9.99',
    cadence: 'per month',
    description: 'For people who want to follow the odds without trading real money yet.',
    bestFor: 'Casual predictors and waitlist members.',
    features: ['Save a watchlist', 'Read public market pages', 'Join paper league drops'],
    locked: ['No creator widgets', 'No alert feed', 'No team/API access'],
    priceEnvKey: 'STRIPE_NEBULA_PRICE_ID',
  },
  {
    id: 'supernova',
    name: 'Supernova',
    price: '$19.99',
    cadence: 'per month',
    description: 'For analysts and creators who want odds in front of their audience.',
    bestFor: 'Newsletter writers and market commentators.',
    features: ['Everything in Nebula', 'Creator widget kit', 'Priority oracle alert beta'],
    locked: ['No partner pilot support', 'No team/API previews'],
    priceEnvKey: 'STRIPE_SUPERNOVA_PRICE_ID',
  },
  {
    id: 'galactic',
    name: 'Galactic',
    price: '$49.99',
    cadence: 'per month',
    description: 'For teams using Vortx as a signal, content, or research layer.',
    bestFor: 'Research desks, operators, and partner pilots.',
    features: ['Everything in Supernova', 'Partner pilot support', 'Early API + bot workflow previews'],
    locked: ['Custom markets and services quoted separately'],
    priceEnvKey: 'STRIPE_GALACTIC_PRICE_ID',
  },
  {
    id: 'custom',
    name: 'Prediction price',
    price: 'You choose',
    cadence: 'one-time or recurring',
    description: 'For custom markets, consulting, sponsorships, or private pilots.',
    bestFor: 'Bespoke launches and partner deals.',
    features: ['Custom amount', 'Manual onboarding', 'Private follow-up'],
    locked: ['Scoped manually before delivery'],
    priceEnvKey: 'STRIPE_CUSTOM_PRICE_ID',
  },
]
