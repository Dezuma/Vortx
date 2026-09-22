import {
  bearerToken,
  hasSupabase,
  json,
  supabaseAuthUser,
  supabaseRest,
} from '../lib/supabase-rest.js'
import { getSupabasePublishableKey, getSupabaseServiceRoleKey, getSupabaseUrl } from '../lib/worker-env.js'
import {
  b64urlToBytes,
  bytesToB64url,
  generateRecoveryCodes,
  hashRecoveryCode,
  originFromRequest,
  parseAttestationObject,
  parseAttestedCredential,
  parseClientData,
  randomB64url,
  rpIdFromOrigin,
  rpIdHashMatches,
  timingSafeEqualHex,
  userPresent,
  verifyAssertionSignature,
} from '../lib/webauthn-crypto.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CHALLENGE_TTL_MS = 5 * 60 * 1000

function fail(status, error, message) {
  return json({ ok: false, error, message }, { status })
}

async function requireUser(request, env) {
  const token = bearerToken(request)
  if (!token) {
    const err = new Error('missing_bearer_token')
    err.status = 401
    throw err
  }
  return supabaseAuthUser(env, token)
}

function relyingParty(request, env) {
  const origin = originFromRequest(request, env)
  return { origin, rpId: rpIdFromOrigin(origin) }
}

async function insertChallenge(env, row) {
  const created = await supabaseRest(env, 'webauthn_challenges', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(row),
  })
  return Array.isArray(created) ? created[0] : created
}

async function loadChallenge(env, id, purpose) {
  const rows = await supabaseRest(
    env,
    `webauthn_challenges?id=eq.${encodeURIComponent(id)}&purpose=eq.${encodeURIComponent(purpose)}&select=*`,
  )
  const row = Array.isArray(rows) ? rows[0] : null
  if (!row) return null
  if (Date.parse(row.expires_at) < Date.now()) {
    await supabaseRest(env, `webauthn_challenges?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
    return null
  }
  return row
}

async function consumeChallenge(env, id) {
  await supabaseRest(env, `webauthn_challenges?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
}

async function lookupUserByEmail(env, email) {
  const rows = await supabaseRest(
    env,
    `app_profiles?email=eq.${encodeURIComponent(email)}&select=user_id,email`,
  )
  const row = Array.isArray(rows) ? rows[0] : null
  if (!row?.user_id) return null
  return { id: row.user_id, email: row.email }
}

async function lookupUserById(env, userId) {
  const url = getSupabaseUrl(env)
  const key = getSupabaseServiceRoleKey(env)
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  })
  if (!response.ok) return null
  return response.json()
}

export async function issueSessionForEmail(env, email) {
  const url = getSupabaseUrl(env)
  const service = getSupabaseServiceRoleKey(env)
  const anon = getSupabasePublishableKey(env)
  const generated = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: service,
      authorization: `Bearer ${service}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  })
  const payload = await generated.json().catch(() => ({}))
  const hashed = payload.hashed_token || payload.properties?.hashed_token
  if (!generated.ok || !hashed) {
    const error = new Error(payload.msg || payload.message || 'session_grant_failed')
    error.status = 502
    throw error
  }

  for (const type of ['magiclink', 'email']) {
    const verified = await fetch(`${url}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: anon, 'content-type': 'application/json' },
      body: JSON.stringify({ type, token_hash: hashed }),
    })
    const session = await verified.json().catch(() => ({}))
    if (verified.ok && session.access_token) {
      return {
        ok: true,
        access_token: session.access_token,
        refresh_token: session.refresh_token || null,
        user: session.user || null,
      }
    }
  }
  const error = new Error('session_grant_failed')
  error.status = 502
  throw error
}

