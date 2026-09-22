import { useQuery } from '@tanstack/react-query'
import { getEntitlements } from '../api'
import { startCheckout } from '../lib/checkout'
import { CONSUMER_TRUST_QUOTE, PRICING_COPY } from '../lib/consumer-tools'
import { ConsumerToolCards } from './ConsumerToolCards'
import { useState } from 'react'

export function PricingTiers({
  onCheckout,
}: {
  onCheckout?: (plan: string) => void | Promise<void>
}) {
  const entitlements = useQuery({ queryKey: ['entitlements'], queryFn: getEntitlements })
  const plans = entitlements.data?.entitlements ?? []

  return (
    <div className="vortx-pricing-grid mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      {plans.map((plan) => (
        <article key={plan.plan} className="glass-panel rounded-2xl p-5">
          <h3 className="display-font text-2xl text-ink">{plan.label}</h3>
          <p className="data-font mt-2 text-2xl text-terminal-blue">{plan.monthly_price}</p>
          <p className="mt-3 text-sm text-muted">Watchlists: {plan.watchlist_limit ?? 'custom'}</p>
          <p className="text-sm text-muted">Alerts: {plan.alert_limit ?? 'custom'}</p>
          <button
            type="button"
            onClick={() => {
              if (onCheckout) void onCheckout(plan.plan)
              else void startCheckout(plan.plan)
            }}
            className="terminal-button-solid mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Start checkout
          </button>
        </article>
      ))}
    </div>
  )
}

export function ConsumerPricingSection() {
  const [investorOpen, setInvestorOpen] = useState(false)

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-10">
      <p className="eyebrow">{PRICING_COPY.eyebrow}</p>
      <h2 className="display-font mt-3 text-5xl text-ink">{PRICING_COPY.headline}</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted">{PRICING_COPY.subcopy}</p>

      <div className="mt-8">
        <ConsumerToolCards variant="pricing" />
      </div>

      <blockquote className="glass-panel mt-8 max-w-3xl rounded-2xl p-5">
        <p className="text-sm leading-7 text-ink">&ldquo;{CONSUMER_TRUST_QUOTE.quote}&rdquo;</p>
        <footer className="mt-3 text-xs text-muted">
          {CONSUMER_TRUST_QUOTE.name}, {CONSUMER_TRUST_QUOTE.title}, {CONSUMER_TRUST_QUOTE.company}
        </footer>
      </blockquote>

      <details
        className="glass-panel mt-10 rounded-2xl p-5"
        open={investorOpen}
        onToggle={(event) => setInvestorOpen((event.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer list-none">
          <p className="eyebrow">For funds, firms, and teams</p>
          <h3 className="display-font mt-2 text-3xl text-ink">{PRICING_COPY.investorToggle}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{PRICING_COPY.investorSubcopy}</p>
        </summary>
        <div className="mt-6">
          <PricingTiers />
        </div>
      </details>
    </section>
  )
}
