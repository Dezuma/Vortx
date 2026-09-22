#!/usr/bin/env node
import { scanLeadUseCase, scanLeadMetadata } from '../frontend/functions/lib/scan-lead.js'

const holdings = scanLeadUseCase('holdings')
const competitors = scanLeadUseCase('competitors')
if (holdings !== 'blind_spot_scan' || competitors !== 'blind_spot_scan') {
  throw new Error('unexpected use_case mapping')
}

const meta = scanLeadMetadata({
  entityIds: ['abc'],
  mode: 'holdings',
  scannedAt: '2026-06-30T00:00:00.000Z',
})
if (meta.scan_funnel !== 'blind_spot_scan' || meta.entity_ids.length !== 1) {
  throw new Error('unexpected metadata')
}

console.log('scan-lead tests passed')
