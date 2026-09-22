import type { PublicSignal } from '../api'

function scoreTone(score: number) {
  if (score >= 80) return 'border-rose-400/30 bg-rose-950/30 text-rose-100'
  if (score >= 65) return 'border-amber-400/30 bg-amber-950/30 text-amber-100'
  return 'border-slate-500/20 bg-slate-900/50 text-slate-200'
}

function compactName(name: string) {
  return name.replace(/\s*\(In re .+?\)$/i, '').replace(/^In re\s+/i, '').trim()
}

type SignalCardProps = {
  signal: PublicSignal
  onUnlockClick: (signal: PublicSignal) => void
}

export function SignalCard({ signal, onUnlockClick }: SignalCardProps) {
  return (
    <article className="rounded-2xl border border-metallic bg-black/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="display-font text-xl text-ink">{compactName(signal.entity_name)}</p>
          <p className="mt-1 text-sm capitalize text-muted">
            {signal.ticker ? `${signal.ticker} · ` : ''}
            {signal.record_type} · {signal.jurisdiction} · Filed {signal.filing_date ?? 'recent'}
          </p>
        </div>
        <span className={`rounded-lg border px-3 py-1.5 font-mono text-sm ${scoreTone(signal.score)}`}>
          {signal.score}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-metallic bg-black/45 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-soft">Free now</p>
          <p className="mt-1 text-sm text-muted">{signal.free_value}</p>
        </div>
        <div className="rounded-xl border border-terminal-blue/30 bg-terminal-blue/10 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Subscriber unlock</p>
          <p className="mt-1 text-sm text-muted">{signal.subscriber_unlocks.slice(0, 3).join(', ')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onUnlockClick(signal)}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-metallic bg-black/50 px-3 py-2.5 text-left transition duration-700 hover:border-terminal-blue/50"
      >
        <span>
          <span className="block text-xs uppercase tracking-[0.2em] text-soft">Locked source URL</span>
          <span className="mt-1 block font-mono text-sm text-ink blur-[3px] select-none">
            {signal.source_domain_hint || 'source document/...'}
          </span>
        </span>
        <span className="rounded-full border border-accent/35 px-2.5 py-1 text-xs text-accent">
          Subscribe to unlock
        </span>
      </button>
      <button
        type="button"
        onClick={() => onUnlockClick(signal)}
        className="terminal-button mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-medium"
      >
        Open source URL + full timeline
      </button>
    </article>
  )
}
