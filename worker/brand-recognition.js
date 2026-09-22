/**
 * Household-name gate + ranking boost for Discord/Twitter marketing lead selection.
 *
 * Qualification (must pass isHighlyRecognizedBrand before posting):
 * 1. Valid US exchange ticker on the entity (1–5 uppercase letters, e.g. WMT, F)
 * 2. Explicit match in RECOGNIZED_BRAND_PATTERNS (Fortune-500-style household names)
 *
 * Does NOT qualify:
 * - Adversarial case captions ("Plaintiff v. Defendant") or "In re" estate captions
 * - Regional distributors / wholesalers / generic LLC names without a ticker
 * - Broad "national distributing" or "republic national" style substring heuristics
 * - recognitionBoost alone — boost only ranks leads that already pass the gate
 */

import { stripCasePrefix } from './company-name.js'

const RECOGNIZED_BRAND_PATTERNS = [
  /\bwal[- ]?mart\b/i,
  /\bamazon\b/i,
  /\bapple\b/i,
  /\bmicrosoft\b/i,
  /\bgoogle|alphabet\b/i,
  /\bmeta platforms|facebook\b/i,
  /\btesla\b/i,
  /\bboeing\b/i,
  /\bstarbucks\b/i,
  /\bmcdonald'?s\b/i,
  /\bnike\b/i,
  /\bdisney\b/i,
  /\bnetflix\b/i,
  /\bford motor|general motors\b/i,
  /\bdelta air|united air|american airlines|southwest air\b/i,
  /\bjpmorgan|goldman sachs|wells fargo|bank of america|citigroup|citibank\b/i,
  /\bat&t|verizon|t-mobile|comcast\b/i,
  /\bfedex|ups\b|\bunited parcel\b/i,
  /\bhome depot|lowe'?s\b/i,
  /\btarget corp|costco|kroger|walgreens|cvs\b/i,
  /\bintel\b|\bnvidia\b|\bamd\b|\bibm\b|\boracle\b|\bsalesforce\b/i,
  /\bexxon|chevron|shell oil|bp p/i,
  /\bpepsico|coca[- ]?cola|kraft|general mills|tyson foods\b/i,
  /\bmarriott|hilton|hyatt\b/i,
  /\buber\b|\blyft\b|\bairbnb\b|\bdoordash\b/i,
  /\bspirit air|jetblue|frontier air\b/i,
  /\brite aid\b|\bbed bath\b|\bparty city\b|\bjoann\b|\bbig lots\b/i,
  /\bwework\b|\bpeloton\b|\bgamestop\b|\bamc entertainment\b/i,
]

const TICKER_BLOCKLIST = new Set(['INC', 'LLC', 'LTD', 'CORP', 'CO', 'LP'])

function marketingEntityName(lead) {
  return stripCasePrefix(String(lead?.name || lead?.canonical_name || '')).trim()
}

function isAdversarialCaption(name) {
  return /\s+v\.?\s+/i.test(name) || /^in re[:\s]/i.test(name)
}

export function hasValidMarketTicker(lead) {
  const ticker = String(lead?.ticker || '').trim().toUpperCase()
  if (!ticker || ticker.length > 5) return false
  if (!/^[A-Z]{1,5}$/.test(ticker)) return false
  if (TICKER_BLOCKLIST.has(ticker)) return false
  return true
}

export function matchesHouseholdBrand(lead) {
  const name = marketingEntityName(lead)
  if (!name || isAdversarialCaption(name)) return false
  return RECOGNIZED_BRAND_PATTERNS.some((pattern) => pattern.test(name))
}

export function isHighlyRecognizedBrand(lead) {
  if (!lead) return false
  const name = marketingEntityName(lead)
  if (!name || isAdversarialCaption(name)) return false
  return hasValidMarketTicker(lead) || matchesHouseholdBrand(lead)
}

/** Additive boost among qualified leads: household name +35, ticker +20 (max 55). */
export function recognitionBoost(lead) {
  if (!isHighlyRecognizedBrand(lead)) return 0
  let boost = 0
  if (matchesHouseholdBrand(lead)) boost += 35
  if (hasValidMarketTicker(lead)) boost += 20
  return boost
}

/** @deprecated use isHighlyRecognizedBrand */
export function isRecognizedBrand(lead) {
  return isHighlyRecognizedBrand(lead)
}

export function filterHighlyRecognized(pool) {
  return (pool || []).filter(isHighlyRecognizedBrand)
}
