#!/usr/bin/env node
/**
 * Apply a SQL migration file to live Supabase and run optional verification SQL.
 *
 * Usage:
 *   node scripts/apply-sql-migration.mjs supabase/migrations/foo.sql
 *   node scripts/apply-sql-migration.mjs supabase/migrations/foo.sql --check "select 1"
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { connectSupabasePg, projectRoot } from './lib/supabase-pg.mjs'

const args = process.argv.slice(2)
const fileArg = args.find((a) => !a.startsWith('--'))
if (!fileArg) {
  console.error('Usage: node scripts/apply-sql-migration.mjs <migration.sql> [--check "sql"]')
  process.exit(1)
}

const checks = []
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--check' && args[i + 1]) {
    checks.push(args[i + 1])
    i += 1
  }
}

const root = projectRoot()
const sqlPath = resolve(root, fileArg)
const sqlText = readFileSync(sqlPath, 'utf8')

const { sql, host } = await connectSupabasePg()
try {
  console.log(`Applying ${fileArg} via ${host}…`)
  await sql.unsafe(sqlText)
  for (const check of checks) {
    const rows = await sql.unsafe(check)
    console.log('check:', check)
    console.log(JSON.stringify(rows, null, 2))
  }
  console.log('OK')
} finally {
  await sql.end({ timeout: 2 }).catch(() => undefined)
}
