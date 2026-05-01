import { pricingPlans } from '../lib/stripe-plans'

export function PricingPlans() {
  return (
    <section className="rounded-xl border border-line bg-surface-elevated p-5 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Stripe checkout</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Memberships and pilots</h2>
        </div>
        <p className="max-w-sm text-sm text-muted">
          Uses Stripe Payment Links only. No Stripe secret key is exposed in the frontend or repo.
        </p>
      </div>

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
            {plan.paymentLink ? (
              <a
                href={plan.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-neutral-800"
              >
                Checkout
              </a>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted">
                Set <code className="font-mono">{plan.envKey}</code> in Cloudflare Pages.
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
