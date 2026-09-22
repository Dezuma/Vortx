#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  clusterBuyTickers,
  extractTradeTicker,
  isMaterialDiscordTrade,
  isTradeBuy,
} from '../frontend/functions/lib/discord-trade-materiality.js'
import { resolveCaseDiscordChannelIds } from '../frontend/functions/lib/case-discord-targets.js'
import { pickCongressInsidersLead, pickMassLayoffsLead } from '../worker/discord-free-alpha.js'

const smallForm4 = {
  event_type: 'form_4',
  title: 'Form 4 insider filing: Jane Executive (XYZ)',
  summary: 'Transaction code: P. Amount/shares field on record: 12000. Ticker on record: XYZ.',
  amount: 12_000,
  severity: 70,
  ticker: 'XYZ',
  filing_date: '2026-09-04',
}

const bigForm4 = {
  event_type: 'form_4',
  title: 'Form 4 insider filing: Ford Motor Company (F) purchase',
  summary: 'Transaction code: P. Amount/shares field on record: 250000. Ticker on record: F.',
  amount: 250_000,
  severity: 84,
  ticker: 'F',
  filing_date: '2026-09-04',
}

const congressBig = {
  event_type: 'congress_trade',
  title: 'STOCK Act disclosure: Member · NVDA',
  summary: 'Amount field on record: 75000. purchase. Ticker on record: NVDA.',
  amount: 75_000,
  severity: 82,
  ticker: 'NVDA',
  filing_date: '2026-09-04',
}

assert.equal(extractTradeTicker(smallForm4), 'XYZ')
assert.equal(isTradeBuy(smallForm4), true)
assert.equal(isMaterialDiscordTrade(smallForm4).material, false)
assert.equal(isMaterialDiscordTrade(smallForm4).reason, 'below_threshold')
assert.equal(isMaterialDiscordTrade(bigForm4).reason, 'threshold')
assert.equal(isMaterialDiscordTrade(congressBig).material, true)
assert.equal(isMaterialDiscordTrade({ event_type: 'warn_notice', severity: 90 }).reason, 'not_a_trade')
assert.equal(
  isMaterialDiscordTrade({ event_type: 'institutional_13f', amount: 50_000_000, severity: 70 }).material,
  false,
)

const clusterPeers = [
  { ...smallForm4, entity_id: 'a', filing_date: '2026-09-03' },
  { ...smallForm4, entity_id: 'b', filing_date: '2026-09-04' },
  { ...smallForm4, entity_id: 'c', filing_date: '2026-09-04' },
]
assert.ok(clusterBuyTickers(clusterPeers).has('XYZ'))
assert.equal(isMaterialDiscordTrade(smallForm4, { peers: clusterPeers }).reason, 'cluster_buy')

const warnIds = resolveCaseDiscordChannelIds({ record_type: 'warn_notice' })
assert.ok(warnIds.includes('mass-layoffs'))
assert.ok(!warnIds.includes('alpha-feed'))

const smallTradeIds = resolveCaseDiscordChannelIds({
  record_type: 'form_4',
  source_fields: { amount: 12000, severity: 70, title: smallForm4.title, summary: smallForm4.summary },
})
assert.ok(!smallTradeIds.includes('alpha-feed'))
assert.ok(!smallTradeIds.includes('congress-and-insiders'))

const bigTradeIds = resolveCaseDiscordChannelIds({
  record_type: 'form_4',
  source_fields: {
    amount: 250000,
    severity: 84,
    title: bigForm4.title,
    summary: bigForm4.summary,
    ticker: 'F',
  },
})
assert.ok(bigTradeIds.includes('congress-and-insiders'))
assert.ok(bigTradeIds.includes('alpha-feed'))

const obscureWarn = pickMassLayoffsLead({
  signalCandidates: [
    {
      name: 'Regional Distributor LLC',
      event_type: 'warn_notice',
      score: 68,
      filingDate: '2026-09-01',
      workers: '40',
    },
  ],
})
assert.equal(obscureWarn?.name, 'Regional Distributor LLC')

const tinyCongress = pickCongressInsidersLead({
  signalCandidates: [
    {
      name: 'Unknown Person',
      event_type: 'congress_trade',
      score: 64,
      amount: 1000,
      filingDate: '2026-09-01',
      summary: 'PTR index row only.',
    },
  ],
})
assert.equal(tinyCongress, null)

const materialCongress = pickCongressInsidersLead({
  signalCandidates: [congressBig],
})
assert.equal(materialCongress?.event_type, 'congress_trade')

console.log('discord-trade-materiality: ok')
