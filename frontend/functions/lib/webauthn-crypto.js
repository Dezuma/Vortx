/** WebAuthn helpers for Cloudflare Workers (Web Crypto only). */

export function bytesToB64url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let bin = ''
  for (const b of arr) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function b64urlToBytes(value) {
  const raw = String(value || '')
  if (!raw || raw.length > 16_384) throw new Error('invalid_b64url')
  const pad = raw.replace(/-/g, '+').replace(/_/g, '/')
  const padded = pad + '='.repeat((4 - (pad.length % 4)) % 4)
  const bin = atob(padded)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

export function randomB64url(byteLength = 32) {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytesToB64url(bytes)
}

export function originFromRequest(request, env) {
  const explicit = String(env?.PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')
  if (explicit) return explicit
  return new URL(request.url).origin
}

export function rpIdFromOrigin(origin) {
  return new URL(origin).hostname
}

export function isAllowedOrigin(actual, expected) {
  try {
    const a = new URL(actual)
    const e = new URL(expected)
    return a.origin === e.origin
  } catch {
    return false
  }
}

export async function sha256Bytes(data) {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data)
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buf))
}

export async function sha256Hex(text) {
  const bytes = await sha256Bytes(new TextEncoder().encode(String(text)))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function timingSafeEqualHex(a, b) {
  const left = String(a || '')
  const right = String(b || '')
  if (left.length !== right.length || left.length === 0) return false
  let diff = 0
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  return diff === 0
}

export function normalizeRecoveryCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export function formatRecoveryCode(bytes) {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`
}

export async function generateRecoveryCodes(userId, count = 8) {
  const codes = []
  const hashes = []
  for (let i = 0; i < count; i += 1) {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    const code = formatRecoveryCode(bytes)
    codes.push(code)
    hashes.push(await hashRecoveryCode(userId, code))
  }
  return { codes, hashes }
}

export async function hashRecoveryCode(userId, code) {
  const normalized = normalizeRecoveryCode(code)
  if (normalized.length < 12) throw new Error('invalid_recovery_code')
  return sha256Hex(`vortx-recovery-v1:${userId}:${normalized}`)
}

function readCborLength(view, offset, addl) {
  if (addl < 24) return { value: addl, offset }
  if (addl === 24) return { value: view[offset], offset: offset + 1 }
  if (addl === 25) {
    return { value: (view[offset] << 8) | view[offset + 1], offset: offset + 2 }
  }
  if (addl === 26) {
    return {
      value:
        (view[offset] << 24) |
        (view[offset + 1] << 16) |
        (view[offset + 2] << 8) |
        view[offset + 3],
      offset: offset + 4,
    }
  }
  throw new Error('cbor_length')
}

export function decodeCbor(bytes, start = 0) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let offset = start

  function read() {
    if (offset >= view.length) throw new Error('cbor_truncated')
    const ib = view[offset]
    offset += 1
    const major = ib >> 5
    const addl = ib & 31
    const len = readCborLength(view, offset, addl)
    offset = len.offset
    const n = len.value
    if (major === 0) return n
    if (major === 1) return -1 - n
    if (major === 2) {
      const slice = view.slice(offset, offset + n)
      offset += n
      return slice
    }
    if (major === 3) {
      const slice = view.slice(offset, offset + n)
      offset += n
      return new TextDecoder().decode(slice)
    }
    if (major === 4) {
      const arr = []
      for (let i = 0; i < n; i += 1) arr.push(read())
      return arr
    }
    if (major === 5) {
      const map = new Map()
      for (let i = 0; i < n; i += 1) map.set(read(), read())
      return map
    }
    if (major === 6) return read()
    if (major === 7) {
      if (addl === 20) return false
      if (addl === 21) return true
      if (addl === 22) return null
    }
    throw new Error('cbor_unsupported')
  }

  const value = read()
  return { value, offset }
}

export function parseAttestationObject(b64url) {
  const { value } = decodeCbor(b64urlToBytes(b64url))
  if (!(value instanceof Map)) throw new Error('attestation_invalid')
  const authData = value.get('authData')
  if (!(authData instanceof Uint8Array)) throw new Error('attestation_authData')
  return { fmt: value.get('fmt'), authData }
}

export function parseAuthenticatorData(authData) {
  const data = authData instanceof Uint8Array ? authData : new Uint8Array(authData)
  if (data.length < 37) throw new Error('authData_short')
  const rpIdHash = data.slice(0, 32)
  const flags = data[32]
  const counter = new DataView(data.buffer, data.byteOffset + 33, 4).getUint32(0)
  return { rpIdHash, flags, counter, rest: data.slice(37), raw: data }
}

export function parseAttestedCredential(authData) {
  const parsed = parseAuthenticatorData(authData)
  if ((parsed.flags & 0x40) === 0) throw new Error('attestation_missing')
  const rest = parsed.rest
  if (rest.length < 18) throw new Error('cred_data_short')
  const credIdLen = (rest[16] << 8) | rest[17]
  const credId = rest.slice(18, 18 + credIdLen)
  const coseBytes = rest.slice(18 + credIdLen)
  const { value: cose } = decodeCbor(coseBytes)
  if (!(cose instanceof Map)) throw new Error('cose_invalid')
  const x = cose.get(-2)
  const y = cose.get(-3)
  const alg = cose.get(3)
  if (alg !== -7 || !(x instanceof Uint8Array) || !(y instanceof Uint8Array)) {
    throw new Error('unsupported_alg')
  }
  return {
    ...parsed,
    credentialId: credId,
    publicKeyJwk: {
      kty: 'EC',
      crv: 'P-256',
      x: bytesToB64url(x),
      y: bytesToB64url(y),
      ext: true,
    },
  }
}

export async function parseClientData(b64url, expected) {
  const json = JSON.parse(new TextDecoder().decode(b64urlToBytes(b64url)))
  if (json.type !== expected.type) throw new Error('clientData_type')
  if (!isAllowedOrigin(json.origin, expected.origin)) throw new Error('clientData_origin')
  const challenge = String(json.challenge || '')
  if (challenge !== expected.challenge) throw new Error('clientData_challenge')
  return json
}

function derToRaw(signature) {
  const der = signature instanceof Uint8Array ? signature : new Uint8Array(signature)
  if (der.length === 64) return der
  if (der[0] !== 0x30) throw new Error('sig_der')
  let offset = 2
  if (der[1] & 0x80) offset = 2 + (der[1] & 0x7f)
  if (der[offset] !== 0x02) throw new Error('sig_r')
  const rLen = der[offset + 1]
  let r = der.slice(offset + 2, offset + 2 + rLen)
  offset = offset + 2 + rLen
  if (der[offset] !== 0x02) throw new Error('sig_s')
  const sLen = der[offset + 1]
  let s = der.slice(offset + 2, offset + 2 + sLen)
  if (r[0] === 0x00) r = r.slice(1)
  if (s[0] === 0x00) s = s.slice(1)
  const raw = new Uint8Array(64)
  raw.set(r, 32 - r.length)
  raw.set(s, 64 - s.length)
  return raw
}

export async function verifyAssertionSignature(publicKeyJwk, authenticatorData, clientDataJSON, signature) {
  const key = await crypto.subtle.importKey(
    'jwk',
    { ...publicKeyJwk, key_ops: ['verify'] },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  )
  const clientHash = await sha256Bytes(b64urlToBytes(clientDataJSON))
  const authData = b64urlToBytes(authenticatorData)
  const signed = new Uint8Array(authData.length + clientHash.length)
  signed.set(authData, 0)
  signed.set(clientHash, authData.length)
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    derToRaw(b64urlToBytes(signature)),
    signed,
  )
}

export async function rpIdHashMatches(authData, rpId) {
  const parsed = parseAuthenticatorData(b64urlToBytes(authData))
  const expected = await sha256Bytes(new TextEncoder().encode(rpId))
  if (parsed.rpIdHash.length !== expected.length) return { ok: false, parsed }
  let diff = 0
  for (let i = 0; i < expected.length; i += 1) diff |= parsed.rpIdHash[i] ^ expected[i]
  return { ok: diff === 0, parsed }
}

export function userPresent(flags) {
  return (flags & 0x01) !== 0
}
