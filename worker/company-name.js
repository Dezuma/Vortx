const BUSINESS_MARKER_RE =
  /\b(llc|l\.l\.c|inc|inc\.|corp|corp\.|corporation|co\.|company|limited|ltd|lp|l\.p\.|llp|holdings?|group|bank|capital|fund|trustee|enterprises?|industries|services|solutions|systems|technologies|properties|realty|ventures|plc)\b/i

export function clean(value, fallback = '') {
  return String(value ?? fallback).trim()
}

export function stripCasePrefix(value) {
  return clean(value)
    .replace(/^in re[:\s]+/i, '')
    .replace(/^in the matter of[:\s]+/i, '')
    .trim()
}

export function businessTargetText(value) {
  const caption = stripCasePrefix(value)
  const adversarial = caption.split(/\s+v\.?\s+/i)
  return adversarial.length > 1 ? adversarial.slice(1).join(' v. ') : caption
}

export function companyNameForTickerMatch(value) {
  return businessTargetText(stripCasePrefix(clean(value)))
}

export function isLikelyTickerMatchName(value) {
  const raw = clean(value)
  if (!raw) return false
  if (/^\d/.test(raw)) return false
  const target = companyNameForTickerMatch(raw)
  if (!target || target.length < 4) return false
  if (/\s+v\.?\s+/i.test(raw) && !BUSINESS_MARKER_RE.test(target)) return false
  if (/^(plaintiff|defendant|petitioner|respondent)\b/i.test(target)) return false
  return true
}
