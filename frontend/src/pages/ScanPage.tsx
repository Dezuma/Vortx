import { useMemo, useState } from 'react'
import {
  postScanMatch,
  postScanResults,
  postScanUnlock,
  type ScanEntityResult,
  type ScanMatchResult,
} from '../api'
import { SiteHeader } from '../components/SiteHeader'
import { ScanEntityResult as ScanEntityResultCard } from '../components/scan/ScanEntityResult'

type Step = 'input' | 'match' | 'results' | 'unlocked'

const SCAN_COPY = {
  eyebrow: 'Competitor scan',
  headline: "You're waiting for their earnings call. The public record isn't waiting.",
  placeholder: 'Rival Corp, Acme Industries, Northstar LLC… (name or ticker)',
  helper:
    'Enter up to 10 competitor names or tickers. We match SEC-listed companies and public-record entities, then scan the last 90 days for filings competitors rarely surface in earnings.',
} as const

function parseInput(raw: string) {
  return raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function ScanPage() {
  const [step, setStep] = useState<Step>('input')
  const [input, setInput] = useState('')
  const [matches, setMatches] = useState<ScanMatchResult[]>([])
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [results, setResults] = useState<ScanEntityResult[]>([])
  const [unlocked, setUnlocked] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const names = useMemo(() => parseInput(input), [input])
  const entityIds = useMemo(() => Object.values(selected).filter(Boolean), [selected])

  async function runMatch() {
    setError(null)
    setBusy(true)
    try {
      const payload = await postScanMatch(names, 'competitors')
      setMatches(payload.results)
      const defaults: Record<string, string> = {}
      for (const row of payload.results) {
        if (row.matches[0]) defaults[row.input] = row.matches[0].entity_id
      }
      setSelected(defaults)
      setStep('match')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Match failed.')
    } finally {
      setBusy(false)
    }
  }

  async function runResults() {
    if (!entityIds.length) {
      setError('Select at least one matched entity.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const payload = await postScanResults(entityIds)
      setResults(payload.entities)
      setStep('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.')
    } finally {
      setBusy(false)
    }
  }

  async function runUnlock(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const payload = await postScanUnlock(email, entityIds, 'competitors')
      setResults(payload.entities)
      setUnlocked(true)
      setStep('unlocked')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unlock failed.')
    } finally {
      setBusy(false)
    }
  }

  const pricingHref = `/?view=pricing&watchlist=${encodeURIComponent(entityIds.join(','))}`

  return (
    <main className="min-h-svh bg-surface text-ink">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="glass-panel rounded-3xl p-6">
          <p className="eyebrow">{SCAN_COPY.eyebrow}</p>
          <h1 className="display-font mt-3 text-5xl text-ink">{SCAN_COPY.headline}</h1>
          <p className="mt-4 text-sm leading-6 text-muted">{SCAN_COPY.helper}</p>

          {step === 'input' ? (
            <div className="mt-6 space-y-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={5}
                placeholder={SCAN_COPY.placeholder}
                className="w-full rounded-xl border border-metallic bg-black/40 px-4 py-3 text-sm text-ink outline-none focus:border-terminal-blue/40"
              />
              <button
                type="button"
                disabled={busy || !names.length}
                onClick={() => void runMatch()}
                className="terminal-button-solid rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {busy ? 'Matching…' : 'Match companies'}
              </button>
            </div>
          ) : null}

          {step === 'match' ? (
            <div className="mt-6 space-y-4">
              {matches.map((row) => (
                <div key={row.input} className="rounded-xl border border-metallic bg-black/35 p-4">
                  <p className="text-sm font-medium text-ink">{row.input}</p>
                  {row.matches.length ? (
                    <>
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-soft">
                        Matched entity (name confidence)
                      </p>
                      <select
                        value={selected[row.input] || ''}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [row.input]: e.target.value }))}
                        className="mt-2 w-full rounded-lg border border-metallic bg-black/50 px-3 py-2 text-sm"
                      >
                        {row.matches.map((match) => (
                          <option key={match.entity_id} value={match.entity_id}>
                            {match.name} · {match.jurisdiction || 'Unknown'} ·{' '}
                            {Math.round(match.confidence * 100)}% name match
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted">No close match found. Try a fuller legal name or ticker.</p>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy || !entityIds.length}
                  onClick={() => void runResults()}
                  className="terminal-button-solid rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {busy ? 'Scanning…' : 'Run scan'}
                </button>
                <button type="button" onClick={() => setStep('input')} className="terminal-button rounded-xl px-4 py-2.5 text-sm">
                  Edit list
                </button>
              </div>
            </div>
          ) : null}

          {(step === 'results' || step === 'unlocked') && results.length ? (
            <div className="mt-8 space-y-4">
              {results.map((result, index) => (
                <ScanEntityResultCard
                  key={result.entity_id}
                  result={result}
                  index={index}
                  upgradeHref={pricingHref}
                />
              ))}

              {step === 'results' && !unlocked ? (
                <form onSubmit={(e) => void runUnlock(e)} className="rounded-2xl border border-terminal-blue/30 bg-terminal-blue/5 p-5">
                  <h2 className="display-font text-2xl text-ink">
                    Unlock full results for all {entityIds.length} entit{entityIds.length === 1 ? 'y' : 'ies'} you scanned
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    We&apos;ll email you your scan results. Unsubscribe anytime.
                  </p>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Work email"
                    className="mt-4 w-full rounded-xl border border-metallic bg-black/40 px-4 py-3 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="terminal-button-solid mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                  >
                    {busy ? 'Unlocking…' : 'Unlock full results'}
                  </button>
                </form>
              ) : null}

              {step === 'unlocked' ? (
                <div className="rounded-2xl border border-metallic bg-black/40 p-5">
                  <p className="text-sm text-muted">
                    Set up ongoing monitoring for these {entityIds.length} entit{entityIds.length === 1 ? 'y' : 'ies'}.
                  </p>
                  <a href={pricingHref} className="terminal-button-solid mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold">
                    Set up monitoring → Pricing
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </div>

        <p className="mt-6 text-xs leading-5 text-muted">
          Records are allegations or administrative artifacts, not judgments. Research and business intelligence only;
          not legal, financial, credit, trading, or investment advice.
        </p>
      </section>
    </main>
  )
}
