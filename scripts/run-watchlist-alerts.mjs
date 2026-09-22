/**
 * Manual Watch alert delivery (uses local .dev.vars / env for Supabase + Resend).
 * Usage: node scripts/run-watchlist-alerts.mjs [--dry-run]
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runWatchlistAlertJob } from '../frontend/functions/lib/watchlist-alerts.js'
import { supabaseRest } from '../frontend/functions/lib/supabase-rest.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.includes('--dry-run')

function loadDevVars() {
  const path = resolve(root, '.dev.vars')
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 1) continue
    const key = trimmed.slice(0, i).trim()
    let val = trimmed.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const fileEnv = loadDevVars()
const env = {
  ...fileEnv,
  ...process.env,
  PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL || fileEnv.PUBLIC_SITE_URL || 'https://vortxmkt.com',
}

const result = await runWatchlistAlertJob(env, supabaseRest, { dryRun })
console.log(JSON.stringify(result, null, 2))
if (!result.ok) process.exitCode = 1
