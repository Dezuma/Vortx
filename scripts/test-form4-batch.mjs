#!/usr/bin/env node
/**
 * Form 4 ingest caps ownership XML fetches, but Atom rows past the cap
 * must still be stored. Otherwise they age out of EDGAR's current feed.
 */
import assert from 'node:assert/strict'
import { assembleForm4IngestEntries } from '../worker/ingest-cron.js'

const entries = Array.from({ length: 80 }, (_, index) => ({
  id: `atom-${index + 1}`,
  companyName: `Filer ${index + 1}`,
}))
const enriched = entries.slice(0, 50).map((entry) => ({
  ...entry,
  ownership_enriched: true,
}))

const batch = assembleForm4IngestEntries(entries, enriched)
assert.equal(batch.length, 80)
assert.equal(batch[0].id, 'atom-1')
assert.equal(batch[0].ownership_enriched, true)
assert.equal(batch[49].ownership_enriched, true)
assert.equal(batch[50].id, 'atom-51')
assert.equal(batch[50].ownership_enriched, undefined)
assert.equal(batch[79].id, 'atom-80')
assert.equal(batch[79].companyName, 'Filer 80')

const covered = assembleForm4IngestEntries(entries.slice(0, 10), enriched.slice(0, 10))
assert.equal(covered.length, 10)
assert.equal(covered[9].id, 'atom-10')

assert.deepEqual(assembleForm4IngestEntries([], []), [])
assert.deepEqual(assembleForm4IngestEntries(null, [{ id: 'x' }]), [])

const extra = assembleForm4IngestEntries(entries.slice(0, 2), enriched.slice(0, 4))
assert.equal(extra.length, 2)
assert.equal(extra[1].id, 'atom-2')

console.log('form 4 batch tests passed')
