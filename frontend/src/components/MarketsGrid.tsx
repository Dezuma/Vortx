import { useMarkets } from '../hooks/useMarkets'
import { supabase } from '../lib/supabase'
import { MarketCard } from './MarketCard'

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-line bg-surface-elevated p-4">
      <div className="h-4 max-w-[85%] rounded bg-neutral-200" />
      <div className="mt-3 h-3 w-full rounded bg-neutral-100" />
      <div className="mt-2 h-3 w-2/3 rounded bg-neutral-100" />
      <div className="mt-4 h-2 rounded-full bg-neutral-100" />
    </div>
  )
}

type Props = {
  title?: string
  subtitle?: string
  /** Fewer columns for embed / narrow layouts */
  compact?: boolean
}

export function MarketsGrid({ title = 'Markets', subtitle, compact }: Props) {
  const hasDb = Boolean(supabase)
  const { data, isPending, isError, error, refetch } = useMarkets()
  const rows = data ?? []

  return (
    <section className="rounded-xl border border-line bg-surface-elevated p-5 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {hasDb ? (
          <button
            type="button"
            onClick={() => void refetch()}
            className="self-start rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-neutral-50"
          >
            Refresh
          </button>
        ) : null}
      </div>

      {!hasDb ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          Supabase is not configured for this build. Add <code className="font-mono">VITE_SUPABASE_URL</code> and a
          publishable key in Cloudflare, then redeploy.
        </p>
      ) : null}

      {hasDb && isError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">Could not load markets</p>
          <p className="mt-1 text-red-800/90">{error?.message}</p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-red-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {hasDb && isPending ? (
        <div
          className={`mt-6 grid gap-4 ${compact ? 'sm:grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'}`}
        >
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !hasDb ? null : rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No live markets yet. Add rows to <code className="font-mono text-xs">public.markets</code> in Supabase.
        </p>
      ) : (
        <div
          className={`mt-6 grid gap-4 ${compact ? 'sm:grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'}`}
        >
          {rows.map((m) => (
            <MarketCard key={m.id} market={m} compact={compact} />
          ))}
        </div>
      )}
    </section>
  )
}
