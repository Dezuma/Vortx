/** Opaque public signal URLs — do not embed company names in paths. */

export function slugifyPublicName(value) {
  return String(value || 'signal')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'signal'
}

export function publicSignalName(value) {
  return String(value || '').split('(')[0].trim()
}

export function opaqueSignalSlug(entityId) {
  const id = String(entityId || '').trim()
  if (!/^[\da-f-]{36}$/i.test(id)) return 'sig-unknown'
  return `sig-${id}`
}

export function legacySignalSlugs(entityName, eventId) {
  const short = slugifyPublicName(publicSignalName(entityName))
  const suffix = String(eventId || '').slice(0, 8)
  return {
    short,
    long: suffix ? `${short}-${suffix}` : short,
  }
}

export function resolveSignalSlug(signals, requested) {
  const needle = String(requested || '').trim().replace(/\/$/, '')
  if (!needle) {
    return { signal: signals[0] || null, redirectTo: null }
  }

  let match = signals.find((row) => row.signal_slug === needle || row.signal_short_slug === needle)
  if (match) return { signal: match, redirectTo: null }

  match = signals.find((row) => row._legacy_short === needle || row._legacy_long === needle)
  if (match) return { signal: match, redirectTo: match.signal_slug }

  return { signal: null, redirectTo: null }
}

export function stripInternalSignalFields(row) {
  const { _legacy_short, _legacy_long, entity_name_raw, ...rest } = row
  return rest
}
