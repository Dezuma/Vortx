#!/usr/bin/env node
/**
 * An unverified checkout email must not replace a paying customer's plan.
 * Signed-in upgrades, and first purchases on a profile with no live
 * subscription, still apply.
 */
import assert from 'node:assert/strict'
import { resolveCheckoutOwner } from '../frontend/functions/api/stripe-checkout.js'
import { checkoutActivationApplies } from '../frontend/functions/api/stripe-webhook.js'

const victim = {
  user_id: 'user_victim',
  email: 'victim@example.com',
  plan: 'galactic',
  subscription_status: 'active',
  stripe_customer_id: 'cus_victim',
  stripe_subscription_id: 'sub_victim',
}

assert.equal(
  checkoutActivationApplies(victim, ''),
  false,
  'a logged-out checkout must not rewrite a live subscription',
)
assert.equal(
  checkoutActivationApplies(victim, 'user_attacker'),
  false,
  'a different signed-in user must not rewrite this subscription',
)
assert.equal(
  checkoutActivationApplies(victim, 'user_victim'),
  true,
  'the signed-in account may upgrade its own subscription',
)
assert.equal(
  checkoutActivationApplies(
    { ...victim, stripe_customer_id: '', stripe_subscription_id: '', subscription_status: 'past_due' },
    '',
  ),
  false,
  'past_due access is still a live subscription',
)
assert.equal(
  checkoutActivationApplies(
    {
      user_id: 'user_new',
      plan: 'nebula',
      subscription_status: 'none',
      stripe_customer_id: '',
      stripe_subscription_id: '',
    },
    '',
  ),
  true,
  'a free account can complete a first checkout without a prior session binding',
)
assert.equal(checkoutActivationApplies(null, ''), true, 'a missing profile can be created')
assert.equal(
  checkoutActivationApplies(
    { user_id: 'user_old', subscription_status: 'canceled', stripe_customer_id: '', stripe_subscription_id: '' },
    '',
  ),
  true,
  'a canceled account with no Stripe ids can subscribe again',
)

const loggedOut = resolveCheckoutOwner(null, 'victim@example.com')
assert.equal(loggedOut.ok, true)
assert.equal(loggedOut.ownerEmail, '', 'logged-out body email is not trusted')
assert.equal(loggedOut.userId, '')

const mismatch = resolveCheckoutOwner(
  { id: 'user_attacker', email: 'attacker@example.com' },
  'victim@example.com',
)
assert.equal(mismatch.ok, false)
assert.equal(mismatch.error, 'owner_email_mismatch')

const signedIn = resolveCheckoutOwner(
  { id: 'user_victim', email: 'Victim@Example.com' },
  '',
)
assert.deepEqual(signedIn, { ok: true, ownerEmail: 'victim@example.com', userId: 'user_victim' })

console.log('stripe checkout owner guard: ok')