export async function onPasskeyRegisterOptions({ request, env }) {
  try {
    if (!hasSupabase(env)) return fail(503, 'supabase_unconfigured', 'Passkeys are not available.')
    const user = await requireUser(request, env)
    const { origin, rpId } = relyingParty(request, env)
    const challenge = randomB64url(32)
    const existing = await supabaseRest(
      env,
      `webauthn_credentials?user_id=eq.${encodeURIComponent(user.id)}&select=credential_id,transports`,
    )
    const row = await insertChallenge(env, {
      user_id: user.id,
      challenge,
      purpose: 'register',
      user_verification: 'preferred',
      expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    })
    return json({
      ok: true,
      challenge_id: row.id,
      publicKey: {
        challenge,
        rp: { id: rpId, name: 'Vortx' },
        user: {
          id: bytesToB64url(new TextEncoder().encode(user.id)),
          name: user.email,
          displayName: user.email,
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        timeout: 300000,
        attestation: 'none',
        authenticatorSelection: {
          residentKey: 'required',
          requireResidentKey: true,
          userVerification: 'preferred',
        },
        excludeCredentials: (existing || []).map((item) => ({
          type: 'public-key',
          id: item.credential_id,
          transports: item.transports || undefined,
        })),
        extensions: {},
      },
      origin,
    })
  } catch (error) {
    return fail(error.status || 500, 'passkey_register_options_failed', 'Could not start passkey registration.')
  }
}

export async function onPasskeyRegisterVerify({ request, env }) {
  try {
    if (!hasSupabase(env)) return fail(503, 'supabase_unconfigured', 'Passkeys are not available.')
    const user = await requireUser(request, env)
    const body = await request.json()
    const challengeRow = await loadChallenge(env, String(body.challenge_id || ''), 'register')
    if (!challengeRow || challengeRow.user_id !== user.id) {
      return fail(400, 'challenge_invalid', 'Passkey registration expired. Try again.')
    }
    const { origin, rpId } = relyingParty(request, env)
    await parseClientData(body.response?.clientDataJSON, {
      type: 'webauthn.create',
      origin,
      challenge: challengeRow.challenge,
    })
    const { authData } = parseAttestationObject(body.response?.attestationObject)
    const attested = parseAttestedCredential(authData)
    const rpCheck = await rpIdHashMatches(bytesToB64url(attested.raw), rpId)
    if (!rpCheck.ok || !userPresent(attested.flags)) {
      return fail(400, 'authenticator_rejected', 'Authenticator could not be verified.')
    }
    await consumeChallenge(env, challengeRow.id)
    const credentialId = bytesToB64url(attested.credentialId)
    const deviceType =
      body.authenticatorAttachment === 'platform' ? 'singleDevice' : 'multiDevice'
    await supabaseRest(env, 'webauthn_credentials', {
      method: 'POST',
      body: JSON.stringify({
        user_id: user.id,
        credential_id: credentialId,
        public_key: attested.publicKeyJwk,
        sign_count: attested.counter,
        device_type: deviceType,
        backed_up: Boolean(attested.flags & 0x10),
        transports: Array.isArray(body.response?.transports) ? body.response.transports : [],
      }),
    })

    await supabaseRest(env, `recovery_codes?user_id=eq.${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
    })
    const generated = await generateRecoveryCodes(user.id)
    await supabaseRest(env, 'recovery_codes', {
      method: 'POST',
      body: JSON.stringify(
        generated.hashes.map((code_hash) => ({ user_id: user.id, code_hash })),
      ),
    })

    return json({
      ok: true,
      credential_id: credentialId,
      device_type: deviceType,
      backed_up: Boolean(attested.flags & 0x10),
      recovery_codes: generated.codes,
    })
  } catch (error) {
    return fail(error.status || 400, 'passkey_register_failed', 'Passkey registration failed.')
  }
}

export async function onPasskeyLoginOptions({ request, env }) {
  try {
    if (!hasSupabase(env)) return fail(503, 'supabase_unconfigured', 'Passkeys are not available.')
    let body = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    void body
    const { origin, rpId } = relyingParty(request, env)
    const challenge = randomB64url(32)
    const row = await insertChallenge(env, {
      user_id: null,
      challenge,
      purpose: 'authenticate',
      user_verification: 'preferred',
      expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    })
    return json({
      ok: true,
      challenge_id: row.id,
      publicKey: {
        challenge,
        rpId,
        timeout: 300000,
        userVerification: 'preferred',
      },
      origin,
    })
  } catch (error) {
    return fail(error.status || 500, 'passkey_login_options_failed', 'Could not start passkey sign-in.')
  }
}

export async function onPasskeyLoginVerify({ request, env }) {
  try {
    if (!hasSupabase(env)) return fail(503, 'supabase_unconfigured', 'Passkeys are not available.')
    const body = await request.json()
    const challengeRow = await loadChallenge(env, String(body.challenge_id || ''), 'authenticate')
    if (!challengeRow) return fail(400, 'challenge_invalid', 'Passkey sign-in expired. Try again.')
    const { origin, rpId } = relyingParty(request, env)
    await parseClientData(body.response?.clientDataJSON, {
      type: 'webauthn.get',
      origin,
      challenge: challengeRow.challenge,
    })
    const credentialId = String(body.id || body.rawId || '')
    const creds = await supabaseRest(
      env,
      `webauthn_credentials?credential_id=eq.${encodeURIComponent(credentialId)}&select=*`,
    )
    const cred = Array.isArray(creds) ? creds[0] : null
    if (!cred) return fail(404, 'unknown_credential', 'Passkey is not registered.')
    if (challengeRow.user_id && challengeRow.user_id !== cred.user_id) {
      return fail(401, 'credential_mismatch', 'Passkey does not match this account.')
    }
    const rpCheck = await rpIdHashMatches(body.response?.authenticatorData, rpId)
    if (!rpCheck.ok || !userPresent(rpCheck.parsed.flags)) {
      return fail(400, 'authenticator_rejected', 'Authenticator could not be verified.')
    }
    if (rpCheck.parsed.counter > 0 && rpCheck.parsed.counter <= Number(cred.sign_count || 0)) {
      return fail(401, 'cloned_authenticator', 'Passkey counter moved backwards.')
    }
    const ok = await verifyAssertionSignature(
      cred.public_key,
      body.response.authenticatorData,
      body.response.clientDataJSON,
      body.response.signature,
    )
    if (!ok) return fail(401, 'invalid_signature', 'Passkey verification failed.')
    await consumeChallenge(env, challengeRow.id)
    await supabaseRest(
      env,
      `webauthn_credentials?id=eq.${encodeURIComponent(cred.id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ sign_count: rpCheck.parsed.counter, last_used_at: new Date().toISOString() }),
      },
    )
    const user = await lookupUserById(env, cred.user_id)
    const email = String(user?.email || '').toLowerCase()
    if (!EMAIL_RE.test(email)) return fail(500, 'user_missing', 'Account email is unavailable.')
    const session = await issueSessionForEmail(env, email)
    return json(session)
  } catch (error) {
    return fail(error.status || 400, 'passkey_login_failed', 'Passkey sign-in failed.')
  }
}

