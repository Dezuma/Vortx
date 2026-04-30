import { Link, useParams } from 'react-router-dom'
import { useMarket } from '../hooks/useMarket'
import { supabase } from '../lib/supabase'
import { formatNoFromYes, formatYesCents } from '../lib/format-price'

export function MarketDetail() {
  const { slugOrId } = useParams()
  const hasDb = Boolean(supabase)
  const { data: market, isPending, isError, error, refetch } = useMarket(slugOrId)

  if (!slugOrId) {
    return <p className="text-sm text-muted">Missing market.</p>
  }

  if (isPending) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-24 rounded bg-neutral-200" />
        <div className="h-8 w-full max-w-lg rounded bg-neutral-200" />
        <div className="h-24 w-full rounded-xl bg-neutral-100" />
      </div>
    )
  }

  if (hasDb && isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p className="font-medium">Could not load market</p>
        <p className="mt-1">{error?.message}</p>
        <button
          type="button"
          className="mt-3 rounded-lg bg-red-900 px-3 py-1.5 text-xs font-semibold text-white"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    )
  }

  const m = market

  if (!m) {
    return (
      <p className="text-sm text-muted">
        Market not found.{' '}
        <Link to="/markets" className="font-medium text-accent no-underline hover:underline">
          All markets
        </Link>
      </p>
    )
  }

  const yes = m.yes_price
  const yesPct = yes != null ? Math.round(Number(yes) * 100) : 50

  return (
    <article className="space-y-8">
      <Link
        to="/markets"
        className="inline-block text-xs font-semibold uppercase tracking-wide text-muted no-underline hover:text-ink"
      >
        ← Markets
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium uppercase text-muted">
            {m.outcome ?? 'open'}
          </span>
          {!hasDb ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">Demo</span>
          ) : null}
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">{m.title}</h1>
        {m.description ? <p className="max-w-2xl text-muted">{m.description}</p> : null}
      </header>

      <div className="rounded-2xl border border-line bg-surface-elevated p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Implied probability</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
            <span className="text-emerald-600">{formatYesCents(yes)}</span>
            <span className="mx-2 text-muted">/</span>
            <span className="text-red-600">{formatNoFromYes(yes)}</span>
          </div>
          <Link
            to="/widget"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white no-underline hover:bg-neutral-800"
          >
            Share embed
          </Link>
        </div>
        <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-neutral-100">
          <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${yesPct}%` }} />
          <div className="min-w-0 flex-1 bg-red-400/90" />
        </div>
        <div className="mt-2 flex justify-between text-xs font-mono tabular-nums text-muted">
          <span>YES {yesPct}%</span>
          <span>NO {100 - yesPct}%</span>
        </div>
      </div>

      <section className="rounded-xl border border-dashed border-line bg-surface p-4 text-sm text-muted">
        <strong className="text-ink">Oracle CTA:</strong>{' '}
        <span className="italic">
          Probability from Vortx — trade this outcome:{' '}
          {typeof window !== 'undefined' ? `${window.location.origin}/m/${m.slug ?? m.id}` : ''}
        </span>
      </section>
    </article>
  )
}
