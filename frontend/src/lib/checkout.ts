import type { PricingPlan } from './stripe-plans'

type CheckoutResponse =
  | { ok: true; url: string }
  | { ok: false; error: string; message?: string }

export async function startCheckout(
  planId: PricingPlan['id'],
  options?: { acceptableUseAccepted?: boolean },
) {
  const res = await fetch('/api/stripe-checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      plan: planId,
      acceptable_use_accepted: options?.acceptableUseAccepted ?? true,
      acceptable_use_accepted_at: new Date().toISOString(),
    }),
  })

  const payload = (await res.json()) as CheckoutResponse
  if (!res.ok || !payload.ok) {
    throw new Error(payload.ok ? 'checkout_failed' : payload.message || payload.error)
  }

  window.location.assign(payload.url)
}
