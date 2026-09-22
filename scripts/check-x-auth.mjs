import { createHmac, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

function readDevVars() {
  const env = {}
  const text = readFileSync('.dev.vars', 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

function encode(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function oauth1Header(env, method, rawUrl, extraParams = {}) {
  const url = new URL(rawUrl)
  const oauthParams = {
    oauth_consumer_key: env.X_API_KEY,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_token: env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
  }

  const params = new URLSearchParams(url.search)
  for (const [key, value] of Object.entries(extraParams)) params.append(key, value)
  for (const [key, value] of Object.entries(oauthParams)) params.append(key, value)

  const normalized = [...params.entries()]
    .sort(([aKey, aValue], [bKey, bValue]) =>
      aKey === bKey ? String(aValue).localeCompare(String(bValue)) : String(aKey).localeCompare(String(bKey)),
    )
    .map(([key, value]) => `${encode(key)}=${encode(value)}`)
    .join('&')

  const baseUrl = `${url.origin}${url.pathname}`
  const baseString = [method.toUpperCase(), encode(baseUrl), encode(normalized)].join('&')
  const signingKey = `${encode(env.X_API_SECRET)}&${encode(env.X_ACCESS_TOKEN_SECRET)}`
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64')

  return `OAuth ${Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([key, value]) => `${encode(key)}="${encode(value)}"`)
    .join(', ')}`
}

function required(name, value) {
  if (!value) throw new Error(`${name} is missing`)
}

async function check(label, fn) {
  try {
    const result = await fn()
    console.log(`${label}: ${result}`)
  } catch (error) {
    console.log(`${label}: FAIL - ${String(error.message || error).slice(0, 220)}`)
  }
}

const env = readDevVars()

console.log('X env presence:')
for (const key of [
  'X_API_KEY',
  'X_API_SECRET',
  'X_BEARER_TOKEN',
  'X_ACCESS_TOKEN',
  'X_ACCESS_TOKEN_SECRET',
  'X_OAUTH2_USER_TOKEN',
]) {
  console.log(`  ${key}: ${env[key] ? 'set' : 'blank'}`)
}

await check('OAuth1 user context / account verify', async () => {
  required('X_API_KEY', env.X_API_KEY)
  required('X_API_SECRET', env.X_API_SECRET)
  required('X_ACCESS_TOKEN', env.X_ACCESS_TOKEN)
  required('X_ACCESS_TOKEN_SECRET', env.X_ACCESS_TOKEN_SECRET)

  const url = 'https://api.twitter.com/1.1/account/verify_credentials.json?skip_status=true'
  const response = await fetch(url, { headers: { authorization: oauth1Header(env, 'GET', url) } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.errors?.[0]?.message || payload?.detail || `HTTP ${response.status}`)
  return `OK (@${payload.screen_name || 'unknown'})`
})

await check('OAuth1 user context / v2 users/me', async () => {
  required('X_API_KEY', env.X_API_KEY)
  required('X_API_SECRET', env.X_API_SECRET)
  required('X_ACCESS_TOKEN', env.X_ACCESS_TOKEN)
  required('X_ACCESS_TOKEN_SECRET', env.X_ACCESS_TOKEN_SECRET)

  const url = 'https://api.twitter.com/2/users/me'
  const response = await fetch(url, { headers: { authorization: oauth1Header(env, 'GET', url) } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.errors?.[0]?.message || payload?.detail || `HTTP ${response.status}`)
  return `OK (${payload.data?.username ? `@${payload.data.username}` : payload.data?.id || 'user'})`
})

await check('OAuth2 bearer / app read probe', async () => {
  required('X_BEARER_TOKEN', env.X_BEARER_TOKEN)

  const url = 'https://api.twitter.com/2/tweets/search/recent?query=from:TwitterDev&max_results=10'
  const response = await fetch(url, { headers: { authorization: `Bearer ${env.X_BEARER_TOKEN}` } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.errors?.[0]?.message || payload?.detail || `HTTP ${response.status}`)
  return 'OK'
})

await check('OAuth2 user token / users/me', async () => {
  required('X_OAUTH2_USER_TOKEN', env.X_OAUTH2_USER_TOKEN)

  const url = 'https://api.twitter.com/2/users/me'
  const response = await fetch(url, { headers: { authorization: `Bearer ${env.X_OAUTH2_USER_TOKEN}` } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.errors?.[0]?.message || payload?.detail || `HTTP ${response.status}`)
  return `OK (${payload.data?.username ? `@${payload.data.username}` : payload.data?.id || 'user'})`
})

