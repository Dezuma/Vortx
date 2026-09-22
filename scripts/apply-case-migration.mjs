#!/usr/bin/env node
/** Apply the case_stories migration to the live Supabase database over the pg wire protocol. */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readDevVars() {
  const env = {}
  const text = readFileSync(resolve(root, '.dev.vars'), 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

const env = readDevVars()
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]
const password = env.SUPABASE_DB_PASSWORD
if (!password) throw new Error('Missing SUPABASE_DB_PASSWORD in .dev.vars')

const sqlText = readFileSync(resolve(root, 'supabase/migrations/20260709220000_case_stories.sql'), 'utf8')

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'sa-east-1',
  'ca-central-1',
]
const candidates = [
  { host: `db.${projectRef}.supabase.co`, port: 5432, user: 'postgres' },
  ...regions.flatMap((region) => [
    { host: `aws-1-${region}.pooler.supabase.com`, port: 5432, user: `postgres.${projectRef}` },
    { host: `aws-0-${region}.pooler.supabase.com`, port: 5432, user: `postgres.${projectRef}` },
  ]),
]

let lastError
for (const candidate of candidates) {
  const sql = postgres({
    host: candidate.host,
    port: candidate.port,
    user: candidate.user,
    password,
    database: 'postgres',
    ssl: 'require',
    max: 1,
    connect_timeout: 12,
    prepare: false,
  })
  try {
    await sql.unsafe(sqlText)
    const [row] = await sql`select count(*)::int as n from public.case_stories`
    console.log(`Migration applied via ${candidate.host}. case_stories rows: ${row.n}`)
    await sql.end()
    process.exit(0)
  } catch (error) {
    lastError = error
    console.error(`failed via ${candidate.host}: ${error.message}`)
    await sql.end({ timeout: 2 }).catch(() => undefined)
  }
}
console.error('\nCould not apply migration automatically. Paste supabase/migrations/20260709220000_case_stories.sql into the Supabase SQL editor instead.')
process.exit(1)
