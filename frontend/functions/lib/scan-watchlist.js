const MAX_ENTITY_IDS = 50

/** Plans present in entitlements (service_requests.plan FK). */
const ENTITLEMENT_PLANS = new Set(['nebula', 'supernova', 'galactic', 'custom', 'scout', 'sentinel', 'pulsar'])

/** Maps checkout plan to a row allowed by service_requests.plan → entitlements FK. */
export function normalizeServicePlan(plan) {
  const value = String(plan || 'nebula').trim().toLowerCase()
  if (ENTITLEMENT_PLANS.has(value)) return value
  const aliases = { starter: 'scout', pro: 'sentinel' }
  const mapped = aliases[value] || value
  if (ENTITLEMENT_PLANS.has(mapped)) return mapped
  const fallback = { scout: 'nebula', sentinel: 'nebula', pulsar: 'supernova' }
  return fallback[mapped] || 'nebula'
}

export function parseEntityIdList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((id) => String(id || '').trim()).filter(Boolean))].slice(0, MAX_ENTITY_IDS)
  }
  return [
    ...new Set(
      String(value || '')
        .split(/[,;\s]+/)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_ENTITY_IDS)
}

export async function fetchEntityNames(env, supabaseRest, entityIds) {
  if (!entityIds.length) return []
  const filter = entityIds.map((id) => encodeURIComponent(id)).join(',')
  const rows = await supabaseRest(env, `entities?select=id,canonical_name&id=in.(${filter})`)
  const byId = new Map((rows || []).map((row) => [row.id, row.canonical_name]))
  return entityIds.map((id) => ({ id, name: byId.get(id) || id }))
}

async function resolveUserIdForEmail(env, supabaseRest, email) {
  const rows = await supabaseRest(
    env,
    `app_profiles?select=user_id&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`,
  ).catch(() => null)
  return rows?.[0]?.user_id || null
}

export async function createEntityWatchlist(env, supabaseRest, { email, entityIds, source = 'blind_spot_scan', label }) {
  const ids = parseEntityIdList(entityIds)
  if (!email || !ids.length) return null

  const userId = await resolveUserIdForEmail(env, supabaseRest, email)
  if (!userId) return null

  const named = await fetchEntityNames(env, supabaseRest, ids)
  const watchlistLabel =
    label ||
    `Scan watchlist (${ids.length} entit${ids.length === 1 ? 'y' : 'ies'})`

  try {
    const rows = await supabaseRest(env, 'entity_watchlists', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify([
        {
          user_id: userId,
          label: watchlistLabel.slice(0, 200),
          entity_ids: ids,
          source,
          metadata: {
            auto_created: true,
            entity_names: named.map((row) => row.name).slice(0, 50),
          },
        },
      ]),
    })
    const watchlist = rows?.[0] || null
    if (watchlist?.id && ids.length) {
      await supabaseRest(env, 'entity_watchlist_members', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(
          ids.map((entityId) => ({
            watchlist_id: watchlist.id,
            entity_id: entityId,
          })),
        ),
      }).catch(() => null)
    }
    return watchlist
  } catch {
    return null
  }
}

export async function queueScanWatchlistSetup(env, supabaseRest, { email, plan, entityIds, source = 'blind_spot_scan' }) {
  const ids = parseEntityIdList(entityIds)
  if (!email || !ids.length) return null

  await createEntityWatchlist(env, supabaseRest, { email, entityIds: ids, source }).catch(() => null)

  const named = await fetchEntityNames(env, supabaseRest, ids)
  const lines = named.map((row) => `- ${row.name} (${row.id})`)
  const details = [
    'Auto-queued from blind spot scan checkout.',
    '',
    'Entity IDs to add to the subscriber watchlist:',
    ...lines,
  ].join('\n')

  const rows = await supabaseRest(env, 'service_requests', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify([
      {
        owner_email: email.toLowerCase(),
        request_type: 'watchlist_setup',
        subject: `Pre-load watchlist (${ids.length} scanned entit${ids.length === 1 ? 'y' : 'ies'})`,
        details: details.slice(0, 4000),
        plan: normalizeServicePlan(plan),
        priority: 'high',
        status: 'queued',
        metadata: {
          source,
          entity_ids: ids,
          auto_queued: true,
        },
      },
    ]),
  })

  return rows?.[0] || null
}
