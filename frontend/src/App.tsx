import { Link, Route, Routes } from 'react-router-dom'
import { useMarketsRealtime } from './hooks/useMarketsRealtime'
import { Bots } from './pages/Bots'
import { Home } from './pages/Home'
import { MarketDetail } from './pages/MarketDetail'
import { Markets } from './pages/Markets'
import { Pricing } from './pages/Pricing'
import { WidgetEmbed } from './pages/WidgetEmbed'

function Layout() {
  useMarketsRealtime()

  return (
    <div className="flex min-h-svh flex-col bg-surface text-ink">
      <header className="border-b border-line bg-surface-elevated">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight text-ink no-underline hover:text-neutral-800">
            Vortx
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            <Link to="/" className="text-accent no-underline hover:underline">
              Home
            </Link>
            <Link to="/markets" className="text-accent no-underline hover:underline">
              Markets
            </Link>
            <Link to="/pricing" className="text-accent no-underline hover:underline">
              Pricing
            </Link>
            <Link to="/bots" className="text-accent no-underline hover:underline">
              Bots
            </Link>
            <Link to="/widget" className="text-accent no-underline hover:underline">
              Widget
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/m/:slugOrId" element={<MarketDetail />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/bots" element={<Bots />} />
          <Route path="/widget" element={<WidgetEmbed />} />
        </Routes>
      </main>
      <footer className="border-t border-line px-5 py-6 text-center text-xs text-muted">
        Cloudflare Workers + assets · Supabase RLS · Stripe Checkout
      </footer>
    </div>
  )
}

export default function App() {
  return <Layout />
}
