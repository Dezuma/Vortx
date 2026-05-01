type PlanEnvKey =
  | 'VITE_STRIPE_NEBULA_PAYMENT_LINK_URL'
  | 'VITE_STRIPE_SUPERNOVA_PAYMENT_LINK_URL'
  | 'VITE_STRIPE_GALACTIC_PAYMENT_LINK_URL'
  | 'VITE_STRIPE_CUSTOM_PAYMENT_LINK_URL'

export type PricingPlan = {
  id: 'nebula' | 'supernova' | 'galactic' | 'custom'
  name: string
  price: string
  cadence: string
  description: string
  bestFor: string
  features: string[]
  envKey: PlanEnvKey
  paymentLink: string | null
}

function cleanPaymentLink(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
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
    envKey: 'VITE_STRIPE_NEBULA_PAYMENT_LINK_URL',
    paymentLink: cleanPaymentLink(import.meta.env.VITE_STRIPE_NEBULA_PAYMENT_LINK_URL),
  },
  {
    id: 'supernova',
    name: 'Supernova',
    price: '$19.99',
    cadence: 'per month',
    description: 'Pro tier for active analysts who want faster market discovery.',
    bestFor: 'Analysts, finance creators, and newsletter operators.',
    features: ['Everything in Nebula', 'Pro widget positioning', 'Priority beta access to oracle alerts'],
    envKey: 'VITE_STRIPE_SUPERNOVA_PAYMENT_LINK_URL',
    paymentLink: cleanPaymentLink(import.meta.env.VITE_STRIPE_SUPERNOVA_PAYMENT_LINK_URL),
  },
  {
    id: 'galactic',
    name: 'Galactic',
    price: '$49.99',
    cadence: 'per month',
    description: 'Enterprise-style early access for teams testing Vortx workflows.',
    bestFor: 'Small teams, research desks, and partner pilots.',
    features: ['Everything in Supernova', 'Partner pilot support', 'Early API / bot workflow previews'],
    envKey: 'VITE_STRIPE_GALACTIC_PAYMENT_LINK_URL',
    paymentLink: cleanPaymentLink(import.meta.env.VITE_STRIPE_GALACTIC_PAYMENT_LINK_URL),
  },
  {
    id: 'custom',
    name: 'Prediction price',
    price: 'You choose',
    cadence: 'one-time or recurring',
    description: 'Flexible payment link for pilots, deposits, or custom consulting packages.',
    bestFor: 'Custom onboarding and manual deals.',
    features: ['Customer chooses amount', 'Use for pilots or deposits', 'Manual follow-up from the funnel'],
    envKey: 'VITE_STRIPE_CUSTOM_PAYMENT_LINK_URL',
    paymentLink: cleanPaymentLink(import.meta.env.VITE_STRIPE_CUSTOM_PAYMENT_LINK_URL),
  },
]

export const hasAnyStripePaymentLink = pricingPlans.some((plan) => Boolean(plan.paymentLink))
