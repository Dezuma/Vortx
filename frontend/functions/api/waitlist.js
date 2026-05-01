function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      ...(init.headers || {}),
    },
  })
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function supabaseFetch(env, path, init = {}) {
  const url = String(env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const hasServiceRole = Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    return {
      ok: false,
      status: 503,
      json: async () => ({ message: 'Supabase URL/key missing in Worker environment.' }),
    }
  }

  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: hasServiceRole ? 'resolution=merge-duplicates,return=representation' : 'return=minimal',
      ...(init.headers || {}),
    },
  })
}

export async function onRequestPost({ request, env }) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const email = String(body.email || '').trim().toLowerCase()
  const source = String(body.source || 'site').trim().slice(0, 64) || 'site'

  if (!validEmail(email)) {
    return json({ ok: false, error: 'invalid_email', message: 'Enter a valid email address.' }, { status: 400 })
  }

  const hasServiceRole = Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  const path = hasServiceRole ? 'waitlist_signups?on_conflict=email' : 'waitlist_signups'
  const res = await supabaseFetch(env, path, {
    method: 'POST',
    body: JSON.stringify([
      {
        email,
        source,
        metadata: {
          user_agent: request.headers.get('user-agent') || null,
          referer: request.headers.get('referer') || null,
        },
      },
    ]),
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    if (payload.code === '23505') {
      return json({ ok: true, status: 'existing' })
    }
    return json(
      {
        ok: false,
        error: 'supabase_error',
        message: payload.message || 'Could not save waitlist signup.',
      },
      { status: res.status },
    )
  }

  return json({ ok: true, status: 'created' })
}

export function onRequestOptions() {
  return json({ ok: true })
}

export function onRequestGet() {
  return json({ ok: false, error: 'method_not_allowed', message: 'POST { "email": "you@example.com" }' }, { status: 405 })
}
