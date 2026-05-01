import { PricingPlans } from '../components/PricingPlans'

export function Pricing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Pricing</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Vortx is not priced like generic software. Each tier buys a clearer seat in the prediction-market flywheel:
          play the news game, publish odds to an audience, help seed liquidity, or build a private partner workflow.
        </p>
      </div>
      <PricingPlans />
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Plain English:</strong> public markets stay readable. Paid plans decide what you can do next: compete,
        embed, request markets, or work directly with the Vortx team.
      </section>
    </div>
  )
}
