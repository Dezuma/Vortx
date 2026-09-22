import {
  TICKER_CACHE_KEY,
  TICKER_CACHE_TTL_SECONDS,
  type TickerCachePayload,
  type TickerCacheStore,
} from '../_shared/match-ticker-core.ts'

type CloudflareKvBinding = {
  get(key: string, options?: { type?: 'json' | 'text' }): Promise<unknown>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

export function createKvBindingStore(kv: CloudflareKvBinding): TickerCacheStore {
  return {
    async get() {
      try {
        const payload = await kv.get(TICKER_CACHE_KEY, { type: 'json' })
        if (!payload || typeof payload !== 'object') return null
        const record = payload as TickerCachePayload
        if (!Array.isArray(record.entries) || typeof record.fetchedAt !== 'number') return null
        return record
      } catch {
        return null
      }
    },
    async put(payload) {
      try {
        await kv.put(TICKER_CACHE_KEY, JSON.stringify(payload), {
          expirationTtl: TICKER_CACHE_TTL_SECONDS,
        })
      } catch {
        // Cache write failures must not block matching.
      }
    },
  }
}

export function createMemoryTickerCache(): TickerCacheStore {
  let payload: TickerCachePayload | null = null
  return {
    async get() {
      return payload
    },
    async put(next) {
      payload = next
    },
  }
}

export function createCloudflareRestKvStore(options: {
  accountId: string
  apiToken: string
  namespaceId: string
}): TickerCacheStore {
  const base = `https://api.cloudflare.com/client/v4/accounts/${options.accountId}/storage/kv/namespaces/${options.namespaceId}/values/${encodeURIComponent(TICKER_CACHE_KEY)}`

  return {
    async get() {
      try {
        const response = await fetch(base, {
          headers: {
            Authorization: `Bearer ${options.apiToken}`,
          },
        })
        if (response.status === 404) return null
        if (!response.ok) return null
        const text = await response.text()
        if (!text) return null
        const record = JSON.parse(text) as TickerCachePayload
        if (!Array.isArray(record.entries) || typeof record.fetchedAt !== 'number') return null
        return record
      } catch {
        return null
      }
    },
    async put(payload) {
      const url = `${base}?expiration_ttl=${TICKER_CACHE_TTL_SECONDS}`
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${options.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error(`cloudflare_kv_put_failed:${response.status}`)
      }
    },
  }
}

export function resolveTickerCacheStore(): TickerCacheStore {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')?.trim() || ''
  const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')?.trim() || ''
  const namespaceId =
    Deno.env.get('TICKER_CACHE_NAMESPACE_ID')?.trim() ||
    Deno.env.get('CLOUDFLARE_TICKER_CACHE_NAMESPACE_ID')?.trim() ||
    ''

  if (accountId && apiToken && namespaceId) {
    return createCloudflareRestKvStore({ accountId, apiToken, namespaceId })
  }

  return createMemoryTickerCache()
}
