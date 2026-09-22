import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PricingSection } from '../components/PricingSection'
import { SignalCard } from '../components/SignalCard'
import { SignalUnlockModal } from '../components/SignalUnlockModal'
import type { PublicSignal } from '../api'
import { fetchTradingSignals } from '../lib/trading-signals'

const tradingDisclaimer =
  'Public-record signals for listed companies are allegations or administrative artifacts, not judgments. Vortxmkt does not provide investment or trading advice.'

export default function TradingPage() {
  const [lockedSignal, setLockedSignal] = useState<PublicSignal | null>(null)
  const tradingSignals = useQuery({
    queryKey: ['trading-signals'],
    queryFn: fetchTradingSignals,
  })

  return (
    <main className="min-h-svh bg-surface text-ink">
      <header className="border-b border-metallic/70 bg-black/45 px-6 py-5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Ticker-linked queue</p>
            <h1 className="display-font mt-1 text-3xl text-ink">Trading signals</h1>
          </div>
          <nav className="flex flex-wrap gap-5 text-sm text-muted">
            <Link to="/" className="hover:text-ink">
              Home
            </Link>
            <a href="#trading-signals" className="hover:text-ink">
              Signals
            </a>
            <a href="#pricing" className="hover:text-ink">
              Pricing
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="glass-panel rounded-3xl p-6">
          <p className="eyebrow">Research queue</p>
          <h2 className="display-font mt-3 max-w-3xl text-4xl text-ink">
            Public-record friction for exchange-listed companies
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Signals below are joined to companies with a verified ticker symbol. Source URLs and full timelines stay
            behind the subscriber paywall.
          </p>
        </div>
      </section>

      <section id="trading-signals" className="mx-auto max-w-6xl px-6 py-4">
        <div className="glass-panel rounded-3xl p-5">
          {tradingSignals.isPending ? (
            <p className="text-sm text-muted">Loading ticker-linked signals…</p>
          ) : tradingSignals.isError ? (
            <p className="text-sm text-rose-100">
              {tradingSignals.error instanceof Error
                ? tradingSignals.error.message
                : 'Unable to load trading signals.'}
            </p>
          ) : tradingSignals.data.length === 0 ? (
            <p className="text-sm text-muted">
              No ticker-linked signals are available yet. Run ingest and ticker backfill, then refresh.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {tradingSignals.data.map((signal) => (
                <SignalCard key={signal.id} signal={signal} onUnlockClick={setLockedSignal} />
              ))}
            </div>
          )}
        </div>
      </section>

      <PricingSection />

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="glass-panel rounded-2xl p-4 text-sm leading-6 text-muted">
          <strong className="text-ink">Legal note:</strong> {tradingDisclaimer}
        </div>
      </section>

      <SignalUnlockModal signal={lockedSignal} onClose={() => setLockedSignal(null)} />
    </main>
  )
}
