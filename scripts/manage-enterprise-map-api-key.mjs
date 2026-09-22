#!/usr/bin/env node
/**
 * Create/rotate or revoke a Vortx Enterprise map API key.
 * Raw keys are printed once and only their SHA-256 hashes are stored.
 */
import { createHash, randomBytes } from 'node:crypto'
import { connectSupabasePg } from './lib/supabase-pg.mjs'

const emailArg = process.argv.find((value) => value.startsWith('--email='))
const email = String(emailArg?.slice('--email='.length) || '')
  .trim()
  .toLowerCase()
const revoke = process.argv.includes('--revoke')

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(
    'Usage: node scripts/manage-enterprise-map-api-key.mjs --email=owner@example.com [--revoke]',
  )
  process.exit(1)
}

const { sql } = await connectSupabasePg()
try {
  if (revoke) {
    const rows = await sql`
      update public.api_subscribers
      set status = 'revoked', updated_at = now()
      where owner_email = ${email}
      returning id
    `
    console.log(
      JSON.stringify({ ok: true, action: 'revoked', owner_email: email, matched: rows.length }),
    )
  } else {
    const token = `vx_map_${randomBytes(32).toString('base64url')}`
    const tokenHash = createHash('sha256').update(token).digest('hex')
    await sql`
      insert into public.api_subscribers (
        owner_email,
        plan,
        token_hash,
        status,
        updated_at
      )
      values (${email}, 'galactic', ${tokenHash}, 'active', now())
      on conflict (owner_email) do update set
        plan = 'galactic',
        token_hash = excluded.token_hash,
        status = 'active',
        updated_at = now()
    `
    console.log('Enterprise map API key created/rotated. Store it now; it will not be shown again.')
    console.log(token)
  }
} finally {
  await sql.end({ timeout: 2 }).catch(() => undefined)
}
