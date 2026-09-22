#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  classifyWikiPage,
  cleanOrgName,
  looksLikePersonName,
  personQueryVariants,
  portraitCandidates,
  resolveFilerPortrait,
  safeWikiImageUrl,
  tickerLogoUrl,
  titleFits,
} from '../frontend/functions/lib/filer-portrait.js'

assert.equal(looksLikePersonName('April McClain Delaney'), true)
assert.equal(looksLikePersonName('Chopin Brian M'), true)
assert.equal(looksLikePersonName('HRT FINANCIAL L'), false)
assert.equal(looksLikePersonName(''), false)
assert.equal(cleanOrgName('HRT FINANCIAL L'), 'HRT FINANCIAL')
assert.equal(cleanOrgName('HR/A - Assenagon Asset Management S.A.'), 'Assenagon Asset Management S.A.')
assert.deepEqual(personQueryVariants('Chopin Brian M'), ['Chopin Brian M', 'Brian Chopin'])
assert.equal(titleFits('BlackRock', 'BlackRock'), true)
assert.equal(titleFits('Apple Inc', 'Banana Stand'), false)
assert.equal(
  safeWikiImageUrl('https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg'),
  'https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg',
)
assert.equal(
  safeWikiImageUrl('https://commons.wikimedia.org/wiki/Special:FilePath/BlackRock.png?width=330'),
  'https://commons.wikimedia.org/wiki/Special:FilePath/BlackRock.png?width=330',
)
assert.equal(tickerLogoUrl('hcc'), 'https://financialmodelingprep.com/image-stock/HCC.png')
assert.equal(tickerLogoUrl('AXIA3'), '')
assert.equal(safeWikiImageUrl('https://evil.example/x.jpg'), '')
assert.equal(safeWikiImageUrl('javascript:alert(1)'), '')
assert.equal(safeWikiImageUrl('https://financialmodelingprep.com/image-stock/../AAPL.png'), '')

const personPage = {
  type: 'standard',
  title: 'Tim Cook',
  description: 'American businessman and chief executive officer of Apple',
  extract: 'Timothy Donald Cook is an American business executive.',
  thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/t/tc/Tim_Cook.jpg' },
}
assert.equal(classifyWikiPage(personPage, 'person'), 'person')
assert.equal(classifyWikiPage({ ...personPage, type: 'disambiguation' }, 'person'), '')

const orgPage = {
  type: 'standard',
  title: 'BlackRock',
  description: 'American investment company',
  extract: 'BlackRock, Inc. is an American multinational investment company.',
  thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/b/br/BlackRock.jpg' },
}
assert.equal(classifyWikiPage(orgPage, 'org'), 'company')

const candidates = portraitCandidates({
  type: 'form_4',
  name: 'Tim Cook',
  issuer: 'Apple Inc',
  ticker: 'AAPL',
})
assert.ok(candidates.some((row) => row.role === 'person' && row.query === 'Tim Cook'))
assert.ok(candidates.some((row) => row.role === 'org' && /Apple/i.test(row.query)))
assert.ok(!candidates.some((row) => row.query === 'AAPL'))

const lockedCandidates = portraitCandidates({
  type: 'form_4',
  name: '',
  issuer: 'Apple Inc',
  ticker: 'AAPL',
})
assert.ok(!lockedCandidates.some((row) => row.role === 'person'))

const warnCandidates = portraitCandidates({
  type: 'warn_notice',
  name: 'Acme Industries',
  issuer: '',
  ticker: '',
})
assert.ok(warnCandidates.some((row) => row.role === 'org' && /Acme/i.test(row.query)))

const fetched = await resolveFilerPortrait(
  { type: 'form_4', name: 'Tim Cook', issuer: 'Apple Inc', ticker: 'AAPL' },
  async () =>
    new Response(JSON.stringify(personPage), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
)
assert.equal(fetched.kind, 'person')
assert.match(fetched.src, /upload\.wikimedia\.org/)

const miss = await resolveFilerPortrait(
  { type: 'form_4', name: '', issuer: '', ticker: '' },
  async () => {
    throw new Error('should not fetch')
  },
)
assert.equal(miss, null)

const logo = await resolveFilerPortrait(
  { type: 'form_4', name: '', issuer: 'BKV Corp', ticker: 'BKV' },
  async (url, init) => {
    if (String(url).includes('image-stock/BKV.png') && init?.method === 'HEAD') {
      return new Response(null, { status: 200, headers: { 'content-type': 'image/png' } })
    }
    return new Response('not found', { status: 404 })
  },
)
assert.equal(logo.kind, 'company')
assert.equal(logo.src, 'https://financialmodelingprep.com/image-stock/BKV.png')

const rejectedTicker = await resolveFilerPortrait(
  { type: 'form_4', name: '', issuer: '', ticker: 'XXXXX' },
  async (url, init) => {
    if (String(url).includes('image-stock/XXXXX.png') && init?.method === 'HEAD') {
      return new Response(null, { status: 404 })
    }
    return new Response('not found', { status: 404 })
  },
)
assert.equal(rejectedTicker, null)

console.log('Filer portrait resolver QA OK')
