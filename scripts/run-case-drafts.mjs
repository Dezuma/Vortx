#!/usr/bin/env node
/** Trigger the case draft job (writes pending_review rows only; never publishes). */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCaseDraftJob } from '../frontend/functions/lib/case-draft-generator.js'
import { supabaseRest } from '../frontend/functions/lib/supabase-rest.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readDevVars() {
  const env = {}
  for (const rawLine of readFileSync(resolve(root, '.dev.vars'), 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

const env = {
  ...readDevVars(),
  CASE_DRAFTS_ENABLED: 'true',
  CASE_DRAFT_REPLACE_PENDING: process.argv.includes('--replace-pending') ? 'true' : readDevVars().CASE_DRAFT_REPLACE_PENDING,
  PUBLIC_SITE_URL: readDevVars().PUBLIC_SITE_URL || 'https://vortxmkt.com',
}

const result = await runCaseDraftJob(env, supabaseRest)
console.log(JSON.stringify(result, null, 2))
