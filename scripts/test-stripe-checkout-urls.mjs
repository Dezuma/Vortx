#!/usr/bin/env node
/** Assert subscription checkout return URLs use SPA pricing view. */

const origin = 'https://vortxmkt.com'
const planId = 'scout'

function buildUrls({ planId, returnPath = '/pricing' }) {
  const consumerReturnPlans = new Set(['contractor_unlock', 'job_safety_unlock', 'landlord_unlock'])
  const safeReturnPath = returnPath.startsWith('/') ? returnPath : `/${returnPath}`
  const pricingReturnBase = `${origin}/?view=pricing`

  const successUrl = consumerReturnPlans.has(planId)
    ? `${origin}${safeReturnPath}?unlock=success&session_id={CHECKOUT_SESSION_ID}`
    : returnPath.startsWith('/') && returnPath !== '/pricing'
      ? `${origin}${safeReturnPath}?checkout=success&plan=${encodeURIComponent(planId)}`
      : `${pricingReturnBase}&checkout=success&plan=${encodeURIComponent(planId)}`

  const cancelUrl = consumerReturnPlans.has(planId)
    ? `${origin}${safeReturnPath}?unlock=cancelled`
    : returnPath.startsWith('/') && returnPath !== '/pricing'
      ? `${origin}${safeReturnPath}?checkout=cancelled&plan=${encodeURIComponent(planId)}`
      : `${pricingReturnBase}&checkout=cancelled&plan=${encodeURIComponent(planId)}`

  return { successUrl, cancelUrl }
}

let failed = 0
function check(label, fn) {
  try {
    fn()
    console.log(`ok ${label}`)
  } catch (error) {
    failed += 1
    console.error(`fail ${label}:`, error.message)
  }
}

check('subscription success uses view=pricing', () => {
  const { successUrl } = buildUrls({ planId: 'scout' })
  if (!successUrl.includes('/?view=pricing&checkout=success')) {
    throw new Error(successUrl)
  }
})

check('consumer unlock keeps tool return path', () => {
  const { successUrl } = buildUrls({ planId: 'contractor_unlock', returnPath: '/contractor-check' })
  if (!successUrl.includes('/contractor-check?unlock=success')) {
    throw new Error(successUrl)
  }
})

if (failed) process.exit(1)
console.log('stripe checkout URL tests passed')
