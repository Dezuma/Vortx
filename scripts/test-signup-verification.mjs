#!/usr/bin/env node
import { authUserCreatePayload, profileRequiresVerifiedSignup } from '../frontend/functions/api/auth.js'

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

check('signup create payload does not confirm the email', () => {
  const payload = authUserCreatePayload('buyer@example.com', 'CorrectHorse1')
  if (payload.email_confirm !== false) throw new Error(`email_confirm=${payload.email_confirm}`)
  if (payload.email !== 'buyer@example.com') throw new Error('email dropped')
})

check('billing profile requires inbox proof before a password is set', () => {
  if (!profileRequiresVerifiedSignup({ stripe_customer_id: 'cus_123', subscription_status: 'none' })) {
    throw new Error('stripe customer should require verification')
  }
  if (!profileRequiresVerifiedSignup({ stripe_subscription_id: 'sub_123', subscription_status: 'canceled' })) {
    throw new Error('stripe subscription should require verification')
  }
  for (const status of ['active', 'trialing', 'past_due']) {
    if (!profileRequiresVerifiedSignup({ subscription_status: status })) {
      throw new Error(`${status} should require verification`)
    }
  }
})

check('brand new email can still start signup', () => {
  if (profileRequiresVerifiedSignup(null)) throw new Error('missing profile should not block signup')
  if (profileRequiresVerifiedSignup({ plan: 'nebula', subscription_status: 'none' })) {
    throw new Error('unpaid profile should not block signup')
  }
  if (profileRequiresVerifiedSignup({ subscription_status: 'canceled' })) {
    throw new Error('canceled profile without Stripe ids should not block signup')
  }
})

if (failed) process.exit(1)
console.log('\nsignup verification tests passed.')
