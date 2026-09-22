#!/usr/bin/env node
/** Unit tests for CourtListener lien ingest helpers (no network). */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ingestPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../worker/ingest-cron.js')
const source = readFileSync(ingestPath, 'utf8')

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

check('lien source uses docket search type', () => {
  if (!source.includes("search_types: ['d', 'r']")) throw new Error('missing search_types d+r')
  if (!source.includes("slug: 'courtlistener-liens'")) throw new Error('missing lien source')
})

check('regional lien sources added to ingest', () => {
  for (const slug of ['texas-liens', 'florida-liens', 'california-liens']) {
    if (!source.includes(`slug: '${slug}'`)) throw new Error(`missing ${slug}`)
  }
})

check('lien source record_type is mechanics_lien', () => {
  const block = source.slice(source.indexOf("slug: 'courtlistener-liens'"), source.indexOf("slug: 'courtlistener-noi'"))
  if (!block.includes("record_type: 'mechanics_lien'")) throw new Error('lien source not mechanics_lien')
})

check('county lien sources added to ingest', () => {
  if (!source.includes("slug: 'cook-county-liens'")) throw new Error('missing cook county source')
  if (!source.includes("slug: 'ok-county-records'")) throw new Error('missing ok county source')
})

check('financialEventType classifies mechanics liens', () => {
  if (!source.includes('/mechanics lien|construction lien|mechanic\'?s lien/')) {
    throw new Error('missing mechanics lien classifier')
  }
})

check('fetchCourtListener no longer hardcodes opinions search', () => {
  if (source.includes("type: 'o', page_size: '20'")) throw new Error('still using opinions-only search')
})

if (failed) process.exit(1)
console.log('\nIngest lien helper tests passed.')
