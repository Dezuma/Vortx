#!/usr/bin/env node
import {
  buildCoverageQuery,
  detectionTimestamp,
  enrichEventsWithNewsCoverage,
  isFilingRelevantItem,
} from '../frontend/functions/lib/news-coverage.js'

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

check('buildCoverageQuery uses ticker and filing terms', () => {
  const q = buildCoverageQuery({
    event_type: 'form_4',
    signal_meta: { ticker_label: 'AAPL', filer_label: 'Jane Executive' },
  })
  if (!q.includes('AAPL')) throw new Error(q)
  if (!/Form 4|insider|SEC/.test(q)) throw new Error(q)
})

check('detectionTimestamp prefers detected_at when not same-day batch lag', () => {
  const value = detectionTimestamp({
    detected_at: '2026-07-29T08:00:00Z',
    created_at: '2026-07-29T09:00:00Z',
    filing_date: '2026-07-28',
  })
  if (value !== '2026-07-29T08:00:00Z') throw new Error(String(value))
})

check('detectionTimestamp uses filing-day anchor for same-day batch ingest', () => {
  const value = detectionTimestamp({
    detected_at: '2026-08-06T19:17:38.818Z',
    created_at: '2026-08-06T19:17:38.818Z',
    filing_date: '2026-08-06',
  })
  if (value !== '2026-08-06T14:00:00.000Z') throw new Error(String(value))
})

check('buildCoverageQuery parses ticker from Form 4 title when meta blank', () => {
  const q = buildCoverageQuery({
    event_type: 'form_4',
    title: 'Form 4 insider filing: FARRELL PETER C (RMD) sale',
    summary: 'Issuer on record: RESMED INC. Ticker on record: RMD.',
  })
  if (!q || !q.includes('RMD')) throw new Error(String(q))
})

check('rejects generic dividend / analyst roundups', () => {
  const event = {
    event_type: 'form_4',
    signal_meta: { ticker_label: 'TSBK', filer_label: 'Pat Insider' },
  }
  const ok = isFilingRelevantItem(
    {
      title: '3 Dividend Stocks Ready to Pay You – If You Buy Them This Week',
      description: 'TSBK looks attractive for income investors',
      blob: '3 dividend stocks ready to pay you – if you buy them this week tsbk looks attractive for income investors',
    },
    event,
  )
  if (ok) throw new Error('generic roundup should fail')
})

check('rejects wrong-company ticker collision', () => {
  const event = {
    event_type: 'form_4',
    signal_meta: { ticker_label: 'PSUS', filer_label: 'Someone' },
  }
  const ok = isFilingRelevantItem(
    {
      title: 'Playtika Holding Corp. (PLTK) CEO awarded RSUs and new PSUs',
      description: 'equity awards',
      blob: 'playtika holding corp. (pltk) ceo awarded rsus and new psus equity awards',
    },
    event,
  )
  if (ok) throw new Error('PLTK article should not match PSUS')
})

check('rejects PSUs jargon colliding with PSUS ticker', () => {
  const event = {
    event_type: 'form_4',
    title: 'Form 4 insider filing: TEACHER RETIREMENT SYSTEM OF TEXAS (PSUS) sale',
    signal_meta: { ticker_label: 'PSUS', filer_label: 'TEACHER RETIREMENT SYSTEM OF TEXAS' },
  }
  const ok = isFilingRelevantItem(
    {
      title: 'Playtika Holding Corp. (PLTK) grants RSUs and PSUs to legal officer',
      description: 'Stock Titan',
      blob: 'playtika holding corp. (pltk) grants rsus and psus to legal officer stock titan',
    },
    event,
  )
  if (ok) throw new Error('PSUs jargon should not match PSUS ticker')
})

check('accepts filing-relevant insider sale headline', () => {
  const event = {
    event_type: 'form_4',
    signal_meta: { ticker_label: 'PBF', filer_label: 'Senior VP' },
  }
  const ok = isFilingRelevantItem(
    {
      title: 'Should You Sell PBF Energy Stock After a Senior VP Offloaded 24,700 Shares?',
      description: 'insider sold shares after Form 4 filing',
      blob: 'should you sell pbf energy stock after a senior vp offloaded 24,700 shares? insider sold shares after form 4 filing',
    },
    event,
  )
  if (!ok) throw new Error('insider sale headline should pass')
})

check('accepts STOCK Act congress coverage', () => {
  const event = {
    event_type: 'congress_trade',
    signal_meta: { filer_label: 'Rep. Jane Doe', ticker_label: 'AAPL' },
  }
  const ok = isFilingRelevantItem(
    {
      title: 'Rep. Jane Doe disclosed AAPL trade under STOCK Act',
      description: 'Congressional disclosure',
      blob: 'rep. jane doe disclosed aapl trade under stock act congressional disclosure',
    },
    event,
  )
  if (!ok) throw new Error('congress headline should pass')
})

try {
  const events = [
    {
      id: 'e1',
      event_type: 'form_4',
      created_at: '2026-07-30T08:00:00Z',
      signal_meta: { ticker_label: 'PBF', filer_label: 'Pat Insider' },
    },
  ]
  const goodRss = `<?xml version="1.0"?><rss><channel>
    <item><title>PBF insider sold shares in Form 4 filing</title><description>Officer disposed of stock</description>
    <pubDate>Thu, 30 Jul 2026 14:00:00 GMT</pubDate></item>
    <item><title>Top Analyst Reports for Broadcom, Coca-Cola & Palantir</title><description>PBF mentioned in passing</description>
    <pubDate>Thu, 30 Jul 2026 15:00:00 GMT</pubDate></item>
  </channel></rss>`
  const enriched = await enrichEventsWithNewsCoverage(events, {
    maxEvents: 1,
    concurrency: 1,
    budgetMs: 2000,
    fetchImpl: async () => new Response(goodRss, { status: 200 }),
    cacheApi: null,
  })
  if (!enriched[0].news_mentioned_at) throw new Error('missing news stamp')
  if (!/form 4|insider|sold shares/i.test(enriched[0].signal_meta.coverage_title || '')) {
    throw new Error(`bad title ${enriched[0].signal_meta.coverage_title}`)
  }
  console.log('ok enrich keeps only filing-relevant hit')
} catch (error) {
  failed += 1
  console.error(
    'fail enrich keeps only filing-relevant hit:',
    error instanceof Error ? error.message : error,
  )
}

try {
  const events = [
    {
      id: 'e2',
      event_type: 'form_4',
      created_at: '2026-07-30T08:00:00Z',
      signal_meta: { ticker_label: 'TSBK', filer_label: 'Pat Insider' },
    },
  ]
  const badRss = `<?xml version="1.0"?><rss><channel>
    <item><title>3 Dividend Stocks Ready to Pay You</title><description>TSBK looks cheap</description>
    <pubDate>Thu, 30 Jul 2026 14:00:00 GMT</pubDate></item>
  </channel></rss>`
  const enriched = await enrichEventsWithNewsCoverage(events, {
    maxEvents: 1,
    concurrency: 1,
    budgetMs: 2000,
    fetchImpl: async () => new Response(badRss, { status: 200 }),
    cacheApi: null,
  })
  if (enriched[0].news_mentioned_at) throw new Error('generic news should not stamp')
  console.log('ok enrich ignores generic ticker news')
} catch (error) {
  failed += 1
  console.error(
    'fail enrich ignores generic ticker news:',
    error instanceof Error ? error.message : error,
  )
}

if (failed) process.exit(1)
console.log('\nAll news-coverage checks passed.')
