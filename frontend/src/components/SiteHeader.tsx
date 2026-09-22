import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { CONSUMER_TOOLS } from '../lib/consumer-tools'

const primaryLinks = [
  { href: '/', label: 'Overview', route: true },
  ...CONSUMER_TOOLS.map((tool) => ({ href: tool.href, label: tool.navLabel, route: false })),
  { href: '/#pricing', label: 'Pricing', route: false },
  { href: '/?view=customer', label: 'Login', route: false },
]

const investorLinks = [
  { href: '/#sources', label: 'Data Sources' },
  { href: '/cases', label: 'Case files' },
]

export function SiteHeader() {
  const location = useLocation()
  const [investorOpen, setInvestorOpen] = useState(false)

  return (
    <header className="border-b border-metallic/70 bg-black/45 px-6 py-5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Public-Record Checks</p>
          <Link to="/" className="display-font mt-1 block text-3xl text-ink">
            Vortx
          </Link>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {primaryLinks.map((item) =>
            item.route ? (
              <Link
                key={item.href}
                to={item.href}
                className={`rounded-lg px-3 py-2 hover:text-ink ${location.pathname === item.href ? 'text-ink' : ''}`}
              >
                {item.label}
              </Link>
            ) : (
              <a key={item.href} href={item.href} className="rounded-lg px-3 py-2 hover:text-ink">
                {item.label}
              </a>
            ),
          )}
          <div className="relative">
            <button
              type="button"
              className="rounded-lg px-3 py-2 hover:text-ink"
              aria-expanded={investorOpen}
              onClick={() => setInvestorOpen((open) => !open)}
            >
              For Investors &amp; Teams
            </button>
            {investorOpen ? (
              <div className="absolute right-0 z-30 mt-2 min-w-48 rounded-xl border border-metallic bg-surface p-2 shadow-lg">
                {investorLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-black/30 hover:text-ink"
                    onClick={() => setInvestorOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  )
}
