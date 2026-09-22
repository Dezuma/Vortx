import assert from 'node:assert/strict'
import {
  findBestTickerMatch,
  isValidTicker,
  matchConfidence,
  normalizeCompanyName,
} from '../worker/match-ticker.js'

const entries = [
  { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
  { cik_str: 789019, ticker: 'MSFT', title: 'MICROSOFT CORP' },
  { cik_str: 1045810, ticker: 'NVDA', title: 'NVIDIA CORP' },
  { cik_str: 1652044, ticker: 'GOOGL', title: 'Alphabet Inc.' },
]

assert.equal(normalizeCompanyName('Blue Harbor Construction LLC'), 'blue harbor construction')
assert.equal(findBestTickerMatch('Apple Inc.', entries), 'AAPL')
assert.equal(findBestTickerMatch('Microsoft Corporation', entries), 'MSFT')
assert.equal(findBestTickerMatch('Totally Unrelated Widgets LLC', entries), null)
assert.equal(isValidTicker('BRK.B'), true)
assert.equal(isValidTicker('bad ticker'), false)

const appleScore = matchConfidence('Apple Inc.', 'Apple Inc.')
const googleScore = matchConfidence('Apple Inc.', 'Alphabet Inc.')
assert.equal(appleScore, 1)
assert.ok(googleScore < 0.88)

assert.equal(findBestTickerMatch('Apple', entries), null, 'short ambiguous names should not match')

console.log(JSON.stringify({ ok: true, checks: 8 }, null, 2))
