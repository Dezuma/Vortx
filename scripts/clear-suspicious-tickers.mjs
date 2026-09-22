import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

function readDevVars() {
  const env = {}
  const text = readFileSync(resolve(ROOT, '.dev.vars'), 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

function requireEnv(env, key) {
  const value = String(env[key] || '').trim()
  if (!value) throw new Error(`Missing ${key} in .dev.vars`)
  return value
}

async function rest(env, path, init = {}) {
  const url = requireEnv(env, 'VITE_SUPABASE_URL').replace(/\/$/, '')
  const key = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY')
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: 'application/json',
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`)
  }
  return payload
}

async function main() {
  const env = readDevVars()
  const rows = await rest(env, 'entities?select=id,canonical_name,ticker&limit=1000')
  const suspicious = (rows || []).filter((row) => {
    const name = String(row.canonical_name || '')
    const hasVersus = /\s+v\.?\s+/i.test(name)
    const hasBusinessMarker = /\b(llc|l\.l\.c|inc|inc\.|corp|corporation|company|ltd|lp|holdings?|group)\b/i.test(name)
    const looksLikeCaption =
      /^(plaintiff|defendant|in re|matter of)/i.test(name) ||
      (hasVersus && !hasBusinessMarker) ||
      (hasVersus && /\b(in his capacity|former stockholders? of|securityholder)\b/i.test(name))
    return row.ticker && looksLikeCaption
  })

  let cleared = 0
  for (const row of suspicious) {
    await rest(env, `entities?id=eq.${encodeURIComponent(row.id)}`, {
      method: 'PATCH',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ ticker: null }),
    })
    cleared += 1
    console.log(`cleared ${row.canonical_name}`)
  }

  console.log(JSON.stringify({ ok: true, cleared, scanned: rows.length }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
