#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  decideProfileActivation,
  profileEntitlementPatch,
  subscriptionGrantFromCheckout,
} from '../frontend/functions/lib/paid-checkout.js'
import { planFromEnvPrice } from '../frontend/functions/api/stripe-webhook.js'
import { buildCheckoutSessionRow } from '../frontend/functions/lib/stripe-checkout-sync.js'

const confirmed = { id: 'user-1', email: 'payer@example.com', email_confirmed_at: '2026-11-01T00:00:00Z' }
const unconfirmed = { id: 'user-2', email: 'payer@example.com', email_confirmed_at: null }

const paidCheckout = {
  plan: 'galactic',
  mode: 'subscription',
  status: 'completed',
  email: 'payer@example.com',
  metadata: {
    subscription_status: 'active',
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
  },
}

assert.equal(subscriptionGrantFromCheckout(paidCheckout)?.plan, 'galactic')
assert.equal(subscriptionGrantFromCheckout(paidCheckout)?.stripe_customer_id, 'cus_123')
assert.equal(
  subscriptionGrantFromCheckout({ ...paidCheckout, plan: 'contractor_unlock', mode: 'payment' }),
  null,
)
assert.equal(
  subscriptionGrantFromCheckout({
    ...paidCheckout,
    metadata: { ...paidCheckout.metadata, subscription_status: 'canceled' },
  }),
  null,
)
assert.equal(subscriptionGrantFromCheckout({ ...paidCheckout, status: 'open' }), null)

const missingAccount = decideProfileActivation({
  email: 'payer@example.com',
  profile: null,
  authUser: null,
  plan: 'galactic',
  stripeIds: { customerId: 'cus_123', subscriptionId: 'sub_123' },
})
assert.equal(missingAccount.action, 'pending')
assert.equal(missingAccount.reason, 'account_missing')

const unconfirmedAccount = decideProfileActivation({
  email: 'payer@example.com',
  profile: { user_id: 'user-2', email: 'payer@example.com', subscription_status: 'none' },
  authUser: unconfirmed,
  plan: 'galactic',
  stripeIds: { customerId: 'cus_123', subscriptionId: 'sub_123' },
})
assert.equal(unconfirmedAccount.action, 'pending')
assert.equal(unconfirmedAccount.reason, 'email_unconfirmed')

const confirmedInsert = decideProfileActivation({
  email: 'Payer@Example.com',
  profile: null,
  authUser: confirmed,
  plan: 'pulsar',
  stripeIds: { customerId: 'cus_123', subscriptionId: 'sub_123' },
})
assert.equal(confirmedInsert.action, 'insert')
assert.equal(confirmedInsert.row.user_id, 'user-1')
assert.equal(confirmedInsert.row.email, 'payer@example.com')
assert.equal(confirmedInsert.row.plan, 'pulsar')
assert.equal(confirmedInsert.row.subscription_status, 'active')

const confirmedPatch = decideProfileActivation({
  email: 'payer@example.com',
  profile: { user_id: 'user-1', email: 'payer@example.com' },
  authUser: confirmed,
  plan: 'nebula',
  stripeIds: { customerId: 'cus_9' },
})
assert.equal(confirmedPatch.action, 'patch')
assert.equal(confirmedPatch.userId, 'user-1')
assert.equal(confirmedPatch.patch.plan, 'nebula')

assert.equal(profileEntitlementPatch('none', null, { emailConfirmed: true }), null)
assert.equal(
  profileEntitlementPatch('active', subscriptionGrantFromCheckout(paidCheckout), { emailConfirmed: true }),
  null,
)
const claim = profileEntitlementPatch('none', subscriptionGrantFromCheckout(paidCheckout), {
  emailConfirmed: true,
})
assert.equal(claim.plan, 'galactic')
assert.equal(claim.subscription_status, 'active')
assert.equal(
  profileEntitlementPatch('none', subscriptionGrantFromCheckout(paidCheckout), { emailConfirmed: false }),
  null,
)

assert.equal(planFromEnvPrice({ STRIPE_SCOUT_PRICE_ID: '' }, ''), 'nebula')
assert.equal(planFromEnvPrice({ STRIPE_SCOUT_PRICE_ID: '', STRIPE_GALACTIC_PRICE_ID: 'price_g' }, ''), 'nebula')
assert.equal(
  planFromEnvPrice({ STRIPE_SCOUT_PRICE_ID: 'price_s', STRIPE_GALACTIC_PRICE_ID: 'price_g' }, 'price_g'),
  'galactic',
)

const row = buildCheckoutSessionRow(
  {},
  {
    id: 'cs_1',
    mode: 'subscription',
    status: 'complete',
    payment_status: 'paid',
    customer_details: { email: 'Payer@Example.com' },
    metadata: { plan: 'sentinel' },
  },
)
assert.equal(row.email, 'payer@example.com')

console.log('paid checkout entitlement tests passed')
