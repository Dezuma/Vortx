import { Link } from 'react-router-dom'

export function ScanPortfolioCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-4">
      <Link
        to="/scan"
        className="glass-panel group flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 transition duration-700 hover:border-terminal-blue/30"
      >
        <div>
          <p className="eyebrow">Blind Spot Scanner</p>
          <p className="mt-1 text-sm text-ink">
            Have a portfolio or a competitor list? Scan all of them at once →
          </p>
          <p className="mt-1 text-xs text-muted">
            Multi-company public-record scan: same checks as single-company lookup, applied to your whole list.
          </p>
        </div>
        <span className="text-xs text-muted underline underline-offset-4 transition duration-700 group-hover:text-ink">
          Start scan
        </span>
      </Link>
    </section>
  )
}

export function HeatMapScanPrompt() {
  return (
    <p className="mb-4 text-sm text-muted">
      Want this for your own watchlist instead of the public feed?{' '}
      <Link to="/scan" className="text-terminal-blue underline underline-offset-4 hover:text-ink">
        Scan your companies →
      </Link>
    </p>
  )
}

export function HeroCompanyLookup() {
  return (
    <Link
      to="/scan"
      className="terminal-button-solid group mt-6 flex w-full max-w-2xl items-center justify-between gap-4 rounded-2xl px-6 py-4 text-left shadow-sm transition hover:opacity-95"
    >
      <span className="flex items-center gap-3">
        <span className="data-font rounded-lg border border-white/20 bg-black/30 px-2.5 py-1 text-xs text-white/90">
          Cmd+K
        </span>
        <span>
          <span className="block text-base font-semibold text-white">Check a company now</span>
          <span className="data-font mt-1 block text-xs opacity-90">
            Search WARN, liens, bankruptcy dockets, and more
          </span>
        </span>
      </span>
      <span className="text-sm font-semibold text-white">Search →</span>
    </Link>
  )
}
