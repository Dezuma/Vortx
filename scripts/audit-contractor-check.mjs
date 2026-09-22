#!/usr/bin/env node
/**
 * Thorough production audit for /contractor-check routing, HTML shell, APIs, and Stripe.
 * Exit 1 on any failure. Does not print secrets.
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
  if (html.includes('id="contractor-form"')) return 'contractor-ssr'
  if (html.includes('id="root"')) return 'main-spa'
  return 'unknown'
}

async function fetchHtml(url, opts = {}) {
  const res = await fetch(url, opts)
  const html = opts.method === 'HEAD' ? '' : await res.text()
  return { res, html, kind: opts.method === 'HEAD' ? 'head' : classifyHtml(html) }
}

console.log(`Auditing Contractor Check on ${site}\n`)

// --- HTML routing ---
const htmlCases = [
  { label: 'GET canonical', url: `${site}/contractor-check`, expect: 'contractor-ssr' },
  { label: 'GET trailing slash redirect', url: `${site}/contractor-check/`, expect: 'redirect', redirectTo: '/contractor-check' },
  { label: 'GET mixed case redirect', url: `${site}/Contractor-Check`, expect: 'redirect', redirectTo: '/contractor-check' },
  { label: 'GET browser UA', url: `${site}/contractor-check`, expect: 'contractor-ssr', headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120', Accept: 'text/html' } },
  { label: 'GET homepage (control)', url: `${site}/`, expect: 'main-spa' },
]

for (const c of htmlCases) {
  const opts = { redirect: c.expect === 'redirect' ? 'manual' : 'follow', headers: c.headers || {} }
  const { res, html, kind } = await fetchHtml(c.url, opts)
  if (c.expect === 'redirect') {
    const loc = res.headers.get('location') || ''
    if ((res.status === 301 || res.status === 302) && loc.includes(c.redirectTo)) {
      pass(c.label, loc)
    } else {
      fail(c.label, `status ${res.status} location ${loc || '(none)'}`)
    }
    continue
  }
  if (res.ok && kind === c.expect) {
    pass(c.label, `status ${res.status}`)
  } else {
    fail(c.label, `status ${res.status} got ${kind}, expected ${c.expect}`)
  }
  if (c.expect === 'contractor-ssr' && html.includes('vortx-site.js')) {
    fail(`${c.label} (no SPA bootstrap)`, 'contractor page must not load vortx-site.js')
  }
}

// Browser document navigations must hit the Worker SSR route, not the SPA asset fallback.
{
  const { res, html, kind } = await fetchHtml(`${site}/contractor-check`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Site': 'none',
    },
  })
  const cfCache = res.headers.get('cf-cache-status') || '-'
  if (res.ok && kind === 'contractor-ssr') {
    pass('GET browser navigate (Sec-Fetch-Mode)', `cf-cache-status=${cfCache}`)
  } else {
    fail('GET browser navigate (Sec-Fetch-Mode)', `status ${res.status} got ${kind} cf-cache=${cfCache}`)
  }
  if (html.includes('vortx-site.js') || html.includes('id="root"')) {
    fail('GET browser navigate (no SPA shell)', 'received main app index.html instead of contractor SSR')
  }
}

// HEAD must not return SPA shell headers/content-type from index.html fallback
{
  const headRes = await fetch(`${site}/contractor-check`, { method: 'HEAD' })
  const cc = headRes.headers.get('cache-control') || ''
  const ct = headRes.headers.get('content-type') || ''
  if (headRes.ok && ct.includes('text/html') && cc.includes('no-store')) {
    pass('HEAD canonical', `cache-control=${cc}`)
  } else {
    fail('HEAD canonical', `status ${headRes.status} ct=${ct} cache-control=${cc}`)
  }
}

// Static assets
{
  const js = await fetch(`${site}/contractor-check.js`)
  const text = await js.text()
  if (js.ok && text.includes('/api/contractor-check/search')) pass('contractor-check.js asset')
  else fail('contractor-check.js asset', `status ${js.status}`)
}

{
  const bootstrap = await fetch(`${site}/vortx-site.js`)
  const text = await bootstrap.text()
  if (bootstrap.ok && !text.includes('vortx_ssr=')) {
    pass('vortx-site.js (no broken vortx_ssr redirect)')
  } else {
    fail('vortx-site.js (no broken vortx_ssr redirect)', 'vortx_ssr redirect still present')
  }
}

// --- API ---
const searchRes = await fetch(`${site}/api/contractor-check/search`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'State Farm', state: 'IL' }),
})
const searchBody = await searchRes.json().catch(() => ({}))
if (searchRes.ok && searchBody.ok && searchBody.result && typeof searchBody.result.has_records === 'boolean') {
  pass('POST /api/contractor-check/search', searchBody.result.headline?.slice(0, 70) || '')
} else {
  fail('POST /api/contractor-check/search', searchBody.error || searchRes.status)
}

const trackRes = await fetch(`${site}/api/contractor-check/track`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ step: 'page_view' }),
})
if (trackRes.ok) pass('POST /api/contractor-check/track')
else fail('POST /api/contractor-check/track', trackRes.status)

const helpRes = await fetch(`${site}/api/contractor-check`)
const helpBody = await helpRes.json().catch(() => ({}))
if (helpRes.ok && helpBody.ok) pass('GET /api/contractor-check help')
else fail('GET /api/contractor-check help', helpRes.status)

const checkoutRes = await fetch(`${site}/api/stripe-checkout`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    plan: 'contractor_unlock',
    acceptable_use_accepted: true,
    entity_ids: ['00000000-0000-0000-0000-000000000001'],
    return_path: '/contractor-check',
  }),
})
const checkoutBody = await checkoutRes.json().catch(() => ({}))
if (checkoutRes.ok && checkoutBody.ok && checkoutBody.url?.includes('checkout.stripe.com')) {
  pass('POST stripe-checkout contractor_unlock', 'Stripe session URL returned')
} else if (checkoutBody.error === 'missing_price') {
  fail('POST stripe-checkout contractor_unlock', 'STRIPE_CONTRACTOR_CHECK_PRICE_ID missing on worker')
} else {
  fail('POST stripe-checkout contractor_unlock', checkoutBody.error || checkoutRes.status)
}

console.log('')
if (failed) {
  console.error(`Contractor Check audit failed (${failed} issue(s)).`)
  process.exit(1)
}
console.log('Contractor Check audit passed.')
