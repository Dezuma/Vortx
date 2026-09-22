#!/usr/bin/env node
import {
  buildMarketingContext,
  FALLBACK_FEATURED,
  pickFeaturedSignal,
  summarizeRecentActivity,
} from '../frontend/functions/lib/marketing-context.js'

let failed = 0

function check(label, fn) {
  try {
    fn()
    console.log(`ok ${label}`)
  } catch (error) {
    failed += 1
    console.error(`fail ${label}:`, error instanceof Error ? error.message : error)
  }
}

check('picks named entity over locked rows', () => {
  const featured = pickFeaturedSignal({
    entities: [
      { id: 'a', canonical_name: 'Locked entity', jurisdiction: 'Court record (ILCB)' },
      { id: 'b', canonical_name: 'Variety Meat Co v. Ex-Cel Corned Beef Factory Corporation', jurisdiction: 'Court record (ILNB)' },
    ],
    events: [
      { entity_id: 'a', event_type: 'bankruptcy_docket', filing_date: '2026-07-07', severity: 90, jurisdiction: 'Court record (ILCB)' },
      { entity_id: 'b', event_type: 'bankruptcy_docket', filing_date: '2026-07-06', severity: 88, jurisdiction: 'Court record (ILNB)' },
    ],
    sources: [{ id: 's1', name: 'CourtListener RECAP Bankruptcy Dockets', record_type: 'bankruptcy_docket' }],
    scores: [{ entity_id: 'b', score: 88 }],
  })
  if (!featured.source_live) throw new Error('expected live featured signal')
  if (!featured.entity.includes('Variety Meat')) throw new Error('expected named entity')
  if (featured.filingDate !== '2026-07-06') throw new Error('expected filing date from event')
})

check('falls back when only locked entities exist', () => {
  const featured = pickFeaturedSignal({
    entities: [{ id: 'a', canonical_name: 'Locked entity', jurisdiction: 'Court record (ILCB)' }],
    events: [{ entity_id: 'a', event_type: 'bankruptcy_docket', filing_date: '2026-07-07', severity: 90 }],
    sources: [],
    scores: [],
  })
  if (featured.source_live) throw new Error('expected fallback featured signal')
  if (featured.entity !== FALLBACK_FEATURED.entity) throw new Error('expected Laurel Ridge fallback')
})

check('builds weekly stats headline from real counts', () => {
  const week = summarizeRecentActivity(
    [
      { entity_id: '1', event_type: 'warn_notice', filing_date: new Date().toISOString().slice(0, 10) },
      { entity_id: '2', event_type: 'bankruptcy_docket', filing_date: new Date().toISOString().slice(0, 10) },
    ],
    7,
  )
  if (week.records_surfaced_7d !== 2) throw new Error('expected 2 recent records')
  const featured = pickFeaturedSignal({
    entities: [
      { id: 'top', canonical_name: 'Central Falls Detention Facility Corporation', jurisdiction: 'RI' },
      { id: 'b', canonical_name: 'Variety Meat Co v. Ex-Cel Corned Beef Factory Corporation', jurisdiction: 'Court record (ILNB)' },
    ],
    events: [
      { entity_id: 'top', event_type: 'receivership', filing_date: '2026-07-08', severity: 93, jurisdiction: 'RI' },
      { entity_id: 'b', event_type: 'bankruptcy_docket', filing_date: '2026-07-06', severity: 88, jurisdiction: 'Court record (ILNB)' },
    ],
    sources: [{ id: 's1', name: 'CourtListener RECAP Bankruptcy Dockets', record_type: 'receivership' }],
    scores: [
      { entity_id: 'top', score: 93 },
      { entity_id: 'b', score: 88 },
    ],
  })
  const marketing = buildMarketingContext({
    companiesTracked: 10919,
    recordsSurfaced: 486,
    recordsSurfaced7d: week.records_surfaced_7d,
    companiesFlagged7d: week.companies_flagged_7d,
    warnNotices7d: week.warn_notices_7d,
    bankruptcyDockets7d: week.bankruptcy_dockets_7d,
    activeSources: 11,
    sourceFeeds: ['Texas WARN Notices', 'CourtListener RECAP Bankruptcy Dockets'],
    featured,
  })
  if (!marketing.stats_headline.includes('2 filings surfaced this week')) {
    throw new Error(`unexpected stats headline: ${marketing.stats_headline}`)
  }
  if (!featured.short_title) throw new Error('expected short_title on featured')
  if (!marketing.hero_relief.includes('Central Falls')) throw new Error('expected hero relief to use top-scored entity')
})

check('normalizes financial source record types for scoring parity', () => {
  const featured = pickFeaturedSignal({
    entities: [{ id: 'top', canonical_name: 'Central Falls Detention Facility Corporation', jurisdiction: 'RI' }],
    events: [
      {
        entity_id: 'top',
        event_type: 'civil_docket',
        source_id: 's1',
        filing_date: '2026-07-08',
        severity: 90,
        confidence: 80,
        updated_at: '2026-07-08T12:00:00Z',
        jurisdiction: 'RI',
      },
    ],
    sources: [{ id: 's1', name: 'CourtListener Receivership Records', record_type: 'receivership' }],
    scores: [{ entity_id: 'top', score: 90, confidence: 80 }],
  })
  if (featured.event_type !== 'receivership') throw new Error('expected receivership event type')
  if (!featured.short_title.includes('receivership')) throw new Error('expected receivership short title')
})

if (failed) process.exit(1)
console.log('marketing-context tests passed')
