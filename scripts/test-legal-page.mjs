#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { projectRoot } from './lib/supabase-pg.mjs'
import {
  API_RESEARCH_DISCLAIMER,
  DISCLAIMER_ONE_LINER,
  FCRA_PRODUCT_BANNER,
  LEGAL_PAGE,
  LEGAL_SECTIONS,
} from '../frontend/functions/lib/product-positioning.js'
import { CONTRACTOR_DISCLAIMER } from '../frontend/functions/lib/contractor-check.js'
import { JOB_SAFETY_DISCLAIMER } from '../frontend/functions/lib/job-safety-score.js'
import { LANDLORD_DISCLAIMER } from '../frontend/functions/lib/landlord-check.js'
import { renderLegalNoticeHtml } from '../worker/legal-page.js'

const root = projectRoot()
const bundle = readFileSync(resolve(root, 'frontend/.prod-reference.js'), 'utf8')
const site = readFileSync(resolve(root, 'frontend/public/vortx-site.js'), 'utf8')
const worker = readFileSync(resolve(root, 'worker/index.js'), 'utf8')
const sitemap = readFileSync(resolve(root, 'frontend/public/sitemap.xml'), 'utf8')
const contractorPage = readFileSync(resolve(root, 'worker/contractor-check-page.js'), 'utf8')
const landlordPage = readFileSync(resolve(root, 'worker/landlord-check-page.js'), 'utf8')
const layoffPage = readFileSync(resolve(root, 'worker/job-safety-score-page.js'), 'utf8')

assert.equal(LEGAL_SECTIONS.length, 16)
assert.match(DISCLAIMER_ONE_LINER, /Not a consumer report/)
assert.match(API_RESEARCH_DISCLAIMER, /Not a consumer report/)
assert.match(API_RESEARCH_DISCLAIMER, /See \/legal/)
assert.match(LEGAL_PAGE.closer, /you agree to this notice/)
assert.match(LEGAL_PAGE.closer, /If you do not agree, do not use the site/)
assert.equal(LEGAL_PAGE.contact, 'contact@vortxmkt.com')

const joined = LEGAL_SECTIONS.map((row) => `${row.title}\n${row.copy}`).join('\n')
assert.match(joined, /Fair Credit Reporting Act/)
assert.match(joined, /source of truth/)
assert.match(joined, /geocod/)
assert.match(joined, /automated assistance/)
assert.match(joined, /modeled heat/)
assert.match(joined, /not a broker-dealer/)
assert.match(joined, /Limitation of liability/i)
assert.match(joined, /three months before the claim/)
assert.match(joined, /Indemnification/)
assert.match(joined, /No government affiliation/)
assert.match(joined, /not directed to children/)
assert.match(joined, /tenant screen/)
assert.doesNotMatch(joined, /generates consistent alpha/)

for (const row of LEGAL_SECTIONS) {
  assert.ok(bundle.includes(row.title), `missing legal title: ${row.title}`)
  assert.ok(bundle.includes(row.copy.slice(0, 80)), `missing legal copy for: ${row.title}`)
}
assert.match(bundle, /className: `vortx-legal-page/)
assert.match(bundle, /path === `\/legal`/)
assert.match(bundle, /e === `legal`/)
assert.match(bundle, /href: `\/legal`/)
assert.match(bundle, /Not a consumer report/)
assert.match(bundle, /className: `vortx-legal-card`/)
assert.match(bundle, /vortx-legal-banner/)
assert.match(bundle, /mailto:contact@vortxmkt.com/)
assert.doesNotMatch(bundle, /Formal Terms of Service, subscriber agreements/)
assert.doesNotMatch(bundle, /generates consistent alpha/)

assert.match(site, /\.vortx-legal-card\{[^}]*background:#0b1220/)
assert.match(site, /\.vortx-legal-card p\{[^}]*color:#e2e8f0/)
assert.match(site, /\.vortx-legal-title\{[^}]*color:#f8fafc/)
assert.match(site, /\.vortx-legal-banner\{/)

assert.match(worker, /API_RESEARCH_DISCLAIMER/)
assert.match(worker, /isLegalPath/)
assert.match(sitemap, /https:\/\/vortxmkt.com\/legal/)

const html = renderLegalNoticeHtml()
assert.match(html, /<h1 id="vortx-legal-title">/)
assert.match(html, /mailto:contact@vortxmkt.com/)
assert.match(html, new RegExp(FCRA_PRODUCT_BANNER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
assert.match(html, /<script type="application\/ld\+json">/)
assert.doesNotMatch(html, /<script(?![^>]*application\/ld\+json)/)
for (const row of LEGAL_SECTIONS) {
  assert.ok(html.includes(row.title), `SSR missing title: ${row.title}`)
  assert.ok(html.includes(row.copy.slice(0, 60)), `SSR missing copy: ${row.title}`)
}

assert.doesNotMatch(contractorPage, /Background Check/)
assert.doesNotMatch(contractorPage, /Is this contractor legit/)
assert.match(contractorPage, /href="\/legal"/)
assert.match(contractorPage, /FCRA_PRODUCT_BANNER/)
assert.match(landlordPage, /href="\/legal"/)
assert.match(landlordPage, /not a tenant-screening/)
assert.match(layoffPage, /href="\/legal"/)
assert.match(layoffPage, /FCRA_PRODUCT_BANNER/)

for (const text of [CONTRACTOR_DISCLAIMER, JOB_SAFETY_DISCLAIMER, LANDLORD_DISCLAIMER]) {
  assert.match(text, /Not a consumer report/)
  assert.match(text, /FCRA/)
}

console.log('Legal page + FCRA disclaimer QA OK')
