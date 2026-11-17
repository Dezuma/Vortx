#!/usr/bin/env node
/**
 * Checkout fulfillment must follow Stripe payment_status.
 * status=complete with payment_status=unpaid is a delayed method, not a paid order.
 */
import assert from 'node:assert/strict'
import {
  checkoutSessionIsFulfilled,
  normalizeCheckoutStatus,
} from '../frontend/functions/lib/stripe-checkout-sync.js'
import { assessPaidUnlock } from '../frontend/functions/lib/stripe-unlock-verify.js'

const unpaidComplete = {
  id: 'cs_unpaid',
  status: 'complete',
  payment_status: 'unpaid',
  mode: 'payment',
  metadata: { plan: 'contractor_unlock', entity_id: 'ent_1', contractor_state: 'TX' },
}

const paidComplete = {
  ...unpaidComplete,
  id: 'cs_paid',
  payment_status: 'paid',
}

const trialComplete = {
  id: 'cs_trial',
  status: 'complete',
  payment_status: 'no_payment_required',
  mode: 'subscription',
  metadata: { plan: 'nebula' },
}

assert.equal(checkoutSessionIsFulfilled(unpaidComplete), false)
assert.equal(checkoutSessionIsFulfilled(paidComplete), true)
assert.equal(checkoutSessionIsFulfilled(trialComplete), true)
assert.equal(checkoutSessionIsFulfilled({ status: 'complete' }), false)
assert.equal(checkoutSessionIsFulfilled({ status: 'open', payment_status: 'unpaid' }), false)

assert.equal(normalizeCheckoutStatus(unpaidComplete), 'unpaid')
assert.equal(normalizeCheckoutStatus(paidComplete), 'completed')
assert.equal(normalizeCheckoutStatus(trialComplete), 'completed')
assert.equal(normalizeCheckoutStatus({ status: 'open', payment_status: 'unpaid' }), 'open')
assert.equal(normalizeCheckoutStatus({ status: 'expired', payment_status: 'unpaid' }), 'expired')

const rejected = assessPaidUnlock(unpaidComplete, 'contractor_unlock', 'ent_1')
assert.equal(rejected.ok, false)
assert.equal(rejected.error, 'payment_not_verified')

const accepted = assessPaidUnlock(paidComplete, 'contractor_unlock', 'ent_1')
assert.equal(accepted.ok, true)
assert.equal(accepted.entityId, 'ent_1')
assert.equal(accepted.state, 'TX')

const wrongEntity = assessPaidUnlock(paidComplete, 'contractor_unlock', 'ent_other')
assert.equal(wrongEntity.ok, false)

const wrongPlan = assessPaidUnlock(paidComplete, 'landlord_unlock', 'ent_1')
assert.equal(wrongPlan.ok, false)

console.log('checkout fulfillment tests passed')
