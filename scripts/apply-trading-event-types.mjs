#!/usr/bin/env node
/** Apply trading event_type check constraint migration. Never prints secrets. */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readDevVars() {
  const env = {}
  for (const raw of readFileSync(resolve(root, '.dev.vars'), 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
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

const candidates = [
  { host: `db.${projectRef}.supabase.co`, port: 5432, user: 'postgres' },
  { host: 'aws-1-us-east-1.pooler.supabase.com', port: 5432, user: `postgres.${projectRef}` },
  { host: 'aws-0-us-east-1.pooler.supabase.com', port: 5432, user: `postgres.${projectRef}` },
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
    const existing = await sql`select distinct event_type from public.legal_events order by 1`
    const known = new Set([
      'warn_notice',
      'mechanics_lien',
      'notice_of_intent',
      'civil_docket',
      'bankruptcy_docket',
      'bankruptcy_chapter_11',
      'bankruptcy_chapter_7',
      'bankruptcy_adversary',
      'receivership',
      'creditor_dispute',
      'regulatory_notice',
      'form_4',
      'congress_trade',
      'institutional_13f',
      ...(existing || []).map((row) => row.event_type).filter(Boolean),
    ])
    const list = [...known].map((t) => `'${String(t).replace(/'/g, "''")}'`).join(', ')
    await sql.unsafe(`
      alter table public.legal_events drop constraint if exists legal_events_event_type_check;
      alter table public.legal_events
        add constraint legal_events_event_type_check
        check (event_type in (${list}));
    `)
    const check = await sql`
      select pg_get_constraintdef(oid) as def
      from pg_constraint
      where conname = 'legal_events_event_type_check'
    `
    const def = String(check[0]?.def || '')
    const ok =
      def.includes('form_4') && def.includes('congress_trade') && def.includes('institutional_13f')
    console.log(`migration applied via ${candidate.host}`)
    console.log(`distinct event types in table: ${(existing || []).length}`)
    console.log(ok ? 'constraint includes trading event types' : 'constraint missing trading types')
    await sql.end()
    process.exit(ok ? 0 : 1)
  } catch (error) {
    lastError = error
    console.error(`failed via ${candidate.host}: ${error instanceof Error ? error.message : error}`)
    await sql.end({ timeout: 2 }).catch(() => undefined)
  }
}
console.error('Could not apply trading event type migration:', lastError?.message || lastError)
process.exit(1)
