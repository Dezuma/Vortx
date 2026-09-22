export function createCspNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function securityHeaderMap(nonce) {
  const safeNonce = String(nonce || '').replace(/[^A-Za-z0-9_-]/g, '')
  return {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'permissions-policy':
      'camera=(), microphone=(), geolocation=(), payment=(self), publickey-credentials-get=(self), publickey-credentials-create=(self)',
    'content-security-policy': [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "form-action 'self' https://checkout.stripe.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      `script-src 'self' 'nonce-${safeNonce}'`,
      "worker-src 'self' blob:",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://tiles.openfreemap.org",
      "frame-src https://checkout.stripe.com",
      "trusted-types default",
      "require-trusted-types-for 'script'",
      'upgrade-insecure-requests',
    ].join('; '),
  }
}

export function applyHtmlSecurity(html, nonce) {
  const safeNonce = String(nonce || '').replace(/[^A-Za-z0-9_-]/g, '')
  let next = String(html || '')
  if (!/src=["']\/trusted-types\.js/.test(next)) {
    next = next.replace(
      /<head([^>]*)>/i,
      `<head$1><script src="/trusted-types.js" nonce="${safeNonce}"></script><script src="/passkeys.js?v=2" nonce="${safeNonce}" defer></script>`,
    )
  } else if (!/src=["']\/passkeys\.js/.test(next)) {
    next = next.replace(
      /src=["']\/trusted-types\.js["']([^>]*)>/i,
      `src="/trusted-types.js"$1></script><script src="/passkeys.js?v=2" nonce="${safeNonce}" defer>`,
    )
  }
  next = next.replace(/<script(?![^>]*\bnonce=)/gi, `<script nonce="${safeNonce}"`)
  return next
}

export async function withSecurityHeaders(response) {
  const nonce = createCspNonce()
  const headers = new Headers(response.headers)
  const type = headers.get('content-type') || ''
  let body = response.body
  if (type.includes('text/html') && response.status !== 204 && response.status !== 304) {
    body = applyHtmlSecurity(await response.text(), nonce)
  }
  for (const [key, value] of Object.entries(securityHeaderMap(nonce))) {
    headers.set(key, value)
  }
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
