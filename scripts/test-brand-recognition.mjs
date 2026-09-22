import assert from 'node:assert/strict'
import {
  filterHighlyRecognized,
  hasValidMarketTicker,
  isHighlyRecognizedBrand,
  matchesHouseholdBrand,
  recognitionBoost,
} from '../worker/brand-recognition.js'
import {
  filterByMarketingDedup,
  isRecentlyPosted,
  marketingDedupKey,
} from '../worker/marketing-dedup.js'

assert.equal(isHighlyRecognizedBrand({ name: 'Starbucks Corporation' }), true)
assert.equal(isHighlyRecognizedBrand({ name: 'Republic National Distributing Company LLC' }), false)
assert.equal(isHighlyRecognizedBrand({ name: 'Acme Regional Distributors LLC' }), false)
assert.equal(isHighlyRecognizedBrand({ name: 'Obscure Holdings LLC', ticker: 'F' }), true)
assert.equal(hasValidMarketTicker({ ticker: 'WMT' }), true)
assert.equal(hasValidMarketTicker({ ticker: 'LLC' }), false)
assert.equal(matchesHouseholdBrand({ name: 'Target Corp' }), true)
assert.equal(isHighlyRecognizedBrand({ name: 'Birdsell v. JPMORGAN CHASE BANK, NATIONAL ASSOCIATION' }), false)
assert.equal(recognitionBoost({ name: 'Republic National Distributing Company LLC' }), 0)
assert.equal(recognitionBoost({ name: 'Ford Motor Company', ticker: 'F' }), 55)

const pool = filterHighlyRecognized([
  { name: 'Republic National Distributing Company LLC', entity_id: 'r1' },
  { name: 'Starbucks Corporation', entity_id: 's1' },
  { name: 'Local Wholesale LLC', entity_id: 'l1', ticker: 'XYZ' },
])
assert.deepEqual(
  pool.map((row) => row.name),
  ['Starbucks Corporation', 'Local Wholesale LLC'],
)

const key = marketingDedupKey({
  entity_id: 'abc',
  event_type: 'warn_notice',
  filingDate: '2026-04-23',
})
assert.equal(key, 'abc|warn_notice|2026-04-23')
assert.equal(
  isRecentlyPosted(key, [{ key, postedAt: Date.now() - 2 * 86_400_000 }], 14),
  true,
)
assert.equal(
  isRecentlyPosted(key, [{ key, postedAt: Date.now() - 20 * 86_400_000 }], 14),
  false,
)

const deduped = filterByMarketingDedup(
  [
    { name: 'Starbucks Corporation', entity_id: 's1', event_type: 'warn_notice', filingDate: '2026-04-23' },
    { name: 'Ford Motor Company', entity_id: 'f1', event_type: 'warn_notice', filingDate: '2026-05-01' },
  ],
  [{ key: 's1|warn_notice|2026-04-23', postedAt: Date.now() }],
  14,
)
assert.equal(deduped.length, 1)
assert.equal(deduped[0].name, 'Ford Motor Company')

console.log('brand-recognition: ok')
