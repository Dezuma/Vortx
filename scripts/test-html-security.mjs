#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  applyHtmlSecurity,
  createCspNonce,
  securityHeaderMap,
} from '../frontend/functions/lib/html-security.js'

const nonce = createCspNonce()
assert.match(nonce, /^[A-Za-z0-9_-]+$/)
assert.equal(createCspNonce() === nonce, false)

const headers = securityHeaderMap(nonce)
assert.match(headers['content-security-policy'], new RegExp(`script-src 'self' 'nonce-${nonce}'`))
assert.match(headers['content-security-policy'], /trusted-types default/)
assert.match(headers['content-security-policy'], /require-trusted-types-for 'script'/)
assert.match(headers['permissions-policy'], /publickey-credentials-get=\(self\)/)
assert.match(headers['permissions-policy'], /publickey-credentials-create=\(self\)/)
assert.equal(headers['strict-transport-security'], 'max-age=31536000; includeSubDomains')

const html = applyHtmlSecurity(
  '<!doctype html><html><head><title>t</title></head><body><script src="/app.js"></script></body></html>',
  nonce,
)
assert.match(html, /src="\/trusted-types\.js"/)
assert.match(html, /src="\/passkeys\.js\?v=2"/)
assert.match(html, new RegExp(`<script nonce="${nonce}" src="/app.js"`))

const injected = applyHtmlSecurity('<html><head></head><script>alert(1)</script></html>', nonce)
assert.doesNotMatch(injected, /<script>/)
assert.match(injected, new RegExp(`<script nonce="${nonce}"`))

console.log('ok  html-security nonce, CSP, Trusted Types, passkey Permissions-Policy')
