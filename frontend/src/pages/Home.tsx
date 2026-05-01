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
            Pick yes or no on tomorrow’s business headlines.
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Vortx turns major news questions into simple odds. If you think the chance is wrong, you follow the market,
            share it, or join the paper league before real-money trading is ready.
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
            <li>Read the question</li>
            <li>See the YES and NO prices</li>
            <li>Decide if the crowd is too high or too low</li>
            <li>Save your spot for paid access and league drops</li>
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
