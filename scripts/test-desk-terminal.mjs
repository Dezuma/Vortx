#!/usr/bin/env node
import {
  applyTradeListControls,
  deskBucket,
  deskMetricCounts,
  filterDeskEvents,
  formatCopySignal,
  groupDeskByRecency,
  groupDeskEntities,
  sortDeskGroups,
  watchlistEntityIdSet,
  youWereEarlyLabel,
  countBeatenTheNews,
} from '../frontend/functions/lib/desk-terminal.js'

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

const sample = [
  {
    id: '1',
    entity_id: 'ent-a',
    entity_name: 'Jane Executive',
    event_type: 'form_4',
    title: 'Form 4 insider filing: Jane Executive',
    filing_date: '2026-07-30',
    severity: 80,
    jurisdiction: 'US-SEC',
  },
  {
    id: '2',
    entity_id: 'ent-a',
    entity_name: 'Jane Executive',
    event_type: 'warn_notice',
    title: 'WARN notice: Example Co',
    filing_date: '2026-07-29',
    severity: 70,
    jurisdiction: 'TX',
  },
  {
    id: '3',
    entity_id: 'ent-b',
    entity_name: 'Rep. Example',
    event_type: 'congress_trade',
    title: 'STOCK Act disclosure: Rep. Example',
    filing_date: '2026-07-28',
    severity: 75,
  },
]

check('deskBucket classifies trading and distress', () => {
  if (deskBucket(sample[0]) !== 'insider') throw new Error('form_4')
  if (deskBucket(sample[1]) !== 'distress') throw new Error('warn')
  if (deskBucket(sample[2]) !== 'congress') throw new Error('congress')
})

check('deskMetricCounts happy path', () => {
  const counts = deskMetricCounts(sample)
  if (counts.all !== 3) throw new Error(`all ${counts.all}`)
  if (counts.insider !== 1 || counts.distress !== 1 || counts.congress !== 1) {
    throw new Error(JSON.stringify(counts))
  }
})

check('filterDeskEvents empty query returns all for bucket', () => {
  const rows = filterDeskEvents({ events: sample, bucket: 'insider', query: '' })
  if (rows.length !== 1) throw new Error(`expected 1 got ${rows.length}`)
})

check('filterDeskEvents query filters', () => {
  const rows = filterDeskEvents({ events: sample, bucket: 'all', query: 'rep. example' })
  if (rows.length !== 1 || rows[0].id !== '3') throw new Error('query miss')
})

check('filterDeskEvents watchlistOnly', () => {
  const rows = filterDeskEvents({
    events: sample,
    watchlistOnly: true,
    watchlistIds: ['ent-b'],
  })
  if (rows.length !== 1 || rows[0].entity_id !== 'ent-b') throw new Error('watchlist')
})

check('groupDeskEntities builds composite overlap', () => {
  const groups = groupDeskEntities(sample)
  if (groups.length !== 2) throw new Error(`groups ${groups.length}`)
  const composite = groups.find((g) => g.entityId === 'ent-a')
  if (!composite?.isComposite) throw new Error('expected composite')
  if (!String(composite.compositeLabel).includes('INSIDER')) throw new Error('badge')
  if (!String(composite.compositeLabel).includes('DISTRESS')) throw new Error('badge distress')
})

check('formatCopySignal uses present fields only', () => {
  const text = formatCopySignal(sample[0])
  if (!text.includes('VORTX SIGNAL')) throw new Error('prefix')
  if (!text.includes('Jane Executive')) throw new Error('name')
  if (/\$100k|bought \$/.test(text)) throw new Error('invented amount')
})

check('watchlistEntityIdSet reads member ids', () => {
  const set = watchlistEntityIdSet([
    { member_entity_ids: ['a', 'b'] },
    { entity_ids: ['b', 'c'] },
  ])
  if (set.size !== 3) throw new Error(`size ${set.size}`)
})

