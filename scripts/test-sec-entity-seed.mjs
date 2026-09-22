#!/usr/bin/env node
import assert from 'node:assert/strict'
import { dedupeSecEntries, filterNewSecRows, secEntityRow } from '../worker/sec-entity-seed.js'
import { isValidTicker } from '../worker/match-ticker.js'

const row = secEntityRow({ ticker: 'AAPL', title: 'Apple Inc.' })
assert.ok(row)
assert.equal(row.ticker, 'AAPL')
assert.equal(row.canonical_name, 'Apple Inc.')
assert.equal(row.jurisdiction, 'US')

const deduped = dedupeSecEntries([
  { ticker: 'AAPL', title: 'Apple Inc.' },
  { ticker: 'AAPL', title: 'Apple Inc duplicate' },
])
assert.equal(deduped.length, 1)

const filtered = filterNewSecRows(deduped, new Set(['MSFT']))
assert.equal(filtered.length, 1)
assert.equal(filtered[0].ticker, 'AAPL')
assert.ok(isValidTicker('AAPL'))

console.log('sec-entity-seed tests passed')
