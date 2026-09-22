#!/usr/bin/env node
import { entityScanHeadline, assertCompliantCopy } from '../frontend/functions/lib/compliance-copy.js'

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

check('allows neutral headline', () => {
  const headline = entityScanHeadline('Example Holdings LLC', 3)
  if (!headline.includes('3 records')) throw new Error('unexpected headline shape')
})

check('allows entity names with forbidden substrings', () => {
  for (const name of ['Short Hills LLC', 'Trade Corp', 'Profit Partners', 'Buy More Inc']) {
    entityScanHeadline(name, 3)
    entityScanHeadline(name, 0)
  }
})

check('rejects forbidden headline terms', () => {
  let threw = false
  try {
    assertCompliantCopy('This company is a fraud', 'test')
  } catch {
    threw = true
  }
  if (!threw) throw new Error('expected forbidden_copy')
})

check('zero-signal message stays neutral', () => {
  const headline = entityScanHeadline('Stable Corp', 0)
  if (/recession-proof|guaranteed|safe/i.test(headline)) throw new Error('implied safety language')
})

if (failed) process.exit(1)
console.log('compliance-copy tests passed')
