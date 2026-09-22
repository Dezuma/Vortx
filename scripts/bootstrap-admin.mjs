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

function requireValue(env, key) {
  const value = String(env[key] || '').trim()
  if (!value) throw new Error(`Missing ${key} in .dev.vars`)
  return value
}

async function supabaseRequest({ url, serviceKey, path, method = 'GET', body }) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || `HTTP ${response.status}`
    throw new Error(message)
  }
  return payload
}

async function findUserByEmail({ url, serviceKey, email }) {
  const payload = await supabaseRequest({ url, serviceKey, path: '/auth/v1/admin/users?per_page=1000' })
  return (payload?.users || []).find((user) => String(user.email || '').toLowerCase() === email.toLowerCase()) || null
}

async function createOrUpdateAdminUser({ url, serviceKey, email, password }) {
  const existing = await findUserByEmail({ url, serviceKey, email })
  if (existing?.id) {
    await supabaseRequest({
      url,
      serviceKey,
      path: `/auth/v1/admin/users/${existing.id}`,
      method: 'PUT',
      body: {
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'admin' },
        app_metadata: { role: 'admin' },
      },
    })
    return { id: existing.id, action: 'updated' }
  }

  const created = await supabaseRequest({
    url,
    serviceKey,
    path: '/auth/v1/admin/users',
    method: 'POST',
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' },
      app_metadata: { role: 'admin' },
    },
  })
  return { id: created.id, action: 'created' }
}

async function upsertAdminProfile({ url, serviceKey, userId, email }) {
  const response = await fetch(`${url}/rest/v1/app_profiles?on_conflict=user_id`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([
      {
        user_id: userId,
        email,
        role: 'admin',
        plan: 'custom',
        subscription_status: 'active',
      },
    ]),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to upsert app_profiles admin row: ${response.status} ${text}`)
  }
}

async function main() {
  const env = readDevVars()
  const url = requireValue(env, 'VITE_SUPABASE_URL').replace(/\/$/, '')
  const serviceKey = requireValue(env, 'SUPABASE_SERVICE_ROLE_KEY')
  const email = requireValue(env, 'VORTX_ADMIN_BOOTSTRAP_EMAIL').toLowerCase()
  const password = requireValue(env, 'VORTX_ADMIN_BOOTSTRAP_PASSWORD')
  const adminEmails = String(env.VORTX_ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  if (!adminEmails.includes(email)) {
    throw new Error('VORTX_ADMIN_BOOTSTRAP_EMAIL must also be listed in VORTX_ADMIN_EMAILS')
  }

  const user = await createOrUpdateAdminUser({ url, serviceKey, email, password })
  await upsertAdminProfile({ url, serviceKey, userId: user.id, email })
  console.log(`Admin ${user.action}: ${email}`)
  console.log('Admin profile active: role=admin plan=custom subscription_status=active')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
