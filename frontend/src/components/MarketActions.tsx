import { Link } from 'react-router-dom'
import { useMarketActions } from '../hooks/useMarketActions'

type Props = {
  marketId: string
  marketTitle: string
  yesPct: number
}

export function MarketActions({ marketId, marketTitle, yesPct }: Props) {
  const { user, isAuthLoading, watchlist, prediction, toggleWatchlist, submitPrediction } = useMarketActions(marketId)
  const hasPick = Boolean(prediction.data)

  if (isAuthLoading) {
    return <p className="text-sm text-muted">Checking account…</p>
  }

  if (!user) {
    return (
      <section className="rounded-xl border border-line bg-surface-elevated p-5 text-sm">
        <h2 className="font-semibold text-ink">Make it yours</h2>
        <p className="mt-2 text-muted">
          Sign in to save this market and record a paper YES/NO pick. Your picks become the start of your Vortx track
          record.
        </p>
        <Link
          to="/auth"
          className="mt-4 inline-flex rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-neutral-800"
        >
          Sign in / sign up
        </Link>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-line bg-surface-elevated p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-ink">Your action</h2>
          <p className="mt-1 text-sm text-muted">
            Save the question or lock a paper pick. This is play-money signal, not real-money trading.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggleWatchlist.mutate()}
          disabled={toggleWatchlist.isPending || watchlist.isPending}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60"
        >
          {watchlist.data ? 'Remove from watchlist' : 'Save to watchlist'}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => submitPrediction.mutate({ side: 'yes', probability: yesPct / 100 })}
          disabled={submitPrediction.isPending}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
        >
          <span className="block text-sm font-semibold text-emerald-900">My paper pick: YES</span>
          <span className="mt-1 block text-xs text-emerald-800">I think “{marketTitle}” is likely.</span>
        </button>
        <button
          type="button"
          onClick={() => submitPrediction.mutate({ side: 'no', probability: (100 - yesPct) / 100 })}
          disabled={submitPrediction.isPending}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
        >
          <span className="block text-sm font-semibold text-red-900">My paper pick: NO</span>
          <span className="mt-1 block text-xs text-red-800">I think the crowd is too optimistic.</span>
        </button>
      </div>

      {hasPick ? (
        <p className="mt-4 rounded-lg border border-accent/20 bg-accent-soft px-3 py-2 text-sm text-ink">
          Current paper pick: <strong>{prediction.data?.side?.toUpperCase()}</strong>. You can update it anytime before
          resolution.
        </p>
      ) : null}
      {toggleWatchlist.error || submitPrediction.error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {(toggleWatchlist.error || submitPrediction.error)?.message}
        </p>
      ) : null}
    </section>
  )
}
