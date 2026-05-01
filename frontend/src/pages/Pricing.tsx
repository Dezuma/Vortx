import { PricingPlans } from '../components/PricingPlans'

export function Pricing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Pricing</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Stripe Checkout Sessions are created by the Cloudflare Worker. Price IDs are configured as Worker vars and the
          Stripe secret key stays server-only.
        </p>
      </div>
      <PricingPlans />
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Production check:</strong> test with Stripe test-mode price IDs and secret first, verify success/cancel
        behavior, then switch Cloudflare secrets to live Stripe credentials.
      </section>
    </div>
  )
}
