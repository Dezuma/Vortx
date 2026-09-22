/** Shared Postgres connection helpers for live Supabase DDL/DML scripts. */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export function projectRoot() {
  return root
}

export function readDevVars() {
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

export function connectionCandidates(env = readDevVars()) {
  const url = env.VITE_SUPABASE_URL
  const password = env.SUPABASE_DB_PASSWORD
  if (!url) throw new Error('Missing VITE_SUPABASE_URL in .dev.vars')
  if (!password) throw new Error('Missing SUPABASE_DB_PASSWORD in .dev.vars')
  const projectRef = new URL(url).hostname.split('.')[0]
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
  return {
    password,
    projectRef,
    candidates: [
      { host: `db.${projectRef}.supabase.co`, port: 5432, user: 'postgres' },
      ...regions.flatMap((region) => [
        { host: `aws-1-${region}.pooler.supabase.com`, port: 5432, user: `postgres.${projectRef}` },
        { host: `aws-0-${region}.pooler.supabase.com`, port: 5432, user: `postgres.${projectRef}` },
      ]),
    ],
  }
}

/** Open the first working Postgres connection. Caller must sql.end(). */
export async function connectSupabasePg(env = readDevVars()) {
  const { password, candidates } = connectionCandidates(env)
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
      await sql`select 1 as ok`
      return { sql, host: candidate.host }
    } catch (error) {
      lastError = error
      await sql.end({ timeout: 2 }).catch(() => undefined)
    }
  }
  throw new Error(`Could not connect to Supabase Postgres: ${lastError?.message || 'unknown'}`)
}
