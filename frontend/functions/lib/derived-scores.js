/** Shared friction/severity scoring  -  aligned with heat map derivedEntityScore pipeline. */

export function daysSince(value) {
  const timestamp = Date.parse(String(value || ''))
  if (!Number.isFinite(timestamp)) return 180
  return Math.max(0, (Date.now() - timestamp) / 86_400_000)
}

export function stableScoreJitter(seed) {
  const text = String(seed?.id || seed?.canonical_name || seed || '')
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return (hash % 17) - 8
}

export function derivedEntityScore(score, events = [], entity = null) {
  if (!events.length) return Number(score?.score ?? 0)
  const severities = events.map((event) => Number(event.severity) || 0).filter(Boolean)
  const confidences = events.map((event) => Number(event.confidence) || 0).filter(Boolean)
  const maxSeverity = severities.length ? Math.max(...severities) : Number(score?.score ?? 0)
  const avgConfidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : Number(score?.confidence ?? 70)
  const newestDays = Math.min(...events.map((event) => daysSince(event.updated_at || event.created_at || event.filing_date)))
  const recencyBoost = newestDays <= 1 ? 10 : newestDays <= 7 ? 7 : newestDays <= 30 ? 4 : 1
  const volumeBoost = Math.min(8, Math.max(0, events.length - 1) * 2)
  const typeSpread = new Set(events.map((event) => event.event_type || event.source_record_type || 'record')).size
  const typeBoost = Math.min(5, (typeSpread - 1) * 2)
  const calculated = Math.round(
    maxSeverity * 0.58 +
      avgConfidence * 0.23 +
      recencyBoost +
      volumeBoost +
      typeBoost +
      stableScoreJitter(entity),
  )
  return Math.max(35, Math.min(98, calculated))
}

const EVENT_TYPE_ADJUSTMENTS = {
  form_4: 6,
  congress_trade: 7,
  institutional_13f: 5,
  warn_notice: 2,
  mechanics_lien: -5,
  notice_of_intent: -2,
  civil_docket: -4,
  regulatory_notice: -6,
  bankruptcy_docket: 0,
  bankruptcy_chapter_11: 2,
  bankruptcy_chapter_7: 1,
  bankruptcy_adversary: 4,
  receivership: 3,
  creditor_dispute: 2,
}

/** Per-event display severity  -  varies within an entity like heat map entity scores. */
export function derivedEventSeverity(event, entityScore = null, entity = null) {
  const severity = Number(event.severity) || 0
  const confidence = Number(event.confidence) || 0
  const frictionBase = Number(entityScore?.score) || severity
  const eventDays = daysSince(event.filing_date || event.created_at || event.updated_at)
  const recencyBoost = eventDays <= 1 ? 9 : eventDays <= 7 ? 6 : eventDays <= 30 ? 3 : 0
  const typeAdjust = EVENT_TYPE_ADJUSTMENTS[event.event_type] ?? 0
  const calculated = Math.round(
    severity * 0.54 +
      confidence * 0.2 +
      frictionBase * 0.1 +
      recencyBoost +
      typeAdjust +
      stableScoreJitter({ id: event.id, canonical_name: event.title || entity?.canonical_name }),
  )
  return Math.max(35, Math.min(98, calculated))
}

export function urgencyFromScore(score) {
  const value = Number(score) || 0
  if (value >= 85) return 'urgent'
  if (value >= 65) return 'review'
  return 'monitor'
}

export function urgencyDisplayLabel(urgency) {
  if (urgency === 'urgent') return 'Urgent review'
  if (urgency === 'review') return 'Building pressure'
  return 'Monitoring'
}
