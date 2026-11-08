#!/usr/bin/env node
/**
 * Stripe subscription webhooks must not clobber a newer subscription
 * or turn an unknown price into the Nebula plan.
 */
import assert from 'node:assert/strict'
import {
  resolveSubscriptionPlan,
  stripeSubscriptionIdFromEvent,
  subscriptionStatusEventApplies,
} from '../frontend/functions/api/stripe-webhook.js'

const env = {
  STRIPE_SCOUT_PRICE_ID: 'price_scout',
  STRIPE_GALACTIC_PRICE_ID: 'price_galactic',
  STRIPE_CONTRACTOR_CHECK_PRICE_ID: 'price_contractor',
}

const current = { stripe_subscription_id: 'sub_new', plan: 'galactic' }

assert.equal(
  subscriptionStatusEventApplies(current, 'sub_old'),
  false,
  'an older subscription must not change the profile',
)
assert.equal(subscriptionStatusEventApplies(current, 'sub_new'), true)
assert.equal(
  subscriptionStatusEventApplies({ stripe_subscription_id: '' }, 'sub_new'),
  true,
  'a profile with no subscription id yet still accepts the first event',
)
assert.equal(
  subscriptionStatusEventApplies(current, ''),
  false,
  'a one-time invoice has no subscription id and must not change status',
)

assert.equal(
  stripeSubscriptionIdFromEvent('customer.subscription.deleted', { id: 'sub_old' }),
  'sub_old',
)
assert.equal(
  stripeSubscriptionIdFromEvent('invoice.payment_failed', { subscription: 'sub_new' }),
  'sub_new',
)
assert.equal(
  stripeSubscriptionIdFromEvent('invoice.payment_failed', { subscription: { id: 'sub_new' } }),
  'sub_new',
)
assert.equal(
  stripeSubscriptionIdFromEvent('invoice.payment_failed', { id: 'in_one_time' }),
  '',
)

assert.equal(
  resolveSubscriptionPlan(env, {
    metadata: { plan: 'scout' },
    items: { data: [{ price: { id: 'price_galactic' } }] },
  }),
  'scout',
)
assert.equal(
  resolveSubscriptionPlan(env, {
    metadata: {},
    items: { data: [{ price: { id: 'price_galactic' } }] },
  }),
  'galactic',
)
assert.equal(
  resolveSubscriptionPlan(env, {
    metadata: {},
    items: { data: [{ price: { id: 'price_unknown' } }] },
  }),
  '',
  'an unmapped price must not default the plan to nebula',
)
assert.equal(
  resolveSubscriptionPlan(env, {
    metadata: { plan: 'contractor_unlock' },
    items: { data: [{ price: { id: 'price_contractor' } }] },
  }),
  '',
  'one-time unlock prices are not subscription plans',
)

console.log('stripe webhook subscription guard: ok')
