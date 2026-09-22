/**
 * Case stories: AI-drafted narratives built strictly from public-record fields,
 * published only after a human click. No auto-publish path exists by design.
 */

const SLUG_MAX = 72

export const CASE_STATUSES = new Set(['pending_review', 'published', 'rejected'])

export function caseSlugFor(headline, eventId) {
  const base = String(headline || 'case')
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '')
  const suffix = String(eventId || '').replace(/-/g, '').slice(0, 8)
  return suffix ? `${base}-${suffix}` : base || `case-${Date.now()}`
}

const COURT_SLUG_LABELS = {
  scb: 'Court of Chancery of Delaware',
  deb: 'U.S. Bankruptcy Court, District of Delaware',
  nysb: 'U.S. Bankruptcy Court, Southern District of New York',
  nysd: 'U.S. District Court, Southern District of New York',
  cand: 'U.S. District Court, Northern District of California',
  txed: 'U.S. District Court, Eastern District of Texas',
  ilnd: 'U.S. District Court, Northern District of Illinois',
  flmb: 'U.S. Bankruptcy Court, Middle District of Florida',
  orb: 'U.S. Bankruptcy Court, District of Oregon',
}

function readableJurisdiction(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) return raw
  const slug = raw.match(/\/courts\/([^/?#]+)/i)?.[1]?.replace(/\/$/, '')?.toLowerCase() || ''
  if (slug && COURT_SLUG_LABELS[slug]) return COURT_SLUG_LABELS[slug]
  if (slug) return `U.S. court record (${slug.toUpperCase()})`
  return 'Federal or state court record'
}

export function stripRecordPrefix(title) {
  return String(title || '')
    .replace(/^(?:business bankruptcy docket|bankruptcy docket|warn notice|civil docket|court record signal):\s*/i, '')
    .trim()
}

/** Pull named individuals and parties already present in title/summary text. */
export function extractNamedParties(event) {
  const parties = []
  const seen = new Set()
  const add = (name, role) => {
    const clean = String(name || '')
      .replace(/\s+/g, ' ')
      .replace(/^[\s:,-]+|[\s:,-]+$/g, '')
      .trim()
    if (!clean || clean.length < 2 || seen.has(clean.toLowerCase())) return
    if (/^(plaintiff|defendant|petitioner|respondent|debtor|creditor)$/i.test(clean)) return
    seen.add(clean.toLowerCase())
    parties.push({ name: clean, role })
  }

  const title = stripRecordPrefix(String(event?.title || '').trim())
  const summary = String(event?.summary || '').trim()
  const combined = `${title} ${summary}`

  const versus = title.match(/^(.+?)\s+v\.?\s+(.+)$/i)
  if (versus) {
    add(versus[1], 'party named in filing title')
    add(versus[2], 'party named in filing title')
  }

  const inRe = title.match(/\bin re[:\s]+(.+?)(?:,|$)/i)
  if (inRe) add(inRe[1], 'subject named in in re filing')

  for (const match of combined.matchAll(
    /\b((?:chief executive officer|ceo|cfo|chairman|president|director|officer|guarantor|trustee|manager|member|partner)\s+(?:of\s+)?[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/gi,
  )) {
    add(match[1], 'individual named with role in source record text')
  }
  for (const match of combined.matchAll(
    /\b([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2}),?\s+(?:chief executive officer|ceo|cfo|chairman|president|director|officer|guarantor|trustee)\b/gi,
  )) {
    add(match[1], 'individual named with role in source record text')
  }

  return parties.slice(0, 8)
}

function extractDocketNumber(event) {
  const text = `${event?.title || ''} ${event?.summary || ''}`
  const match =
    text.match(/\bdocket\s+(?:no\.?\s*)?([0-9][0-9-]{3,})/i) ||
    text.match(/\bcase\s+(?:no\.?\s*)?([0-9][0-9-:]{3,})/i)
  return match ? match[1].trim() : null
}

/** Only these fields are ever shown to the model. Nothing else leaves the record. */
export function buildCaseSourceFields(event, entity, source, evidenceUrl) {
  return {
    entity_name: entity?.canonical_name || null,
    record_type: source?.record_type || event.event_type || null,
    event_type: event.event_type || null,
    title: event.title || null,
    summary: event.summary || null,
    jurisdiction: readableJurisdiction(event.jurisdiction),
    filing_date: event.filing_date || null,
    docket_number: extractDocketNumber(event),
    amount: event.amount ?? null,
    severity: event.severity ?? null,
    confidence: event.confidence ?? null,
    source_name: source?.name || null,
    source_url: evidenceUrl || null,
    named_parties: extractNamedParties(event),
    record_context: null,
    ...warnFactsForCase(event, entity),
  }
}

function warnFactsForCase(event, entity) {
  const type = String(event?.event_type || '').toLowerCase()
  if (type !== 'warn_notice') return {}
  const summary = String(event?.summary || '')
  const title = String(event?.title || '')
  const blob = `${title} ${summary}`
  const workersMatch =
    blob.match(/Reported affected employees:\s*(\d[\d,]*)/i) ||
    blob.match(/(\d[\d,]*)\s+(?:affected\s+)?(?:employees?|workers?)/i)
  const workers = workersMatch
    ? Number(String(workersMatch[1]).replace(/,/g, ''))
    : Number(event?.amount) > 0
      ? Number(event.amount)
      : null
  const location =
    (summary.match(/Location:\s*([^.]+)/i) || [])[1]?.trim() ||
    event?.jurisdiction ||
    null
  const effective = (summary.match(/Effective layoff date on record:\s*([0-9-]{8,10})/i) || [])[1] || null
  const noticeDate =
    (summary.match(/Notice filed on\s*([0-9-]{8,10})/i) || [])[1] || event?.filing_date || null
  const noticeType = (summary.match(/Notice type:\s*([^.]+)/i) || [])[1]?.trim() || null
  return {
    warn_facts: {
      employer: entity?.canonical_name || null,
      affected_workers: Number.isFinite(workers) && workers > 0 ? workers : null,
      location,
      notice_date: noticeDate,
      effective_layoff_date: effective,
      notice_type: noticeType,
    },
  }
}

/** Words that assert guilt or bad intent. Allowed only if the source record itself contains them. */
const GUILT_TERMS = [
  'guilty',
  'fraud',
  'fraudulent',
  'scam',
  'scammer',
  'crook',
  'criminal',
  'embezzle',
  'launder',
  'cover-up',
  'coverup',
  'misconduct',
  'wrongdoing',
  'deceive',
  'deceptive',
  'dishonest',
  'corrupt',
]

const PREDICTION_PATTERNS = [
  /\bwill\s+(likely\s+|probably\s+|almost certainly\s+)?(fail|collapse|go under|shut down|liquidate|default|go bankrupt|not survive)\b/i,
  /\b(doomed|inevitable collapse|certain to fail)\b/i,
  /\bthis (company|business|firm) (is finished|is done|cannot survive)\b/i,
]

const EDUCATIONAL_OPENER =
  /\b(mass layoff notices,?\s*known as|known as WARN notices|Form 4 filings require|WARN notices are administrative filings that signal)\b/i

const MUSH_OPENER =
  /\b(noted in a public record|a public record was filed|this (filing|record) is an administrative artifact)\b/i

export function sanitizeCaseText(text) {
  return String(text || '')
    .replaceAll('\u2014', ', ')
    .replaceAll('\u2013', '-')
    .replace(/ ,/g, ',')
    .replace(/,{2,}/g, ',')
    .trim()
}

/**
 * Validate a generated draft against the tone/accuracy rules.
 * Returns { ok, issues } and never throws. Guilt terms are allowed only when
 * the source record text already contains them (quoting the allegation).
 */
export function validateCaseDraft(draft, sourceFields) {
  const issues = []
  const headline = sanitizeCaseText(draft?.headline)
  const body = sanitizeCaseText(draft?.body)
  const dek = sanitizeCaseText(draft?.dek)
  const videoScript = sanitizeCaseText(draft?.video_script)

  if (!headline || headline.length < 8) issues.push('headline missing or too short')
  if (!body || body.length < 200) issues.push('body missing or too short')
  if (!dek) issues.push('dek missing')
  if (!videoScript || videoScript.length < 200) issues.push('video_script missing or too short')

  const openerWindow = `${headline}\n${dek}\n${body.slice(0, 280)}`
  if (EDUCATIONAL_OPENER.test(openerWindow)) {
    issues.push('educational explainer opener; lead with who acted in this record')
  }
  if (MUSH_OPENER.test(openerWindow)) {
    issues.push('generic mush opener; lead with the named employer, count, town, and date')
  }

  const sourceText = JSON.stringify(sourceFields || {}).toLowerCase()
  const draftText = `${headline}\n${dek}\n${body}\n${videoScript}`.toLowerCase()

  for (const term of GUILT_TERMS) {
    if (!draftText.includes(term) || sourceText.includes(term)) continue
    // Allow negated protective uses like "not a finding of wrongdoing" (negation must be near the term).
    let accusatory = false
    let cursor = draftText.indexOf(term)
    while (cursor !== -1) {
      const sentenceStart = Math.max(
        draftText.lastIndexOf('.', cursor),
        draftText.lastIndexOf('!', cursor),
        draftText.lastIndexOf('?', cursor),
        draftText.lastIndexOf('\n', cursor),
      )
      const sentence = draftText.slice(sentenceStart + 1, cursor + term.length)
      if (!/\b(not|no|nor|without|never)\b/i.test(sentence)) {
        accusatory = true
        break
      }
      cursor = draftText.indexOf(term, cursor + term.length)
    }
    if (accusatory) {
      issues.push(`introduces guilt language not present in source: "${term}"`)
    }
  }
  for (const pattern of PREDICTION_PATTERNS) {
    if (pattern.test(draftText)) {
      issues.push(`asserted prediction detected: ${pattern}`)
    }
  }

  const recordType = String(draft?.record_type || sourceFields?.record_type || sourceFields?.event_type || '')
    .toLowerCase()
  if (recordType === 'warn_notice') {
    if (/^\s*warn\b/i.test(headline)) {
      issues.push('WARN headline should read like a layoff event, not a form label')
    }
    if (!/\bif you\b/i.test(draftText)) {
      issues.push('WARN draft missing specific "if you" impact')
    }
    if (!/vortxmkt\.com/i.test(draftText)) {
      issues.push('WARN draft missing vortxmkt.com CTA')
    }
    if (!/substack/i.test(draftText)) {
      issues.push('WARN draft missing Substack CTA')
    }
  }

  // Specific numbers in the draft must exist in the source record.
  const sourceNumbers = new Set((sourceText.match(/\d[\d,.]*/g) || []).map((n) => n.replace(/[,.]/g, '')))
  const draftNumbers = (draftText.match(/\d[\d,.]*/g) || []).map((n) => n.replace(/[,.]/g, ''))
  for (const num of draftNumbers) {
    if (num.length >= 3 && !sourceNumbers.has(num) && !/^(19|20)\d\d/.test(num)) {
      issues.push(`number not found in source record: ${num}`)
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    draft: {
      headline,
      dek,
      body,
      video_script: videoScript,
      record_type: String(draft?.record_type || sourceFields?.record_type || '').trim() || null,
    },
  }
}

function recordTypeLabel(recordType) {
  return String(recordType || 'public record')
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function caseMetaLine(story) {
  const fields = story.source_fields || {}
  return [
    recordTypeLabel(fields.record_type || story.record_type),
    fields.jurisdiction || null,
    fields.filing_date ? `filed ${fields.filing_date}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Punchy Discord / X copy for a published case.
 * Investor FOMO lead (same voice as #alpha-feed), then dek + meta. Never the body explainer.
 */
export function caseSocialCopy(story, siteUrl) {
  const caseUrl = `${String(siteUrl || 'https://vortxmkt.com').replace(/\/$/, '')}/cases/${story.slug}`
  const headline = sanitizeCaseText(story.headline)
  const dek = sanitizeCaseText(story.dek || '')
  const meta = caseMetaLine(story)
  const fields = story.source_fields || {}
  const entity = sanitizeCaseText(fields.entity_name || '')
  const recordLabel = recordTypeLabel(fields.record_type || story.record_type)
  const score = Number(fields.severity)
  const scoreBit =
    Number.isFinite(score) && score > 0 ? `Friction ${Math.round(Math.min(100, score))}/100` : null

  const discord = [
    `📡 CASE FILE · ${recordLabel.toUpperCase()}`,
    `Subscribers saw this before the headline.`,
    `**${headline}**`,
    dek || null,
    [meta, scoreBit, entity ? `Entity on record: ${entity}` : null].filter(Boolean).join(' · ') || null,
    `Read the case (source + timeline): ${caseUrl}`,
  ]
    .filter(Boolean)
    .join('\n')

  const xParts = [
    `CASE FILE: ${headline}`,
    dek || meta || null,
    caseUrl,
  ].filter(Boolean)
  let x = xParts.join('\n\n')
  if (x.length > 270) {
    const room = 270 - caseUrl.length - 6
    const clipped = `${headline.slice(0, Math.max(40, room))}…`
    x = `CASE FILE: ${clipped}\n\n${caseUrl}`
  }

  return { discord, x, caseUrl, meta }
}

/** @deprecated use caseSocialCopy(story, siteUrl).discord */
export function caseTeaserText(story, siteUrl) {
  return caseSocialCopy(story, siteUrl).discord
}

export function substackPublicationUrl(env) {
  return String(env?.SUBSTACK_PUBLICATION_URL || 'https://vortxmkt.substack.com').replace(/\/$/, '')
}

/**
 * Substack has no official publishing API, so cross-posting is paste-and-publish:
 * this builds the full post (title, subtitle, body, source link, disclaimer)
 * ready to paste into the composer in one click.
 */
export function buildSubstackPost(story, siteUrl) {
  const fields = story.source_fields || {}
  const caseUrl = `${String(siteUrl || 'https://vortxmkt.com').replace(/\/$/, '')}/cases/${story.slug}`
  const sourceLine = fields.source_url
    ? `Source document: ${fields.source_url}`
    : fields.source_name
      ? `Source: ${fields.source_name}`
      : null
  const metaLine = [
    fields.record_type ? String(fields.record_type).replaceAll('_', ' ') : null,
    fields.jurisdiction || null,
    fields.filing_date ? `filed ${fields.filing_date}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const dek = sanitizeCaseText(story.dek || '')
  const body = sanitizeCaseText(story.body)
  const bodyText = [
    'Subscribers on the Vortx desk had this filing the day it hit the public record.',
    dek || null,
    metaLine ? `${metaLine}\n` : null,
    body,
    sourceLine,
    `Full case file and live desk: ${caseUrl}`,
    'Records are allegations or administrative artifacts, not judgments. Research only, not legal or financial advice.',
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    title: sanitizeCaseText(story.headline),
    subtitle: dek || 'Public-record signal. Same-day desk access.',
    body: bodyText,
    full_text: `${sanitizeCaseText(story.headline)}\n\n${dek || ''}\n\n${bodyText}`.replace(/\n{3,}/g, '\n\n'),
  }
}
