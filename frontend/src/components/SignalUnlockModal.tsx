import type { PublicSignal } from '../api'
import { startCheckout } from '../lib/checkout'

function compactName(name: string) {
  return name.replace(/\s*\(In re .+?\)$/i, '').replace(/^In re\s+/i, '').trim()
}

type SignalUnlockModalProps = {
  signal: PublicSignal | null
  onClose: () => void
}

export function SignalUnlockModal({ signal, onClose }: SignalUnlockModalProps) {
  if (!signal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6">
        <p className="eyebrow">Source document locked</p>
        <h3 className="display-font mt-3 text-4xl text-ink">Subscribe to view source document.</h3>
        <p className="mt-3 text-sm leading-6 text-muted">
          You can see the signal exists: {compactName(signal.entity_name)} · {signal.record_type} · filed{' '}
          {signal.filing_date ?? 'recent'} · {signal.jurisdiction}. Subscribers unlock the source URL, full timeline,
          watchlist alerts, and CSV export.
        </p>
        <div className="mt-4 rounded-xl border border-metallic bg-black/50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-soft">Blurred source hint</p>
          <p className="mt-2 font-mono text-lg text-ink blur-[4px] select-none">
            {signal.source_domain_hint || 'source document/...'}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void startCheckout('supernova')}
            className="terminal-button-solid rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Subscribe to unlock
          </button>
          <button
            type="button"
            onClick={onClose}
            className="terminal-button rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  )
}
