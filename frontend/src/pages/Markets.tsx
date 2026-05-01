import { MarketsGrid } from '../components/MarketsGrid'

export function Markets() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Markets</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          These are paper markets for now. A YES price of 42¢ means the crowd is saying “about a 42% chance.” If you
          disagree, save the market, share it, or join the league.
        </p>
      </div>
      <MarketsGrid subtitle="Sorted by last update. Realtime keeps the grid fresh when the table changes." />
    </div>
  )
}
