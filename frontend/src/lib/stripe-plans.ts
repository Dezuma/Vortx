export type PricingPlan = {
  id: 'nebula' | 'supernova' | 'galactic' | 'custom'
  name: string
  label: string
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
    name: 'Player',
    label: 'Nebula',
    price: '$9.99',
    cadence: 'per month',
    description: 'For people who want to play the news game before real-money markets open.',
    bestFor: 'Casual predictors, paper traders, and leaderboard climbers.',
    features: ['Paper trading league access', 'Personal watchlist', 'Basic market history', 'Founder badge eligibility'],
    locked: ['No embed widgets', 'No market-maker rewards', 'No API or team workspace'],
    priceEnvKey: 'STRIPE_NEBULA_PRICE_ID',
  },
  {
    id: 'supernova',
    name: 'Creator',
    label: 'Supernova',
    price: '$19.99',
    cadence: 'per month',
    description: 'For writers, streamers, and analysts who want live odds inside their content.',
    bestFor: 'Newsletter writers, market commentators, and finance creators.',
    features: ['Everything in Player', 'Embeddable live-odds widget', 'Referral tags for shared markets', 'Priority oracle alerts'],
    locked: ['No liquidity rewards', 'No private market requests', 'No API workspace'],
    priceEnvKey: 'STRIPE_SUPERNOVA_PRICE_ID',
  },
  {
    id: 'galactic',
    name: 'Market Maker',
    label: 'Galactic',
    price: '$49.99',
    cadence: 'per month',
    description: 'For power users who want to create markets, recruit flow, and earn status.',
    bestFor: 'Community builders, data traders, and early liquidity partners.',
    features: ['Everything in Creator', 'Market request priority', 'Liquidity heatmap beta', 'Fee-share/reward waitlist'],
    locked: ['No private desk onboarding', 'No white-label or enterprise support'],
    priceEnvKey: 'STRIPE_GALACTIC_PRICE_ID',
  },
  {
    id: 'custom',
    name: 'Desk',
    label: 'Custom',
    price: 'You choose',
    cadence: 'one-time or recurring',
    description: 'For teams that want Vortx odds, widgets, or oracle workflows around a specific vertical.',
    bestFor: 'Research desks, sponsors, funds, and partner pilots.',
    features: ['Private onboarding', 'Custom market pack', 'Widget/API pilot scope', 'Manual partner follow-up'],
    locked: ['Requires approval and a scoped pilot plan'],
    priceEnvKey: 'STRIPE_CUSTOM_PRICE_ID',
  },
]
