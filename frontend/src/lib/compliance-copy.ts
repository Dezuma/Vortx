/** Banned terms for Vortx public-facing copy (runbook + Vortx-Audience.mdc). */
export const FORBIDDEN_TERMS = [
  'guilty',
  'fraud',
  'scam',
  'exposed',
  'secret',
  'hiding',
  'in trouble',
  'collapsing',
  'buy',
  'sell',
  'short',
  'trade',
  'profit',
  'guaranteed',
  'risk-free',
  'recession-proof',
  'guaranteed stable',
  'will fail',
  'going to fail',
]

const FORBIDDEN_RE = new RegExp(
  `\\b(${FORBIDDEN_TERMS.map((term) => term.replace(/\s+/g, '\\s+')).join('|')})\\b`,
  'i',
)

export function containsForbiddenTerm(value: string) {
  return FORBIDDEN_RE.test(String(value || ''))
}

export function assertCompliantCopy(value: string, context = 'copy') {
  const text = String(value || '')
  if (containsForbiddenTerm(text)) {
    throw new Error(`Non-compliant ${context}`)
  }
  return text
}

const SCAN_HEADLINE_TEMPLATE =
  'has N record(s) in the public record from the last 90 days that most investors and competitors do not see in standard reporting.'

const NO_SIGNALS_TEMPLATE =
  "In Vortx's monitored public-record sources, nothing matched for Example Entity in the last 90 days. That reflects our current ingestion coverage only, not a clean bill of health."

export function entityScanHeadline(entityName: string, count: number) {
  const name = String(entityName || 'This entity').trim()
  const n = Number(count) || 0
  if (n <= 0) {
    return `${name}: no monitored public-record activity in the last 90 days.`
  }
  assertCompliantCopy(SCAN_HEADLINE_TEMPLATE, 'scan_headline')
  return `${name} has ${n} record${n === 1 ? '' : 's'} in the public record from the last 90 days that most investors and competitors do not see in standard reporting.`
}

export function noSignalsMessage(entityName: string) {
  const name = String(entityName || 'This entity').trim()
  assertCompliantCopy(NO_SIGNALS_TEMPLATE, 'no_signals')
  return `In Vortx's monitored public-record sources, nothing matched for ${name} in the last 90 days. That reflects our current ingestion coverage only, not a clean bill of health.`
}

export function adjacentSignalsFallbackMessage() {
  return `No direct matches in the last 90 days. The live queue still surfaces new WARN, lien, and bankruptcy filings daily; monitoring closes the gap.`
}

export function adjacentSignalsMessage(entityName: string, count: number, scopeLabel: string) {
  const name = String(entityName || 'This entity').trim()
  const n = Number(count) || 0
  if (n <= 0) return adjacentSignalsFallbackMessage()
  const scope = String(scopeLabel || 'in our monitored queue').trim()
  const companyWord = n === 1 ? 'company was' : 'companies were'
  return `No direct matches for ${name}, but ${n} other ${companyWord} flagged ${scope} this week in Vortx monitored sources.`
}
