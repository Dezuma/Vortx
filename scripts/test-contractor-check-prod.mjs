#!/usr/bin/env node
/** Smoke-test /contractor-check page and API on production. */
const site = process.env.PUBLIC_SITE_URL || 'https://vortxmkt.com'

let failed = 0
function pass(label, detail = '') {
  console.log(`ok ${label}${detail ? `: ${detail}` : ''}`)
}
function fail(label, detail = '') {
  failed += 1
  console.error(`fail ${label}${detail ? `: ${detail}` : ''}`)
}

const pageRes = await fetch(`${site}/contractor-check`)
const pageHtml = await pageRes.text()
if (pageRes.ok && pageHtml.includes('Check now') && pageHtml.includes('Contractor Check')) {
  pass('SSR page', `${pageRes.status}`)
} else {
  fail('SSR page', `status ${pageRes.status}`)
}

const slashRes = await fetch(`${site}/contractor-check/`, { redirect: 'manual' })
if (slashRes.status === 301 && slashRes.headers.get('location')?.includes('/contractor-check')) {
  pass('trailing slash redirect', slashRes.headers.get('location') || '301')
} else {
  fail('trailing slash redirect', `status ${slashRes.status}`)
}

if (pageHtml.includes('FAQPage') && pageHtml.includes('How do I research public filings on a contractor name')) {
  pass('FAQ schema present')
} else {
  fail('FAQ schema present')
}

const scriptRes = await fetch(`${site}/contractor-check.js`)
if (scriptRes.ok && (await scriptRes.text()).includes('contractor-check/search')) {
  pass('client script')
} else {
  fail('client script', `status ${scriptRes.status}`)
}

const searchRes = await fetch(`${site}/api/contractor-check/search`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'State Farm', state: 'IL' }),
})
const searchBody = await searchRes.json().catch(() => ({}))
if (searchRes.ok && searchBody.ok && searchBody.result && typeof searchBody.result.has_records === 'boolean') {
  pass('search API', searchBody.result.headline?.slice(0, 60) || 'binary result')
} else {
  fail('search API', searchBody.error || searchRes.status)
}

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
  pass('contractor_unlock checkout', 'Stripe session URL returned')
} else if (checkoutBody.error === 'missing_price') {
  fail('contractor_unlock checkout', 'STRIPE_CONTRACTOR_CHECK_PRICE_ID not set on worker')
} else {
  fail('contractor_unlock checkout', checkoutBody.message || checkoutBody.error || checkoutRes.status)
}

const trackRes = await fetch(`${site}/api/contractor-check/track`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ step: 'page_view' }),
})
if (trackRes.ok) pass('track API')
else fail('track API', trackRes.status)

if (failed) process.exit(1)
console.log('\nContractor check production smoke tests passed.')
