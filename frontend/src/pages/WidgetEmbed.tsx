import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WidgetStrip } from '../components/WidgetStrip'
import { useMarket } from '../hooks/useMarket'
import { useMarkets } from '../hooks/useMarkets'

function clampPct(n: number) {
  if (Number.isNaN(n)) return 50
  return Math.min(97, Math.max(3, Math.round(n)))
}

export function WidgetEmbed() {
  const [params] = useSearchParams()
  const compact = params.get('compact') === '1' || params.get('layout') === 'strip'

  const slug = params.get('slug')?.trim() || 'fed-cut-q3'
  const { data: market, isPending, isError, error } = useMarket(slug)
  const { data: markets, isPending: isFeedPending, isError: isFeedError } = useMarkets()
  const title = params.get('title')?.trim() || market?.title || 'Live Vortx market'
  const yesParam = params.get('yes')
  const yesRaw = yesParam == null ? Number.NaN : Number(yesParam)
  const yes = Number.isFinite(yesRaw) ? clampPct(yesRaw) / 100 : (market?.yes_price ?? 0.5)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const iframeSrc = useMemo(() => {
    const base = origin || 'https://example.com'
    const u = new URL('/widget', base)
    u.searchParams.set('compact', '1')
    u.searchParams.set('title', title)
    u.searchParams.set('yes', String(Math.round(yes * 100)))
    if (slug) u.searchParams.set('slug', slug)
    return u.pathname + u.search
  }, [origin, title, yes, slug])

  const snippet = `<iframe src="${origin}${iframeSrc}" title="Vortx odds" width="100%" height="120" style="border:0;border-radius:12px" loading="lazy"></iframe>`

  if (isPending && !params.get('title')) {
    return <p className="text-sm text-muted">Loading market widget…</p>
  }

  if (isError || (!market && !params.get('title'))) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Could not load widget market: {error?.message || 'market not found'}
      </div>
    )
  }

  if (compact) {
    return <WidgetStrip title={title} yes={yes} slug={slug} />
  }

  const feedMarkets = (markets ?? []).slice(0, 6)

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Newsletter feed</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Live odds for writers and readers</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Drop Vortx into a newsletter so readers see the current crowd price before they click. Each block is backed
            by a real Supabase market, not bundled sample data.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Featured embed</p>
          <div className="mt-3">
            <WidgetStrip title={title} yes={yes} slug={slug} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface-elevated p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Market feed blocks</h2>
            <p className="mt-1 text-sm text-muted">Use these as newsletter modules or link cards.</p>
          </div>
          <Link to="/pricing" className="text-sm font-semibold text-accent no-underline hover:underline">
            Unlock creator tools →
          </Link>
        </div>

        {isFeedPending ? <p className="mt-5 text-sm text-muted">Loading live feed…</p> : null}
        {isFeedError ? (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            Could not load the newsletter feed.
          </p>
        ) : null}
        {!isFeedPending && !isFeedError && feedMarkets.length === 0 ? (
          <p className="mt-5 text-sm text-muted">No live markets are available yet.</p>
        ) : null}
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {feedMarkets.map((m) => (
            <WidgetStrip
              key={m.id}
              title={m.title}
              yes={m.yes_price ?? 0.5}
              slug={m.slug ?? m.id}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['Free feed', 'Public odds blocks for open markets. Good for readers and casual sharing.', '/markets'],
          ['Creator feed', 'Referral-tagged widgets, priority odds blocks, and newsletter packaging.', '/pricing'],
          ['Desk feed', 'Private market packs, API/widget pilot scope, and partner follow-up.', '/pricing'],
        ].map(([titleBlock, body, href]) => (
          <Link
            key={titleBlock}
            to={href}
            className="rounded-xl border border-line bg-surface-elevated p-4 text-ink no-underline shadow-sm hover:border-neutral-300 hover:shadow-md"
          >
            <h2 className="font-semibold">{titleBlock}</h2>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <p className="text-xs font-semibold uppercase text-muted">Embed code</p>
        <div className="mt-3 max-w-md">
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-neutral-900 p-3 font-mono text-xs text-neutral-100">
            {snippet}
          </pre>
        </div>
        <p className="mt-2 text-xs text-muted">
          Use <code className="font-mono">?compact=1&amp;slug=market-slug</code> for a small iframe card.
        </p>
      </section>
    </div>
  )
}
