#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyPendingBillingClaim,
  attachCheckoutClaim,
  bestBillingClaim,
  profileAcceptsBillingClaim,
  profileActivationTarget,
  recordBillingClaim,
  selectCheckoutRowForClaim,
} from '../frontend/functions/lib/pending-billing.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
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

check('logged-out checkout cannot insert a profile', () => {
  if (profileActivationTarget(null) !== 'pending_signup') throw new Error('missing profile')
  if (profileActivationTarget({ email: 'a@b.com' }) !== 'pending_signup') throw new Error('no user id')
  if (profileActivationTarget({ user_id: 'user_1', email: 'a@b.com' }) !== 'profile') {
    throw new Error('existing profile')
  }
})

check('webhook no longer inserts app_profiles', () => {
  const src = readFileSync(resolve(root, 'frontend/functions/api/stripe-webhook.js'), 'utf8')
  if (src.includes("supabaseRest(env, 'app_profiles'")) {
    throw new Error('activateProfile still inserts app_profiles')
  }
  if (!src.includes('pending_signup')) throw new Error('pending_signup path missing')
  if (!src.includes('attachCheckoutClaim')) throw new Error('checkout claim not stamped')
})

check('claim stamp preserves an earlier trialing status', () => {
  const row = attachCheckoutClaim(
    {
      plan: 'nebula',
      status: 'completed',
      metadata: { subscription_status: 'trialing', stripe_subscription_id: 'sub_old' },
    },
    { customer: 'cus_1', subscription: 'sub_1' },
  )
  if (row.metadata.subscription_status !== 'trialing') throw new Error(row.metadata.subscription_status)
  if (row.metadata.stripe_customer_id !== 'cus_1') throw new Error('customer')
  if (row.metadata.stripe_subscription_id !== 'sub_1') throw new Error('subscription')
})

check('one-time unlocks are not subscription claims', () => {
  const row = attachCheckoutClaim({ plan: 'contractor_unlock', metadata: {} }, { customer: 'cus_1' })
  if (row.metadata.subscription_status) throw new Error('unlock was claimed')
})

check('historical checkouts without a claim status do not grant access', () => {
  const claim = bestBillingClaim([
    { status: 'completed', plan: 'galactic', metadata: {}, stripe_session_id: 'cs_old' },
  ])
  if (claim) throw new Error('old checkout granted a plan')
})

check('newest live claim beats a newer cancellation of a different checkout', () => {
  const claim = bestBillingClaim([
    {
      status: 'completed',
      plan: 'nebula',
      stripe_session_id: 'cs_new',
      metadata: { subscription_status: 'canceled', stripe_subscription_id: 'sub_new' },
    },
    {
      status: 'completed',
      plan: 'galactic',
      stripe_session_id: 'cs_old',
      metadata: { subscription_status: 'active', stripe_subscription_id: 'sub_old' },
    },
  ])
  if (claim?.plan !== 'galactic' || claim.subscription_status !== 'active') {
    throw new Error(JSON.stringify(claim))
  }
})

check('subscription events do not clobber a different subscription row', () => {
  const rows = [
    {
      stripe_session_id: 'cs_galactic',
      plan: 'galactic',
      metadata: { stripe_subscription_id: 'sub_galactic', stripe_customer_id: 'cus_1' },
    },
    {
      stripe_session_id: 'cs_nebula',
      plan: 'nebula',
      metadata: { stripe_subscription_id: 'sub_nebula', stripe_customer_id: 'cus_1' },
    },
  ]
  const target = selectCheckoutRowForClaim(rows, { subscriptionId: 'sub_nebula', customerId: 'cus_1' })
  if (target?.stripe_session_id !== 'cs_nebula') throw new Error(target?.stripe_session_id || 'none')
})

check('free profile accepts a claim; a live profile does not', () => {
  if (!profileAcceptsBillingClaim({ user_id: 'u', email: 'a@b.com', role: 'customer', subscription_status: 'none' })) {
    throw new Error('expected accept')
  }
  if (profileAcceptsBillingClaim({ user_id: 'u', email: 'a@b.com', role: 'customer', subscription_status: 'active' })) {
    throw new Error('live profile accepted')
  }
  if (profileAcceptsBillingClaim({ user_id: 'u', email: 'a@b.com', role: 'admin', subscription_status: 'none' })) {
    throw new Error('admin accepted')
  }
})

const calls = []
const rest = async (_env, path, init) => {
  calls.push({ path, init })
  if (String(path).startsWith('checkout_sessions?select=')) {
    return [
      {
        stripe_session_id: 'cs_1',
        plan: 'nebula',
        status: 'completed',
        email: 'payer@example.com',
        metadata: {
          subscription_status: 'active',
          stripe_customer_id: 'cus_1',
          stripe_subscription_id: 'sub_1',
        },
      },
    ]
  }
  if (init?.method === 'PATCH' && String(path).startsWith('app_profiles')) {
    return [{ user_id: 'user_1', email: 'payer@example.com', plan: 'nebula', subscription_status: 'active' }]
  }
  return []
}

const applied = await applyPendingBillingClaim(
  {},
  { user_id: 'user_1', email: 'Payer@Example.com', role: 'customer', subscription_status: 'none' },
  { rest },
)
check('signup applies the paid checkout onto the new profile', () => {
  if (applied.plan !== 'nebula' || applied.subscription_status !== 'active') {
    throw new Error(JSON.stringify(applied))
  }
  const patch = calls.find((call) => call.init?.method === 'PATCH' && call.path.startsWith('app_profiles'))
  const body = JSON.parse(patch.init.body)
  if (body.stripe_subscription_id !== 'sub_1') throw new Error(patch.init.body)
})

calls.length = 0
const recorded = await recordBillingClaim(
  {},
  { email: 'payer@example.com', subscriptionStatus: 'canceled', customerId: 'cus_1', subscriptionId: 'sub_1' },
  {
    rest: async (_env, path, init) => {
      calls.push({ path, init })
      if (String(path).startsWith('checkout_sessions?select=')) {
        return [
          {
            stripe_session_id: 'cs_keep',
            plan: 'galactic',
            metadata: { stripe_subscription_id: 'sub_keep', stripe_customer_id: 'cus_1', subscription_status: 'active' },
          },
          {
            stripe_session_id: 'cs_1',
            plan: 'nebula',
            metadata: { stripe_subscription_id: 'sub_1', stripe_customer_id: 'cus_1', subscription_status: 'active' },
          },
        ]
      }
      return []
    },
  },
)
check('cancellation updates only the matching checkout claim', () => {
  if (!recorded.updated || recorded.stripe_session_id !== 'cs_1') throw new Error(JSON.stringify(recorded))
  const patch = calls.find((call) => call.init?.method === 'PATCH')
  if (!patch.path.includes('cs_1')) throw new Error(patch.path)
  const body = JSON.parse(patch.init.body)
  if (body.metadata.subscription_status !== 'canceled') throw new Error(patch.init.body)
  if (body.plan) throw new Error('plan should stay on the checkout row')
})

if (failed) process.exit(1)
console.log('pending billing tests passed')
