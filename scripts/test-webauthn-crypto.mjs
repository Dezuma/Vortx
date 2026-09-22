#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  b64urlToBytes,
  bytesToB64url,
  decodeCbor,
  generateRecoveryCodes,
  hashRecoveryCode,
  isAllowedOrigin,
  normalizeRecoveryCode,
  rpIdFromOrigin,
  timingSafeEqualHex,
} from '../frontend/functions/lib/webauthn-crypto.js'

const sample = new Uint8Array([1, 2, 250, 255])
assert.deepEqual(b64urlToBytes(bytesToB64url(sample)), sample)

assert.equal(isAllowedOrigin('https://vortxmkt.com', 'https://vortxmkt.com'), true)
assert.equal(isAllowedOrigin('https://evil.com', 'https://vortxmkt.com'), false)
assert.equal(rpIdFromOrigin('https://vortxmkt.com'), 'vortxmkt.com')

assert.equal(normalizeRecoveryCode('ab12-cd34-ef56-7890'), 'AB12CD34EF567890')

const userId = '11111111-1111-4111-8111-111111111111'
const generated = await generateRecoveryCodes(userId, 8)
assert.equal(generated.codes.length, 8)
assert.equal(generated.hashes.length, 8)
assert.equal(new Set(generated.codes).size, 8)
const hashed = await hashRecoveryCode(userId, generated.codes[0])
assert.equal(hashed, generated.hashes[0])
assert.equal(timingSafeEqualHex(hashed, generated.hashes[0]), true)
assert.equal(timingSafeEqualHex(hashed, generated.hashes[1]), false)

const otherUser = await hashRecoveryCode('22222222-2222-4222-8222-222222222222', generated.codes[0])
assert.notEqual(otherUser, hashed)

const encoded = new Uint8Array([0xa1, 0x63, 0x66, 0x6d, 0x74, 0x64, 0x6e, 0x6f, 0x6e, 0x65])
const { value } = decodeCbor(encoded)
assert.equal(value instanceof Map, true)
assert.equal(value.get('fmt'), 'none')

let threw = false
try {
  await hashRecoveryCode(userId, 'short')
} catch {
  threw = true
}
assert.equal(threw, true)

console.log('ok  webauthn-crypto b64url, origin, recovery hashes, cbor')
