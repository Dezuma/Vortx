import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  getFrictionFeed,
  getPublicSignals,
  getSourceTransparency,
  type FrictionEntity,
  type PublicSignal,
} from './api'
import { PricingSection } from './components/PricingSection'
import { SiteHeader } from './components/SiteHeader'
import { SignalCard } from './components/SignalCard'
import { SignalUnlockModal } from './components/SignalUnlockModal'
import { ConsumerHeroIntro } from './components/ConsumerToolCards'
import { HERO_COPY } from './lib/consumer-tools'
import { HeatMapScanPrompt, ScanPortfolioCta } from './components/scan/ScanPromos'

const legalDisclaimer =
  'Vortxmkt aggregates public or licensed records. Signals are filings, notices, liens, proceedings, or administrative artifacts, not judgments or advice.'

const pipeline = [
  {
    label: 'Scrapers',
    title: 'Daily legal-friction collection',
    copy: 'Python jobs pull from reviewed court APIs, county feeds, RSS endpoints, and provider tables. Riskier portal adapters stay disabled until terms are approved.',
  },
  {
    label: 'Aggregator',
    title: 'Supabase entity timelines',
    copy: 'Raw records are stored, deduplicated, linked to evidence, and normalized into company-level timelines for scoring.',
  },
  {
    label: 'Delivery',
    title: 'Heat map and alerts',
    copy: 'When liens, notices, court activity, or search surges push friction higher, subscribers see the movement and can trigger alerts.',
  },
]

const socialProofWorkflows = [
  {
    role: 'Investor / trader',
    copy: 'Before I hold a position, I check WARN and bankruptcy dockets in the live queue;not just headlines.',
  },
  {
    role: 'Legal ops',
    copy: 'We review adversary proceedings and lien trails on counterparties before internal sign-off.',
  },
  {
    role: 'SMB / vendor risk',
    copy: 'Major contracts get three public checks: WARN notice, lien cluster, bankruptcy docket.',
  },
]

const buyerSegments = [
  {
    title: 'Retail investors & day traders',
    copy: 'Due diligence before a position: WARN and bankruptcy dockets with dates and jurisdictions;research only, not trading advice.',
    unlock: 'Free queue → watchlists and source links',
  },
  {
    title: 'Small business owners',
    copy: 'Vet vendors and clients before big contracts. Liens and WARN notices flag payment and workforce risk early.',
    unlock: 'Counterparty watchlists and alerts',
  },
  {
    title: 'Journalists & researchers',
    copy: 'Story leads from dated public filings before the press release cycle.',
    unlock: 'Timelines and subscriber source URLs',
  },
  {
    title: 'Real estate professionals',
    copy: 'Lien clusters and county records for transactions, title work, and commercial diligence.',
    unlock: 'Entity timelines and lien filters',
  },
  {
    title: 'Paralegals & legal ops',
    copy: 'Pre-litigation research and counterparty vetting with source-linked trails;top Pro conversion segment.',
    unlock: 'Exports, API, evidence packets',
  },
  {
    title: 'HR & workforce',
    copy: 'Monitor competitor WARN filings and sector layoff trends for planning.',
    unlock: 'WARN alerts and jurisdiction packs',
  },
  {
    title: 'Curious general public',
    copy: 'See what is already public and updated daily;virality-friendly entry to the free signal queue.',
    unlock: 'Shareable free signals → paid depth',
  },
  {
    title: 'Credit & vendor risk',
    copy: 'Portfolio and vendor monitoring with friction scores before quarterly reviews catch up.',
    unlock: 'CSV export and bulk watchlists',
  },
]

function scoreTone(score: number) {
  if (score >= 80) return 'border-rose-400/30 bg-rose-950/30 text-rose-100'
  if (score >= 65) return 'border-amber-400/30 bg-amber-950/30 text-amber-100'
  return 'border-slate-500/20 bg-slate-900/50 text-slate-200'
}

