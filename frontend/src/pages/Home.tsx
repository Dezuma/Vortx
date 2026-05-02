import { Link } from 'react-router-dom'
import { MarketsGrid } from '../components/MarketsGrid'
import { WaitlistStrip } from '../components/WaitlistStrip'

export function Home() {
  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Truth-as-a-Service</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            Bet your brain on tomorrow’s headlines.
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Vortx turns messy news into one simple question: <strong className="font-medium text-ink">yes or no?</strong>{' '}
            Follow the crowd price, compete in paper markets, and graduate into paid tools for creators, market makers,
            and teams.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/markets"
              className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white no-underline hover:bg-neutral-800"
            >
              Browse markets
            </Link>
            <Link
              to="/widget"
              className="inline-flex items-center justify-center rounded-full border border-line bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-ink no-underline hover:border-neutral-400"
            >
              Newsletter embed
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-line bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-ink no-underline hover:border-neutral-400"
            >
              Pricing
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface-elevated p-5 text-sm">
          <p className="font-semibold text-ink">How it works</p>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-muted">
            <li>News becomes a yes/no market</li>
            <li>The YES price shows the crowd’s chance</li>
            <li>You decide if the crowd is wrong</li>
            <li>Your accuracy builds status before real trading opens</li>
          </ol>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Oracle Bot', 'Posts probability, not opinion, with a link back to the market.'],
          ['Vortx Bubble', 'Embeds live odds where people already read news and tickers.'],
          ['Liquidity Heatmap', 'Shows where early users can help markets become useful.'],
          ['Prestige League', 'Ranks paper traders so winners earn status before money goes live.'],
        ].map(([title, body]) => (
          <article key={title} className="rounded-xl border border-line bg-surface-elevated p-4">
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </article>
        ))}
      </section>

      <WaitlistStrip />

      <MarketsGrid
        title="Featured markets"
        subtitle="Live rows stream from Supabase and update when the backend changes."
      />

      <section className="rounded-xl border border-dashed border-line bg-accent-soft/50 p-5 text-sm text-muted">
        <strong className="text-ink">Bot CTA:</strong>{' '}
        <span className="italic">
          Probability from Vortx — trade this outcome:{' '}
          {typeof window !== 'undefined' ? `${window.location.origin}/m/fed-cut-q3` : ''}
        </span>
        <Link to="/bots" className="mt-3 block font-semibold text-accent no-underline hover:underline">
          Test the dry-run bot endpoint →
        </Link>
      </section>
    </div>
  )
}
