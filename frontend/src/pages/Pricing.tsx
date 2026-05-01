import { PricingPlans } from '../components/PricingPlans'

export function Pricing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Pricing</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Connect each card to its Stripe Payment Link in Cloudflare Pages env vars. This keeps checkout working
          without shipping Stripe secret keys or writing backend checkout code before you need it.
        </p>
      </div>
      <PricingPlans />
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Production check:</strong> use Stripe test mode links first, click each checkout, verify success/cancel
        behavior in Stripe, then swap to live Payment Links in Cloudflare Pages env vars.
      </section>
    </div>
  )
}
