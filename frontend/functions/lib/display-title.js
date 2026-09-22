/**
 * Human-readable short titles for legal captions and entity names.
 */

const EVENT_SHORT_SUFFIX = {
  bankruptcy_chapter_11: 'Chapter 11 bankruptcy filing',
  bankruptcy_chapter_7: 'Chapter 7 bankruptcy filing',
  bankruptcy_docket: 'bankruptcy filing',
  bankruptcy_adversary: 'bankruptcy dispute',
  warn_notice: 'workforce layoff notice',
  mechanics_lien: 'lien filing',
  notice_of_intent: 'pre-suit notice',
  receivership: 'receivership filing',
  civil_docket: 'court filing',
  regulatory_notice: 'regulatory filing',
  creditor_dispute: 'creditor dispute',
  form_4: 'Form 4 insider filing',
  congress_trade: 'STOCK Act disclosure',
  institutional_13f: '13F institutional filing',
}

const BUSINESS_MARKER_RE =
  /\b(llc|l\.l\.c\.|inc|inc\.|corp|corporation|company|co\.|ltd|lp|l\.p\.|llp|pllc|bank|holdings|group|services|systems|construction|partners|capital|energy|logistics|medical|health|restaurant|retail|manufacturing|properties|enterprises|facility|corporation)\b/i

export function compactEntityName(name) {
  return String(name || '')
    .replace(/\s*\(In re .+?\)$/i, '')
    .replace(/^In re\s+/i, '')
    .trim()
}

export function truncateAtWordBoundary(text, maxLen = 72) {
  const value = String(text || '').trim()
  if (!value || value.length <= maxLen) return value
  const slice = value.slice(0, maxLen)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > Math.floor(maxLen * 0.5) ? slice.slice(0, lastSpace) : slice
  return `${cut.trim()}…`
}

export function looksLikeLegalCaption(text) {
  const value = String(text || '').trim()
  if (!value) return false
  return /\s+v\.?\s+/i.test(value) || /\bchapter\s+\d+\b/i.test(value) || /\btrustee\b/i.test(value)
}

export function partyFromCaption(caption) {
  const text = String(caption || '').trim()
  if (!text) return ''
  const parts = text.split(/\s+v\.?\s+/i)
  if (parts.length < 2) return compactEntityName(text)
  for (const party of [parts[1], parts[0]]) {
    const name = compactEntityName(party)
    if (BUSINESS_MARKER_RE.test(name)) return name
  }
  return compactEntityName(parts[parts.length - 1])
}

function suffixForEventType(eventType) {
  const key = String(eventType || '').trim()
  if (EVENT_SHORT_SUFFIX[key]) return EVENT_SHORT_SUFFIX[key]
  if (key.includes('bankruptcy')) return 'bankruptcy filing'
  if (key.includes('warn')) return 'workforce layoff notice'
  if (key.includes('lien')) return 'lien filing'
  return 'public record filing'
}

/**
 * Build a display-safe short title for headlines (never mid-word truncation).
 */
export function buildShortTitle({ entityName, eventType, rawCaption } = {}) {
  const entity = compactEntityName(entityName) || partyFromCaption(rawCaption)
  const suffix = suffixForEventType(eventType)
  if (entity && entity.length >= 3 && !looksLikeLegalCaption(entity)) {
    return truncateAtWordBoundary(`${entity} ${suffix}`, 72)
  }
  const fromCaption = partyFromCaption(rawCaption || entityName)
  if (fromCaption && fromCaption.length >= 3) {
    return truncateAtWordBoundary(`${fromCaption} ${suffix}`, 72)
  }
  return truncateAtWordBoundary(suffix.charAt(0).toUpperCase() + suffix.slice(1), 72)
}
