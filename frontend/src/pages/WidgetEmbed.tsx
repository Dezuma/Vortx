import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { WidgetStrip } from '../components/WidgetStrip'
import { useMarket } from '../hooks/useMarket'

function clampPct(n: number) {
  if (Number.isNaN(n)) return 50
  return Math.min(97, Math.max(3, Math.round(n)))
}

export function WidgetEmbed() {
  const [params] = useSearchParams()
  const compact = params.get('compact') === '1' || params.get('layout') === 'strip'

  const slug = params.get('slug')?.trim() || 'fed-cut-q3'
  const { data: market, isPending, isError, error } = useMarket(slug)
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

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Live odds widget</h1>
        <p className="mt-2 text-sm text-muted">
          Put a market inside a newsletter, blog, or creator page. Readers see the crowd price, then click through to
          Vortx. Add <code className="font-mono text-xs">?compact=1</code> for iframe mode. Optional:{' '}
          <code className="font-mono text-xs">title</code>, <code className="font-mono text-xs">yes</code> (0–100), and{' '}
          <code className="font-mono text-xs">slug</code>.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-surface-elevated p-4">
        <p className="text-xs font-semibold uppercase text-muted">Live preview</p>
        <div className="mt-3 max-w-md">
          <WidgetStrip title={title} yes={yes} slug={slug} />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="text-xs font-semibold uppercase text-muted">Embed code</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-neutral-900 p-3 font-mono text-xs text-neutral-100">
          {snippet}
        </pre>
        <p className="mt-2 text-xs text-muted">
          Point <code className="font-mono">src</code> at your deployed origin; height ~120px for the strip.
        </p>
      </div>
    </div>
  )
}
