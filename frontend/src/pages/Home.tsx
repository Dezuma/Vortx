import { Link } from 'react-router-dom'
import { MarketsGrid } from '../components/MarketsGrid'
import { WaitlistStrip } from '../components/WaitlistStrip'

export function Home() {
  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Vortx</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            News → probability → markets
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            A public oracle layer for business news: Vortx turns visible events into transparent probabilities, then
            routes serious users into markets, widgets, and paid intelligence.
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
          <p className="font-semibold text-ink">Operating loop</p>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-muted">
            <li>Publish probability with a source</li>
            <li>Route readers to a market page</li>
            <li>Capture email or checkout intent</li>
            <li>Follow up through Supabase-backed systems</li>
          </ol>
        </div>
      </section>

      <WaitlistStrip />

      <MarketsGrid
        title="Featured markets"
        subtitle="Live rows stream from Supabase; demo rows appear only when env is missing."
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
