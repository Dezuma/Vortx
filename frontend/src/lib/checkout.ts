import type { PricingPlan } from './stripe-plans'
import { supabase } from './supabase'

type CheckoutResponse =
  | { ok: true; url: string }
  | { ok: false; error: string; message?: string }

export async function startCheckout(
  planId: PricingPlan['id'],
  options?: { acceptableUseAccepted?: boolean },
) {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (session?.access_token) headers.authorization = `Bearer ${session.access_token}`

  const res = await fetch('/api/stripe-checkout', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      plan: planId,
      ...(session?.user?.email ? { owner_email: session.user.email } : {}),
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
