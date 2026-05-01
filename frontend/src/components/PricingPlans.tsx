import { useState } from 'react'
import { startCheckout } from '../lib/checkout'
import { pricingPlans } from '../lib/stripe-plans'

export function PricingPlans() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onCheckout(planId: (typeof pricingPlans)[number]['id']) {
    setError(null)
    setLoadingPlan(planId)
    try {
      await startCheckout(planId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start checkout')
      setLoadingPlan(null)
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface-elevated p-5 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Stripe checkout</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Memberships and pilots</h2>
        </div>
        <p className="max-w-sm text-sm text-muted">
          Checkout starts on the Worker, redirects to Stripe, then returns users to Vortx.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {pricingPlans.map((plan) => (
          <article key={plan.id} className="flex flex-col rounded-xl border border-line bg-surface p-4">
            <div>
              <h3 className="font-semibold text-ink">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>
              <p className="mt-4 font-mono text-2xl font-semibold tabular-nums">
                {plan.price}
                <span className="ml-1 text-xs font-normal text-muted">{plan.cadence}</span>
              </p>
              <p className="mt-3 text-xs font-medium text-muted">{plan.bestFor}</p>
            </div>
            <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-muted">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void onCheckout(plan.id)}
              disabled={loadingPlan === plan.id}
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60"
            >
              {loadingPlan === plan.id ? 'Starting…' : 'Checkout'}
            </button>
            <p className="mt-2 text-[11px] text-muted">
              Requires <code className="font-mono">{plan.priceEnvKey}</code> in Cloudflare.
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
