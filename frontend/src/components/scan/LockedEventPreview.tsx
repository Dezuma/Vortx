type LockedEventPreviewProps = {
  recordType: string
  filingDate: string | null
  jurisdiction: string | null
  label?: string
}

export function LockedEventPreview({ recordType, filingDate, jurisdiction, label }: LockedEventPreviewProps) {
  return (
    <div className="rounded-xl border border-metallic bg-black/50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-soft">{label || 'Additional record'}</p>
      <p className="mt-2 text-sm capitalize text-muted blur-[3px] select-none">{recordType}</p>
      <p className="mt-1 text-xs text-soft blur-[3px] select-none">
        {jurisdiction || 'jurisdiction'} · Filed {filingDate || 'recent'}
      </p>
      <p className="mt-3 text-xs text-accent">Unlock to view full record detail</p>
    </div>
  )
}
