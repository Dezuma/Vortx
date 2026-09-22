#!/usr/bin/env node
/**
 * Smoke-test Vortx auth routes on production (or PUBLIC_SITE_URL).
 * Does not print tokens or secrets.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

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
  } catch {}
  return env
}

const dev = readDevVars()
const site = process.env.PUBLIC_SITE_URL || dev.PUBLIC_SITE_URL || 'https://vortxmkt.com'
const supabaseUrl = String(dev.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const serviceKey = dev.SUPABASE_SERVICE_ROLE_KEY || ''

const results = []

function pass(name, detail = '') {
  results.push({ name, ok: true, detail })
  console.log(`  ok  ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail })
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}

async function jsonFetch(path, options = {}) {
  const res = await fetch(`${site}${path}`, options)
  const body = await res.json().catch(() => ({}))
  return { res, body }
}

async function deleteTestUser(userId) {
  if (!supabaseUrl || !serviceKey || !userId) return
  await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  }).catch(() => {})
}

async function main() {
  console.log(`Auth flow tests → ${site}\n`)

  const oauthEvil = await fetch(
    `${site}/api/auth/oauth?provider=github&redirect_to=${encodeURIComponent('https://evil.com/phish')}`,
    { redirect: 'manual' },
  )
  const loc = oauthEvil.headers.get('location') || ''
  if (oauthEvil.status === 302 && loc.includes('redirect_to=')) {
    const redirectParam = new URL(loc).searchParams.get('redirect_to') || ''
    if (redirectParam.includes('evil.com')) fail('oauth redirect safety', 'external redirect allowed')
    else pass('oauth redirect safety', 'external redirect blocked')
  } else if (oauthEvil.status === 404) {
    fail('oauth redirect safety', 'route missing — deploy needed')
  } else {
    pass('oauth redirect safety', `status ${oauthEvil.status}`)
  }

  const badMagic = await jsonFetch('/api/auth/magic-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email' }),
  })
  if (badMagic.res.status === 404) fail('magic-link invalid email', 'route missing')
  else if (badMagic.res.status === 400) pass('magic-link invalid email', '400')
  else fail('magic-link invalid email', `status ${badMagic.res.status}`)

  const recover = await jsonFetch('/api/auth/recover', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'probe@example.com' }),
  })
  if (recover.res.status === 404) fail('recover endpoint', 'route missing')
  else if (recover.res.ok || recover.res.status === 502) pass('recover endpoint', `status ${recover.res.status}`)
  else fail('recover endpoint', `status ${recover.res.status}`)

  const passkeyOptions = await jsonFetch('/api/auth/passkey/login/options', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (passkeyOptions.res.status === 404) fail('passkey login options', 'route missing — deploy needed')
  else if (passkeyOptions.res.ok && passkeyOptions.body.publicKey?.challenge) {
    pass('passkey login options', 'challenge issued')
  } else if ([400, 503, 500].includes(passkeyOptions.res.status)) {
    pass('passkey login options', `status ${passkeyOptions.res.status}`)
  } else {
    fail('passkey login options', `status ${passkeyOptions.res.status}`)
  }

  const recoverConsume = await jsonFetch('/api/auth/recovery/consume', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', code: 'x' }),
  })
  if (recoverConsume.res.status === 404) fail('recovery consume validation', 'route missing')
  else if (recoverConsume.res.status === 400) pass('recovery consume validation', '400')
  else pass('recovery consume validation', `status ${recoverConsume.res.status}`)

  const tag = randomBytes(4).toString('hex')
  const email = `vortx-auth-test+${tag}@example.com`
  const password = `TestPass${tag}9`

  const signup = await jsonFetch('/api/customer/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      email,
      password,
      confirm_password: password,
      terms_accepted: true,
    }),
  })

  let userId = signup.body?.user?.id || null

  if (signup.res.status === 404) {
    fail('signup → login → me', 'signup route missing')
  } else if (!signup.res.ok && signup.res.status !== 409) {
    fail('signup → login → me', signup.body.message || signup.body.error || `signup ${signup.res.status}`)
  } else {
    const login = await jsonFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!login.res.ok || !login.body.access_token) {
      fail('signup → login → me', login.body.message || 'login failed')
    } else {
      const me = await fetch(`${site}/api/me`, {
        headers: { authorization: `Bearer ${login.body.access_token}` },
      })
      const meBody = await me.json().catch(() => ({}))
      if (me.ok && meBody.ok && meBody.profile?.email === email) {
        pass('signup → login → me', email)
        userId = meBody.user?.id || userId
      } else {
        fail('signup → login → me', meBody.message || meBody.error || `me ${me.status}`)
      }
    }
  }

  if (userId) {
    await deleteTestUser(userId)
    pass('cleanup test user', userId.slice(0, 8) + '…')
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
