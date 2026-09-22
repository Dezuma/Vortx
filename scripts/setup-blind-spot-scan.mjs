#!/usr/bin/env node
/**
 * Apply blind spot scan Supabase migration + configure Resend on the vortx Worker.
 * Reads SUPABASE_DB_PASSWORD and RESEND_API_KEY from env or .dev.vars (never prints values).
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD=... RESEND_API_KEY=... npm run setup:blind-spot-scan
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DEV_VARS = resolve(ROOT, '.dev.vars')

function readDevVars() {
  const env = {}
  if (!existsSync(DEV_VARS)) return env
  for (const rawLine of readFileSync(DEV_VARS, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

function mergeEnv() {
  return { ...readDevVars(), ...process.env }
}

function hasKey(env, key) {
  return Boolean(String(env[key] || '').trim())
}

function upsertDevVar(key, value) {
  if (!existsSync(DEV_VARS)) return
  const text = readFileSync(DEV_VARS, 'utf8')
  const re = new RegExp(`^${key}=.*$`, 'm')
  if (re.test(text)) return
  appendFileSync(DEV_VARS, `\n# Blind spot scan setup\n${key}=${value}\n`, 'utf8')
}

async function probeMigration(env) {
  const base = String(env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const key = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!base || !key) {
    return { ok: false, reason: 'supabase_unconfigured' }
  }

  const response = await fetch(`${base}/rest/v1/entity_watchlists?select=id&limit=1`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  })
  return { ok: response.status === 200, status: response.status }
}

function runDbPush(dbPassword) {
  const result = spawnSync('npx', ['supabase', 'db', 'push', '--linked'], {
    cwd: ROOT,
    env: { ...process.env, SUPABASE_DB_PASSWORD: dbPassword },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return {
    ok: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }
}

function putWranglerSecret(name, value) {
  const result = spawnSync(
    'npx',
    ['wrangler', 'secret', 'put', name, '--config', 'wrangler.jsonc'],
    {
      cwd: ROOT,
      input: value,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
  return { ok: result.status === 0, stderr: result.stderr || '' }
}

async function main() {
  const env = mergeEnv()
  const report = { migration: null, resend: null, probes: null }

  const dbPassword = String(env.SUPABASE_DB_PASSWORD || '').trim()
  if (dbPassword) {
    console.log('Applying Supabase migration (blind_spot_scan + entity_watchlists)...')
    const push = runDbPush(dbPassword)
    report.migration = { ok: push.ok }
    if (!push.ok) {
      console.error('Migration failed. Check SUPABASE_DB_PASSWORD (Supabase → Project Settings → Database).')
      if (push.stderr) console.error(push.stderr.trim().slice(-400))
    } else {
      console.log('Migration applied.')
      upsertDevVar('SUPABASE_DB_PASSWORD', dbPassword)
    }
  } else {
    console.warn('Skip migration: set SUPABASE_DB_PASSWORD (Database password in Supabase dashboard).')
    report.migration = { ok: false, skipped: true }
  }

  const resendKey = String(env.RESEND_API_KEY || '').trim()
  if (resendKey) {
    console.log('Setting RESEND_API_KEY on Cloudflare Worker vortx...')
    const put = putWranglerSecret('RESEND_API_KEY', resendKey)
    report.resend = { ok: put.ok }
    if (!put.ok) {
      console.error('wrangler secret put failed:', put.stderr.trim().slice(-400))
    } else {
      console.log('RESEND_API_KEY stored on Worker.')
      upsertDevVar('RESEND_API_KEY', resendKey)
    }
  } else {
    console.warn('Skip Resend: set RESEND_API_KEY (https://resend.com/api-keys).')
    report.resend = { ok: false, skipped: true }
  }

  report.probes = await probeMigration(env)
  if (report.probes.ok) {
    console.log('Verified: entity_watchlists table is reachable.')
  } else if (report.migration?.ok) {
    console.warn('Migration reported success but entity_watchlists probe failed — check Supabase logs.')
  } else {
    console.log('entity_watchlists not deployed yet (expected until migration runs).')
  }

  const done = (report.migration?.ok || report.migration?.skipped) && (report.resend?.ok || report.resend?.skipped)
  if (!dbPassword || !resendKey) {
    console.log('\nTo finish both steps, run:')
    console.log('  SUPABASE_DB_PASSWORD=your-db-password RESEND_API_KEY=re_... npm run setup:blind-spot-scan')
    console.log('\nOr paste SQL manually: supabase/migrations/20250630220000_blind_spot_scan_leads.sql')
  }

  if (report.migration?.ok && report.resend?.ok) {
    console.log('\nNext: npm run deploy  (then test unlock at https://vortxmkt.com/scan — email_sent should be true)')
  }

  process.exit(done && (report.migration?.ok || report.migration?.skipped) && (report.resend?.ok || report.resend?.skipped) ? 0 : 1)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