function scoreLabel(score: number) {
  if (score >= 80) return 'High friction'
  if (score >= 65) return 'Building pressure'
  return 'Early signal'
}

function eventLabel(value: string) {
  return value.replaceAll('_', ' ')
}

function sourceLabel(source: string) {
  if (source === 'supabase') return 'Live Supabase feed'
  if (source === 'fixture') return 'Demo feed'
  return source
}

function compactName(name: string) {
  return name.replace(/\s*\(In re .+?\)$/i, '').replace(/^In re\s+/i, '').trim()
}

function SignalQueue({ signals }: { signals: PublicSignal[] }) {
  const [lockedSignal, setLockedSignal] = useState<PublicSignal | null>(null)

  return (
    <section id="signals" className="mx-auto max-w-6xl px-6 py-8">
      <div className="glass-panel rounded-3xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Free Signal Queue</p>
            <h2 className="display-font mt-2 max-w-3xl text-4xl text-ink">
              Real companies. Real public records. The source links stay behind the paywall.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              This is the upfront value: a rotating sample of the live queue with entity name, record type, date,
              jurisdiction, and friction score. Subscribers unlock source URLs, timelines, alerts, and exports.
            </p>
          </div>
          <a href="#pricing" className="terminal-button-solid rounded-xl px-4 py-2.5 text-sm font-semibold">
            Unlock source links
          </a>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {signals.length === 0 ? (
            <div className="rounded-xl border border-metallic bg-black/40 p-4 text-sm text-muted lg:col-span-2">
              Live public signals are loading. Subscribers can still use the full friction feed once authenticated.
            </div>
          ) : signals.slice(0, 8).map((signal) => (
            <SignalCard key={signal.id} signal={signal} onUnlockClick={setLockedSignal} />
          ))}
        </div>
      </div>
      <SignalUnlockModal signal={lockedSignal} onClose={() => setLockedSignal(null)} />
    </section>
  )
}

