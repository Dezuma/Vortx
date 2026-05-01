import { MarketsGrid } from '../components/MarketsGrid'

export function Markets() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Markets</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Each card is a yes/no question. The YES price is the market’s current chance estimate; 42¢ means roughly 42%.
        </p>
      </div>
      <MarketsGrid subtitle="Sorted by last update. Realtime keeps the grid fresh when the table changes." />
    </div>
  )
}