check('applyTradeListControls sorts by amount and filters side', () => {
  const rows = applyTradeListControls(
    [
      { id: 'a', amount: 100, filing_date: '2026-07-30', title: 'bought shares', signal_meta: { side: 'buy' } },
      { id: 'b', amount: 500, filing_date: '2026-07-29', title: 'sold shares', signal_meta: { side: 'sell' } },
      { id: 'c', amount: 50, filing_date: '2026-07-28', event_type: 'institutional_13f' },
    ],
    { sort: 'amount', side: 'sell' },
  )
  if (rows.length !== 1 || rows[0].id !== 'b') throw new Error('side/amount filter')
})

check('applyTradeListControls query matches ticker', () => {
  const rows = applyTradeListControls(
    [
      { id: 'a', title: 'Form 4', signal_meta: { ticker_label: 'AAPL' } },
      { id: 'b', title: 'Form 4', signal_meta: { ticker_label: 'MSFT' } },
    ],
    { query: 'aapl' },
  )
  if (rows.length !== 1 || rows[0].id !== 'a') throw new Error('ticker query')
})

check('groupDeskByRecency buckets today vs earlier', () => {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const older = new Date(today.getTime() - 20 * 86400000)
  const sections = groupDeskByRecency([
    { entityId: 't', events: [{ filing_date: today.toISOString() }] },
    { entityId: 'e', events: [{ filing_date: older.toISOString() }] },
  ])
  const todaySec = sections.find((s) => s.id === 'today')
  const earlier = sections.find((s) => s.id === 'earlier')
  if (!todaySec?.groups.some((g) => g.entityId === 't')) throw new Error('today bucket')
  if (!earlier?.groups.some((g) => g.entityId === 'e')) throw new Error('earlier bucket')
})

check('sortDeskGroups by severity', () => {
  const rows = sortDeskGroups(
    [
      { entityId: 'a', severityMax: 40, events: [{ filing_date: '2026-07-30' }] },
      { entityId: 'b', severityMax: 90, events: [{ filing_date: '2026-07-29' }] },
    ],
    'severity',
  )
  if (rows[0].entityId !== 'b') throw new Error('severity sort')
})

check('youWereEarlyLabel requires both timestamps and lag', () => {
  if (youWereEarlyLabel({ created_at: '2026-07-30T10:00:00Z' }) !== null) {
    throw new Error('missing news should be null')
  }
  if (
    youWereEarlyLabel({
      created_at: '2026-07-30T10:00:00Z',
      news_mentioned_at: '2026-07-30T10:30:00Z',
    }) !== null
  ) {
    throw new Error('sub-hour lag should be null')
  }
  const label = youWereEarlyLabel({
    detected_at: '2026-07-30T08:00:00Z',
    news_mentioned_at: '2026-07-30T14:00:00Z',
  })
  if (label !== 'You saw this 6 hours before the news') throw new Error(String(label))
})

check('youWereEarlyLabel uses filing-day anchor for same-day batch ingest', () => {
  const label = youWereEarlyLabel({
    created_at: '2026-08-06T19:17:38.818Z',
    detected_at: '2026-08-06T19:17:38.818Z',
    filing_date: '2026-08-06',
    news_mentioned_at: '2026-08-06T18:36:00.000Z',
  })
  if (!label || !/You saw this \d+ hours before the news/.test(label)) {
    throw new Error(String(label))
  }
})

check('countBeatenTheNews counts early filings', () => {
  const n = countBeatenTheNews([
    { detected_at: '2026-09-01T08:00:00Z', news_mentioned_at: '2026-09-01T14:00:00Z' },
    { detected_at: '2026-09-02T08:00:00Z', news_mentioned_at: '2026-09-02T09:00:00Z' },
    { created_at: '2026-09-03T10:00:00Z' },
  ])
  if (n !== 2) throw new Error(String(n))
})

check('countBeatenTheNews returns 0 when input is empty', () => {
  if (countBeatenTheNews([]) !== 0) throw new Error('empty should be 0')
  if (countBeatenTheNews(null) !== 0) throw new Error('null should be 0')
})

check('countBeatenTheNews skips rows that never beat the news', () => {
  const n = countBeatenTheNews([
    { created_at: '2026-09-01T10:00:00Z' },
    { detected_at: '2026-09-01T14:00:00Z', news_mentioned_at: '2026-09-01T14:30:00Z' },
  ])
  if (n !== 0) throw new Error(String(n))
})

if (failed) process.exit(1)
console.log('\nAll desk-terminal checks passed.')