function BuyerSegments() {
  return (
    <section id="buyers" className="mx-auto max-w-6xl px-6 py-8">
      <p className="eyebrow">Who it&apos;s for</p>
      <h2 className="display-font mt-2 max-w-3xl text-4xl text-ink">
        Every team that reads the record before the headline
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {buyerSegments.map((segment) => (
          <article key={segment.title} className="glass-panel rounded-2xl p-5">
            <h3 className="display-font text-2xl text-ink">{segment.title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted">{segment.copy}</p>
            <p className="data-font mt-4 rounded-xl border border-terminal-blue/30 bg-terminal-blue/10 px-3 py-2 text-xs text-terminal-blue">
              Unlock: {segment.unlock}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

function LeadMagnet() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <div className="glass-panel rounded-3xl p-6">
        <p className="eyebrow">Blind Spot Scanner</p>
        <h2 className="display-font mt-2 max-w-3xl text-4xl text-ink">Bring a watchlist. Scan up to 10 companies free.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Enter holdings or competitors and see public-record activity from the last 90 days. Email unlocks the full
          scan; paid plans add ongoing monitoring, source links, and exports.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/scan" className="terminal-button-solid rounded-xl px-4 py-2.5 text-sm font-semibold">
            Start free scan
          </Link>
          <a href="#signals" className="terminal-button rounded-xl px-4 py-2.5 text-sm font-medium">
            View today&apos;s sample queue
          </a>
        </div>
      </div>
    </section>
  )
}

function EntityCard({ entity, selected, onSelect }: { entity: FrictionEntity; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border px-4 py-3 text-left transition duration-700 hover:border-terminal-blue/50 ${
        selected ? 'border-terminal-blue/45 bg-terminal-blue/10' : 'border-metallic bg-black/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="line-clamp-2 text-sm font-medium text-ink">{compactName(entity.canonical_name)}</p>
          <p className="mt-1 text-xs text-muted">
            {entity.ticker ? `${entity.ticker} · ` : ''}
            {entity.jurisdiction ?? 'Unknown jurisdiction'}
          </p>
        </div>
        <span className={`data-font rounded-lg border px-2.5 py-1 text-xs ${scoreTone(entity.latest_score)}`}>
          {entity.latest_score}
        </span>
      </div>
      <p className="mt-3 text-xs text-soft">{scoreLabel(entity.latest_score)} · Confidence {entity.confidence}%</p>
    </button>
  )
}

function HeatMap({ entities, onSelect }: { entities: FrictionEntity[]; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {entities.slice(0, 12).map((entity) => (
        <button
          key={entity.id}
          type="button"
          onClick={() => onSelect(entity.id)}
          className={`min-h-28 rounded-xl border p-3 text-left transition duration-700 hover:border-terminal-blue/60 ${scoreTone(entity.latest_score)}`}
        >
          <p className="data-font text-2xl font-semibold">{entity.latest_score}</p>
          <p className="mt-2 line-clamp-2 text-xs font-medium">{compactName(entity.canonical_name)}</p>
          <p className="mt-2 text-[11px] opacity-75">{scoreLabel(entity.latest_score)}</p>
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const feed = useQuery({ queryKey: ['friction-feed'], queryFn: getFrictionFeed })
  const publicSignals = useQuery({ queryKey: ['public-signals'], queryFn: getPublicSignals })
  const sources = useQuery({ queryKey: ['source-transparency'], queryFn: getSourceTransparency })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const entities = feed.data?.entities ?? []
  const events = feed.data?.events ?? []
  const rankedEntities = useMemo(() => [...entities].sort((a, b) => b.latest_score - a.latest_score), [entities])
  const selected = useMemo(() => rankedEntities.find((entity) => entity.id === selectedId) ?? rankedEntities[0], [rankedEntities, selectedId])
  const selectedEvents = selected ? events.filter((event) => event.entity_id === selected.id) : []
  const highFrictionCount = entities.filter((entity) => entity.latest_score >= 80).length
  const enabledSources = (sources.data?.sources ?? []).filter((source) => source.enabled).length

  return (
    <main className="min-h-svh bg-surface text-ink">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <ConsumerHeroIntro />
          <aside className="glass-panel sticky top-28 rounded-3xl p-5">
            <p className="eyebrow text-soft">{HERO_COPY.pulseEyebrow}</p>
            <h3 className="display-font mt-2 text-2xl text-ink">{HERO_COPY.pulseTitle}</h3>
            <p className="mt-2 text-xs leading-5 text-muted">{HERO_COPY.pulseSocialProof}</p>
            <p className="mt-2 text-xs leading-5 text-soft">{HERO_COPY.pulseHint}</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted">Feed</span><span>{sourceLabel(feed.data?.source ?? 'loading')}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted">Entities tracked</span><span>{entities.length}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted">Records indexed</span><span>{events.length}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted">High friction</span><span>{highFrictionCount}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted">Enabled sources</span><span>{enabledSources}</span></div>
            </div>
            <a href="#heat-map" className="mt-5 inline-flex text-sm text-terminal-blue underline underline-offset-4">
              For investors: open heat map
            </a>
          </aside>
        </div>
      </section>

      <ScanPortfolioCta />

      <SignalQueue signals={publicSignals.data?.signals ?? []} />
      <LeadMagnet />
      <BuyerSegments />

      <section id="pipeline" className="mx-auto max-w-6xl px-6 py-4">
        <div className="grid gap-4 md:grid-cols-3">
          {pipeline.map((item) => (
            <article key={item.label} className="glass-panel rounded-2xl p-5">
              <p className="eyebrow">{item.label}</p>
              <h3 className="display-font mt-3 text-2xl text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="heat-map" className="mx-auto grid max-w-6xl gap-5 px-6 py-8 lg:grid-cols-[1fr_360px]">
        <section className="glass-panel rounded-3xl p-5">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Heat Map</p>
              <h2 className="display-font mt-2 text-3xl text-ink">Legal friction by entity</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted">Scores combine record type, recency, confidence, and velocity. A score near 80 means the entity deserves faster review, not that liability has been proven.</p>
          </div>
          <HeatMapScanPrompt />
          {feed.isPending ? <p className="text-sm text-muted">Loading heat map...</p> : <HeatMap entities={rankedEntities} onSelect={setSelectedId} />}
        </section>

        <aside className="space-y-3">
          <p className="eyebrow">Top Movers</p>
          {rankedEntities.slice(0, 6).map((entity) => (
            <EntityCard key={entity.id} entity={entity} selected={selected?.id === entity.id} onSelect={() => setSelectedId(entity.id)} />
          ))}
        </aside>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-4">
        <section className="glass-panel rounded-3xl p-5">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-soft">Selected signal</p>
                  <h2 className="display-font mt-2 max-w-4xl text-4xl text-ink">{compactName(selected.canonical_name)}</h2>
                  <p className="mt-2 text-sm text-muted">{selected.primary_address || selected.jurisdiction || 'No address on file'}</p>
                </div>
                <div className={`rounded-xl border px-5 py-3 text-center ${scoreTone(selected.latest_score)}`}>
                  <p className="font-mono text-3xl font-semibold">{selected.latest_score}</p>
                  <p className="text-xs uppercase tracking-wide">Friction</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {selected.reasons.map((reason) => (
                  <div key={reason.label} className="rounded-xl border border-metallic bg-black/40 p-4">
                    <p className="text-sm font-medium text-ink">{reason.label}</p>
                    <p className="mt-2 text-xs text-soft">Reason weight {reason.weight}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {selectedEvents.length ? selectedEvents.map((event) => (
                  <article key={event.id} className="rounded-xl border border-metallic bg-black/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink">{event.title}</p>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{event.summary}</p>
                      </div>
                      <span className="rounded-full border border-line px-2.5 py-1 text-xs capitalize text-soft">{eventLabel(event.event_type)}</span>
                    </div>
                    <p className="mt-3 break-all text-xs text-soft">
                      {event.jurisdiction} · Filed {event.filing_date} · Confidence {event.confidence}%
                      {event.source_url ? ` · ${event.source_url}` : ''}
                    </p>
                  </article>
                )) : <p className="text-sm text-muted">No source-linked events loaded for this entity.</p>}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No entities loaded.</p>
          )}
        </section>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel rounded-3xl p-5">
          <p className="eyebrow">Alert trigger</p>
          <h2 className="display-font mt-2 text-3xl text-ink">80/100 is the review threshold</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Subscribers use watchlists to monitor vendors, debtors, public companies, and competitors. When a watched entity crosses the friction threshold, Vortxmkt can route a premium alert for human review.
          </p>
          <a href="mailto:ops@vortxmkt.com?subject=Vortxmkt%20Access" className="terminal-button-solid mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold">Request access</a>
        </section>

        <section id="sources" className="glass-panel rounded-3xl p-5">
          <p className="eyebrow">Source transparency</p>
          <h2 className="display-font mt-2 text-3xl text-ink">Active, reviewed, and disabled sources</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(sources.data?.sources ?? []).map((source) => (
              <div key={source.slug} className="rounded-xl border border-metallic bg-black/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{source.name}</p>
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-soft">{source.terms_status}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {source.jurisdiction} · {source.record_type} · {source.access_method} · {source.enabled ? 'enabled' : 'disabled'}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>

      <PricingSection />

      <section id="legal" className="mx-auto max-w-6xl px-6 py-10">
        <div className="glass-panel rounded-2xl p-4 text-sm leading-6 text-muted">
          <strong className="text-ink">Legal note:</strong> {legalDisclaimer}
        </div>
      </section>
    </main>
  )
}
