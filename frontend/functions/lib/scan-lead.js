/** Maps scan funnel to sales_leads.use_case (blind_spot_scan allowed after migration). */
export function scanLeadUseCase(_mode) {
  return 'blind_spot_scan'
}

export function scanLeadMetadata({ entityIds, mode, scannedAt, extra = {} }) {
  return {
    scan_funnel: 'blind_spot_scan',
    entity_ids: entityIds,
    scanned_at: scannedAt,
    mode: mode === 'competitors' ? 'competitors' : 'holdings',
    results_viewed: true,
    ...extra,
  }
}