export async function onRecoveryConsume({ request, env }) {
  try {
    if (!hasSupabase(env)) return fail(503, 'supabase_unconfigured', 'Recovery is not available.')
    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase().slice(0, 254)
    const code = String(body.code || '')
    if (!EMAIL_RE.test(email)) return fail(400, 'invalid_email', 'Email and recovery code are required.')
    const user = await lookupUserByEmail(env, email)
    if (!user?.id) return fail(401, 'invalid_recovery', 'Recovery code is invalid.')
    let hashed
    try {
      hashed = await hashRecoveryCode(user.id, code)
    } catch {
      return fail(400, 'invalid_recovery', 'Recovery code is invalid.')
    }
    const rows = await supabaseRest(
      env,
      `recovery_codes?user_id=eq.${encodeURIComponent(user.id)}&used_at=is.null&select=id,code_hash`,
    )
    const match = (rows || []).find((row) => timingSafeEqualHex(row.code_hash, hashed))
    if (!match) return fail(401, 'invalid_recovery', 'Recovery code is invalid.')
    await supabaseRest(env, `recovery_codes?id=eq.${encodeURIComponent(match.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ used_at: new Date().toISOString() }),
    })
    const session = await issueSessionForEmail(env, email)
    return json(session)
  } catch (error) {
    return fail(error.status || 400, 'recovery_failed', 'Recovery failed.')
  }
}
