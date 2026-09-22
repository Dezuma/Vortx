import { supabaseRest } from './supabase-rest.js'

export class EnterpriseApiAuthError extends Error {
  constructor(code, status) {
    super(code)
    this.code = code
    this.status = status
  }
}

/**
 * Read an Enterprise API key from supported request headers.
 * @param {Request} request Incoming HTTP request.
 * @returns {string} Raw key for immediate hashing; callers must never log it.
 * @example enterpriseApiKeyFromRequest(new Request(url, { headers: { 'x-vortx-api-key': key } }))
 */
export function enterpriseApiKeyFromRequest(request) {
  const explicit = String(request.headers.get('x-vortx-api-key') || '').trim()
  if (explicit) return explicit
  const authorization = String(request.headers.get('authorization') || '')
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || ''
}

/**
 * Hash an API key with SHA-256 for database lookup.
 * @param {string} value Raw API key.
 * @returns {Promise<string>} Lowercase hexadecimal digest.
 * @example await sha256Hex('vx_map_example')
 */
export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(String(value || '')),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Authenticate an active Enterprise (`galactic`) API subscriber.
 * @param {Request} request Incoming API request.
 * @param {object} env Worker environment.
 * @param {{lookup?: Function}} options Optional lookup injection for tests.
 * @returns {Promise<{subscriber: object, tokenHash: string}>} Authenticated subscriber and safe key hash.
 * @example await authenticateEnterpriseMapApi(request, env)
 */
export async function authenticateEnterpriseMapApi(
  request,
  env,
  { lookup = supabaseRest } = {},
) {
  const token = enterpriseApiKeyFromRequest(request)
  if (
    token.length < 24 ||
    token.length > 256 ||
    /\s/.test(token)
  ) {
    throw new EnterpriseApiAuthError('invalid_api_key', 401)
  }
  const tokenHash = await sha256Hex(token)
  const rows = await lookup(
    env,
    `api_subscribers?select=id,owner_email,plan,status&token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`,
  ).catch(() => [])
  const subscriber = rows?.[0]
  if (!subscriber || subscriber.status !== 'active') {
    throw new EnterpriseApiAuthError('invalid_api_key', 401)
  }
  if (String(subscriber.plan || '').trim() !== 'galactic') {
    throw new EnterpriseApiAuthError('enterprise_required', 403)
  }
  return {
    subscriber,
    tokenHash,
  }
}

/**
 * Convert an Enterprise authentication failure into a safe JSON response.
 * @param {EnterpriseApiAuthError|Error} error Authentication error.
 * @returns {Response} A 401 or 403 no-store response.
 * @example return enterpriseApiAuthResponse(error)
 */
export function enterpriseApiAuthResponse(error) {
  const status = Number(error?.status) || 401
  const code = error?.code || 'invalid_api_key'
  return new Response(
    JSON.stringify({
      ok: false,
      error: code,
      message:
        code === 'enterprise_required'
          ? 'Enterprise API access is required.'
          : 'A valid Enterprise API key is required.',
    }),
    {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...(status === 401
          ? { 'www-authenticate': 'Bearer realm="Vortx Enterprise Map API"' }
          : {}),
      },
    },
  )
}
