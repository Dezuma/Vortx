const buckets = new Map()

function clientIp(request) {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

function pruneBucket(key, windowMs, now) {
  const bucket = buckets.get(key)
  if (!bucket) return []
  const fresh = bucket.filter((ts) => now - ts < windowMs)
  if (fresh.length) buckets.set(key, fresh)
  else buckets.delete(key)
  return fresh
}

/**
 * Per-isolate sliding window rate limit. Returns null if allowed, or retry-after seconds.
 */
export function rateLimit(
  request,
  { keyPrefix, limit, windowMs = 60_000, key: explicitKey = '' },
) {
  const ip = clientIp(request)
  const key = `${keyPrefix}:${String(explicitKey || ip).slice(0, 160)}`
  const now = Date.now()
  const hits = pruneBucket(key, windowMs, now)
  if (hits.length >= limit) {
    const oldest = hits[0]
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000))
    return retryAfter
  }
  hits.push(now)
  buckets.set(key, hits)
  return null
}

export function rateLimitResponse(retryAfter) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: 'rate_limited',
      message: 'Too many requests. Try again shortly.',
      retry_after_seconds: retryAfter,
    }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'retry-after': String(retryAfter),
      },
    },
  )
}
