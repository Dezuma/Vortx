#!/usr/bin/env node
import { upsertCheckoutSessionRow } from '../frontend/functions/lib/checkout-session-store.js'

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

check('rejects rows without stripe_session_id', async () => {
  const result = await upsertCheckoutSessionRow({}, { plan: 'scout', status: 'created' })
  if (result.ok) throw new Error('expected false')
})

if (failed) process.exit(1)
console.log('checkout-session-store tests passed')
