#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { projectRoot } from './lib/supabase-pg.mjs'
import { SOCIAL_CARD_VERSION, socialCardUrl, socialImageMetaTags } from '../frontend/functions/lib/social-card.js'

const root = projectRoot()
const png = readFileSync(resolve(root, 'frontend/public/social-card.png'))
assert.equal(png.readUInt32BE(16), 1200)
assert.equal(png.readUInt32BE(20), 630)
assert.ok(png.byteLength > 100_000, 'card should have real pixels, not the old empty panel')

const html = readFileSync(resolve(root, 'scripts/ensure-patched-dist.mjs'), 'utf8')
assert.match(html, /socialCardUrl\(\)/)
assert.match(html, /SHARE_COPY\.title/)
assert.match(html, /SHARE_COPY\.description/)

const positioning = readFileSync(resolve(root, 'frontend/functions/lib/product-positioning.js'), 'utf8')
assert.match(positioning, /See Congress and insider stock trades/)
assert.doesNotMatch(positioning, /Catch the filing before the headline/)

const cardSvg = readFileSync(resolve(root, 'frontend/public/social-card.svg'), 'utf8')
assert.match(cardSvg, /See Congress and/)
assert.match(cardSvg, /insider stock trades/)
assert.doesNotMatch(cardSvg, /Catch the filing/)

const cases = readFileSync(resolve(root, 'worker/case-pages.js'), 'utf8')
assert.match(cases, /socialImageMetaTags/)

const legal = readFileSync(resolve(root, 'worker/legal-page.js'), 'utf8')
assert.match(legal, /socialImageMetaTags/)

assert.equal(socialCardUrl(), `https://vortxmkt.com/social-card.png?v=${SOCIAL_CARD_VERSION}`)
assert.match(socialImageMetaTags(), /twitter:card/)
assert.match(socialImageMetaTags(), /og:image:alt/)
assert.match(socialImageMetaTags(), /see Congress and insider stock trades/)
assert.match(socialImageMetaTags(), new RegExp(`social-card\\.png\\?v=${SOCIAL_CARD_VERSION}`))

console.log('Social card OG QA OK')
