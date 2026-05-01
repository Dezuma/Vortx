import { Link } from 'react-router-dom'
import type { Market } from '../types/market'
import { formatNoFromYes, formatYesCents } from '../lib/format-price'

function outcomeStyles(outcome: string | null | undefined) {
  switch (outcome) {
    case 'yes':
      return 'bg-emerald-100 text-emerald-900'
    case 'no':
      return 'bg-red-100 text-red-900'
    case 'void':
      return 'bg-neutral-200 text-neutral-700'
    default:
      return 'bg-accent-soft text-accent'
  }
}

type Props = { market: Market; compact?: boolean }

export function MarketCard({ market, compact }: Props) {
  const href = `/m/${market.slug ?? market.id}`
  const yes = market.yes_price
  const yesPct = yes != null ? Math.round(Number(yes) * 100) : 0

  return (
    <article
      className={`group flex flex-col rounded-xl border border-line bg-surface-elevated shadow-sm transition hover:border-neutral-300 hover:shadow-md ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={href}
          className={`font-semibold text-ink no-underline group-hover:text-accent ${
            compact ? 'text-sm leading-snug' : 'text-base leading-snug'
          }`}
        >
          {market.title}
        </Link>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${outcomeStyles(
            market.outcome,
          )}`}
        >
          {market.outcome ?? 'open'}
        </span>
      </div>
      {!compact && market.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted">{market.description}</p>
      ) : null}
      <div className={`mt-3 flex items-end justify-between gap-3 ${compact ? 'mt-2' : ''}`}>
        <div className="min-w-0 flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${yesPct}%` }}
              role="presentation"
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-xs tabular-nums text-muted">
            <span>
              YES chance <strong className="text-emerald-700">{formatYesCents(yes)}</strong>
            </span>
            <span>
              NO <strong className="text-red-700">{formatNoFromYes(yes)}</strong>
            </span>
          </div>
        </div>
        <Link
          to={href}
          className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-neutral-800"
        >
          View
        </Link>
      </div>
    </article>
  )
}
