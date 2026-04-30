import { Link } from 'react-router-dom'
import { formatNoFromYes, formatYesCents } from '../lib/format-price'

type Props = {
  title: string
  yes: number
  slug: string
}

export function WidgetStrip({ title, yes, slug }: Props) {
  return (
    <div className="rounded-lg border border-line bg-surface-elevated p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
        <span className="text-emerald-600">{formatYesCents(yes)}</span>
        <span className="mx-1.5 text-neutral-400">/</span>
        <span className="text-red-600">{formatNoFromYes(yes)}</span>
      </p>
      <Link
        to={`/m/${slug}`}
        className="mt-2 inline-block text-[11px] font-semibold text-accent no-underline hover:underline"
      >
        Trade on Vortx →
      </Link>
    </div>
  )
}
