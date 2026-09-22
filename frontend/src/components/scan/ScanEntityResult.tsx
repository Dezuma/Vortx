import { motion } from 'framer-motion'
import type { ScanEntityResult as ScanEntityResultType } from '../../api'
import { LockedEventPreview } from './LockedEventPreview'

function eventLabel(value: string) {
  return value.replaceAll('_', ' ')
}

type ScanEntityResultProps = {
  result: ScanEntityResultType
  index: number
  upgradeHref?: string
}

export function ScanEntityResult({ result, index, upgradeHref = '/?view=pricing' }: ScanEntityResultProps) {
  const hasSignals = result.event_count_90d > 0
  const adjacentMessage =
    result.adjacent_signals?.message ||
    (hasSignals ? null : result.no_signals_message)

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.12 }}
      className="rounded-2xl border border-metallic bg-black/40 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="display-font text-2xl text-ink">{result.name}</h3>
          <p className="mt-1 text-sm text-muted">{result.jurisdiction || 'Unknown jurisdiction'}</p>
        </div>
        {hasSignals ? (
          <span className="data-font rounded-lg border border-terminal-blue/30 bg-terminal-blue/10 px-3 py-1.5 text-sm text-terminal-blue">
            {result.score}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">{result.headline}</p>

      {!hasSignals ? (
        <div className="mt-3 rounded-xl border border-metallic bg-black/30 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-soft">
            Scan result · monitored sources (90 days)
          </p>
          <p className="mt-2 text-sm leading-6 text-soft">{adjacentMessage}</p>
          {result.adjacent_signals?.count ? (
            <p className="mt-2 text-xs leading-5 text-muted">
              {result.no_signals_message}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(result.events_by_type).map(([type, count]) => (
              <span key={type} className="data-font rounded-full border border-metallic px-2.5 py-1 text-xs text-muted">
                {eventLabel(type)} · {count}
              </span>
            ))}
          </div>

          {result.top_event ? (
            <div className="mt-4 rounded-xl border border-metallic bg-black/45 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-soft">
                {result.teaser_unlocked ? 'Most recent high-severity record' : 'Record preview'}
              </p>
              {result.top_event.locked ? (
                <LockedEventPreview
                  recordType={result.top_event.record_type}
                  filingDate={result.top_event.filing_date}
                  jurisdiction={result.top_event.jurisdiction}
                  label="Top record"
                />
              ) : (
                <>
                  <p className="mt-2 text-sm font-medium text-ink">{result.top_event.title}</p>
                  {result.top_event.summary ? (
                    <p className="mt-2 text-sm leading-6 text-muted">{result.top_event.summary}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-soft">
                    {result.top_event.jurisdiction} · {result.top_event.record_type} · Filed{' '}
                    {result.top_event.filing_date || 'recent'} · Confidence {result.top_event.confidence}%
                  </p>
                </>
              )}
            </div>
          ) : null}

          {result.locked_summary ? (
            <p className="mt-3 text-sm text-accent">{result.locked_summary}</p>
          ) : null}

          {result.additional_events.length > 0 && result.teaser_unlocked ? (
            <div className="mt-3 space-y-2">
              {result.additional_events.map((event) =>
                event.locked ? (
                  <LockedEventPreview
                    key={event.id}
                    recordType={event.record_type}
                    filingDate={event.filing_date}
                    jurisdiction={event.jurisdiction}
                  />
                ) : (
                  <div key={event.id} className="rounded-xl border border-metallic bg-black/45 p-4">
                    <p className="text-sm font-medium text-ink">{event.title}</p>
                    <p className="mt-2 text-xs text-soft">
                      {event.jurisdiction} · {event.record_type} · Filed {event.filing_date || 'recent'}
                    </p>
                  </div>
                ),
              )}
            </div>
          ) : null}

          <a
            href={upgradeHref}
            className="terminal-button-solid mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Monitor this entity · Starter from $150/mo
          </a>
        </>
      )}
    </motion.article>
  )
}
