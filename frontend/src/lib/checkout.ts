import type { PricingPlan } from './stripe-plans'

type CheckoutResponse =
  | { ok: true; url: string }
  | { ok: false; error: string; message?: string }

export async function startCheckout(planId: PricingPlan['id']) {
  const res = await fetch('/api/stripe-checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plan: planId }),
  })

  const payload = (await res.json()) as CheckoutResponse
  if (!res.ok || !payload.ok) {
    throw new Error(payload.ok ? 'checkout_failed' : payload.message || payload.error)
  }

  window.location.assign(payload.url)
}
