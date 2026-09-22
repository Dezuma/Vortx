#!/usr/bin/env node
/** Smoke-test auth handoff + OAuth redirect safety. */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const site = process.env.PUBLIC_SITE_URL || 'https://vortxmkt.com'

function readDevVars() {
  try {
    const env = {}
    for (const line of readFileSync(resolve(root, '.dev.vars'), 'utf8').split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#') || !t.includes('=')) continue
      const [k, ...v] = t.split('=')
      env[k.trim()] = v.join('=').trim()
    }
    return env
  } catch {
    return {}
  }
}

let failed = 0
function pass(label, detail = '') {
  console.log(`ok ${label}${detail ? `: ${detail}` : ''}`)
}
function fail(label, detail = '') {
  failed += 1
  console.error(`fail ${label}${detail ? `: ${detail}` : ''}`)
}

const oauthGoogle = await fetch(
  `${site}/api/auth/oauth?provider=google&redirect_to=${encodeURIComponent(`${site}/?view=customer`)}`,
  { redirect: 'manual' },
)
const googleLoc = oauthGoogle.headers.get('location') || ''
if (oauthGoogle.status === 302 && googleLoc.includes('redirect_to=')) {
  pass('google oauth redirect', '302 to Supabase')
} else {
  fail('google oauth redirect', `status ${oauthGoogle.status}`)
}

const oauthGithub = await fetch(
  `${site}/api/auth/oauth?provider=github&redirect_to=${encodeURIComponent(`${site}/?view=customer`)}`,
  { redirect: 'manual' },
)
if (oauthGithub.status === 400) pass('github oauth blocked')
else fail('github oauth blocked', `status ${oauthGithub.status}`)

const www = await fetch('https://www.vortxmkt.com/?view=customer', { redirect: 'manual' })
if (www.status === 301 && (www.headers.get('location') || '').startsWith('https://vortxmkt.com')) {
  pass('www redirects to apex')
} else {
  fail('www redirects to apex', `status ${www.status}`)
}

const handoffMissing = await fetch(`${site}/api/auth/consume-handoff`, { method: 'POST' })
if (handoffMissing.status === 401) pass('handoff consume requires cookie')
else fail('handoff consume requires cookie', `status ${handoffMissing.status}`)

if (failed) process.exit(1)
console.log('\nAuth smoke checks passed.')
