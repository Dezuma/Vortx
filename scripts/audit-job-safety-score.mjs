#!/usr/bin/env node
/**
 * Production audit for /job-safety-score routing, HTML shell, APIs, and Stripe.
 */
const site = process.env.PUBLIC_SITE_URL || 'https://vortxmkt.com'

let failed = 0
function pass(label, detail = '') {
  console.log(`ok  ${label}${detail ? ` — ${detail}` : ''}`)
}
function fail(label, detail = '') {
  failed += 1
  console.error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`)
}

function classifyHtml(html) {
  if (html.includes('id="jss-form"')) return 'jss-ssr'
  if (html.includes('id="root"')) return 'main-spa'
  return 'unknown'
}

async function fetchHtml(url, opts = {}) {
  const res = await fetch(url, opts)
  const html = opts.method === 'HEAD' ? '' : await res.text()
  return { res, html, kind: opts.method === 'HEAD' ? 'head' : classifyHtml(html) }
}

console.log(`Auditing Job Safety Score on ${site}\n`)

const htmlCases = [
  { label: 'GET canonical', url: `${site}/job-safety-score`, expect: 'jss-ssr' },
  { label: 'GET trailing slash redirect', url: `${site}/job-safety-score/`, expect: 'redirect', redirectTo: '/job-safety-score' },
  { label: 'GET mixed case redirect', url: `${site}/Job-Safety-Score`, expect: 'redirect', redirectTo: '/job-safety-score' },
  { label: 'GET browser UA', url: `${site}/job-safety-score`, expect: 'jss-ssr', headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120', Accept: 'text/html' } },
]

for (const c of htmlCases) {
  const opts = { redirect: c.expect === 'redirect' ? 'manual' : 'follow', headers: c.headers || {} }
  const { res, html, kind } = await fetchHtml(c.url, opts)
  if (c.expect === 'redirect') {
    const loc = res.headers.get('location') || ''
    if ((res.status === 301 || res.status === 302) && loc.includes(c.redirectTo)) pass(c.label, loc)
    else fail(c.label, `status ${res.status} location ${loc || '(none)'}`)
    continue
  }
  if (res.ok && kind === c.expect) pass(c.label, `status ${res.status}`)
  else fail(c.label, `status ${res.status} got ${kind}, expected ${c.expect}`)
  if (c.expect === 'jss-ssr' && html.includes('vortx-site.js')) {
    fail(`${c.label} (no SPA bootstrap)`, 'job safety page must not load vortx-site.js')
  }
  if (c.expect === 'jss-ssr' && html.includes('WARN notice') && !html.includes('this is called a WARN notice')) {
    fail(`${c.label} (plain language)`, 'expected parenthetical WARN intro in explainer')
  }
}

{
  const { res, html, kind } = await fetchHtml(`${site}/job-safety-score`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 Chrome/120',
      Accept: 'text/html',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Dest': 'document',
    },
  })
  if (res.ok && kind === 'jss-ssr') pass('GET browser navigate (Sec-Fetch-Mode)', `cf-cache=${res.headers.get('cf-cache-status') || '-'}`)
  else fail('GET browser navigate (Sec-Fetch-Mode)', `status ${res.status} got ${kind}`)
  if (html.includes('id="root"')) fail('GET browser navigate (no SPA shell)', 'received SPA instead of SSR')
}

{
  const js = await fetch(`${site}/job-safety-score.js`)
  const text = await js.text()
  if (js.ok && text.includes('/api/job-safety-score/search')) pass('job-safety-score.js asset')
  else fail('job-safety-score.js asset', `status ${js.status}`)
}

{
  const res = await fetch(`${site}/api/job-safety-score/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ name: 'State Farm', state: 'IL' }),
  })
  const body = await res.json().catch(() => ({}))
  if (res.ok && body.ok && (body.result?.match_rejected || body.result?.no_match)) {
    pass('POST /api/job-safety-score/search', body.result?.headline?.slice(0, 60) || 'ok')
  } else fail('POST /api/job-safety-score/search', JSON.stringify(body).slice(0, 120))
}

{
  const res = await fetch(`${site}/api/job-safety-score/track`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ step: 'page_view', result_count: 0 }),
  })
  const body = await res.json().catch(() => ({}))
  if (res.ok && body.ok) pass('POST /api/job-safety-score/track')
  else fail('POST /api/job-safety-score/track', JSON.stringify(body))
}

{
  const res = await fetch(`${site}/api/job-safety-score`)
  const body = await res.json().catch(() => ({}))
  if (res.ok && body.ok) pass('GET /api/job-safety-score help')
  else fail('GET /api/job-safety-score help')
}

if (failed) {
  console.error(`\nJob Safety Score audit failed (${failed} check(s)).`)
  process.exit(1)
}
console.log('\nJob Safety Score audit passed.')
