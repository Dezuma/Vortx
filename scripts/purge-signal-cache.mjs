#!/usr/bin/env node
/**
 * Purge Cloudflare edge cache for public /signal/* landing pages.
 * Uses CLOUDFLARE_API_TOKEN from env or .dev.vars (never prints secrets).
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4'
const SITE = (process.env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
const HOST = new URL(SITE).hostname
const WWW_HOST = HOST.startsWith('www.') ? HOST : `www.${HOST}`

function readDevVars() {
  const env = {}
  try {
    const text = readFileSync(resolve(root, '.dev.vars'), 'utf8')
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#') || !line.includes('=')) continue
      const [key, ...parts] = line.split('=')
      env[key.trim()] = parts.join('=').trim()
    }
  } catch {
    // Optional.
  }
  return env
}

const devEnv = readDevVars()
const token = process.env.CLOUDFLARE_API_TOKEN || devEnv.CLOUDFLARE_API_TOKEN
if (!token) {
  console.error('Missing CLOUDFLARE_API_TOKEN (export or set in .dev.vars).')
  process.exit(1)
}

async function cf(path, init = {}) {
  const response = await fetch(`${CLOUDFLARE_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.success) {
    const message = payload.errors?.map((error) => error.message).join('; ') || `Cloudflare API ${response.status}`
    throw new Error(message)
  }
  return payload.result
}

async function getZoneId() {
  if (process.env.CLOUDFLARE_ZONE_ID || devEnv.CLOUDFLARE_ZONE_ID) {
    return process.env.CLOUDFLARE_ZONE_ID || devEnv.CLOUDFLARE_ZONE_ID
  }
  const zoneName = HOST.split('.').slice(-2).join('.')
  const zones = await cf(`/zones?name=${encodeURIComponent(zoneName)}`)
  if (!zones.length) throw new Error(`No Cloudflare zone found for ${zoneName}.`)
  return zones[0].id
}

const prefixes = [`${HOST}/signal`, `${WWW_HOST}/signal`]
const purgeEverything = process.argv.includes('--everything')

const zoneId = await getZoneId()
if (purgeEverything) {
  console.log(`Purging entire Cloudflare cache for zone ${zoneId} (--everything).`)
  const result = await cf(`/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    body: JSON.stringify({ purge_everything: true }),
  })
  console.log(`Full purge accepted (id: ${result?.id || 'ok'}).`)
  process.exit(0)
}

console.log(`Purging Cloudflare cache prefixes for zone ${zoneId}:`)
for (const prefix of prefixes) console.log(`  ${prefix}`)

const result = await cf(`/zones/${zoneId}/purge_cache`, {
  method: 'POST',
  body: JSON.stringify({ prefixes }),
})

console.log(`Purge accepted (id: ${result?.id || 'ok'}).`)
console.log('Legacy name-based /signal/* URLs should 301 to opaque slugs on next request.')
console.log('If stale HEAD responses persist, rerun: npm run ops:purge-signal-cache -- --everything')
