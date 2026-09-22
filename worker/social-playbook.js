/** Tweet + card copy from vortx_social_playbook.pdf (relief vs urgency framing). */

export const PLAYBOOK_TEMPLATES = [
  'relief-1',
  'relief-2',
  'relief-3',
  'urgency-1',
  'urgency-2',
  'urgency-3',
]

export const PRIMARY_HASHTAG = '#PublicRecords'

export function playbookHashtags(lead, options = {}) {
  const maxTags = Math.min(Number(options.maxTags || 2), 2)
  const tags = [PRIMARY_HASHTAG]
  const eventType = String(lead?.event_type || lead?.recordType || '').toLowerCase()
  if (maxTags > 1 && /form_4|insider/.test(eventType)) tags.unshift('#Form4')
  else if (maxTags > 1 && /congress|stock.?act/.test(eventType)) tags.unshift('#STOCKAct')
  else if (maxTags > 1 && /13f|institutional/.test(eventType)) tags.unshift('#13F')
  else if (maxTags > 1 && /warn/.test(eventType)) tags.unshift('#WARN')
  return tags.slice(0, maxTags).join(' ')
}

export function plainLanguageStake(lead) {
  const name = String(lead?.name || 'This company').trim()
  const eventType = String(lead?.event_type || lead?.recordType || '').toLowerCase()
  const blob = `${name} ${eventType}`.toLowerCase()
  const ticker = lead?.ticker || lead?.signal_meta?.ticker_label
  const tickerBit = ticker ? ` ($${String(ticker).replace(/^\$/, '')})` : ''

  if (/form_4|insider/.test(eventType)) {
    return `An insider filing just hit the public record for ${name}${tickerBit}.`
  }
  if (/congress|stock.?act/.test(eventType)) {
    return `A STOCK Act disclosure just landed for ${name}${tickerBit}.`
  }
  if (/institutional_13f|13f/.test(eventType)) {
    return `A 13F holdings report just surfaced for ${name}${tickerBit}.`
  }
  if (/lvnv|funding|recover|capital|collect|midland|portfolio|encore|synchrony/i.test(blob)) {
    return 'A debt collector just got sued over its collection practices.'
  }
  if (/warn/.test(eventType)) {
    const workers = lead?.workers ? `${lead.workers} workers` : 'a workforce reduction'
    return `${name} filed a WARN notice, ${workers} affected.`
  }
  if (/lien|ucc|mechanics|secured/.test(eventType)) {
    return `A lien filing just hit the public record for ${name}.`
  }
  if (/chapter\s*7|chapter_7/.test(eventType)) {
    return `${name} filed for Chapter 7.`
  }
  if (/chapter\s*11|chapter_11/.test(eventType)) {
    return `${name} filed for Chapter 11.`
  }
  if (/bankruptcy|docket|receivership/.test(eventType)) {
    return `${name} has a bankruptcy docket moving in public court.`
  }
  if (/civil|lawsuit|adversary|complaint/.test(eventType)) {
    return `${name} was just sued.`
  }
  return `${name} has a dated public filing worth seeing before it's news.`
}

export function supportLine(lead, options = {}) {
  const name = String(lead?.name || 'Public record').trim()
  const recordType = humanRecordType(lead?.event_type || lead?.recordType || 'public record')
  const filed = formatFilingDate(lead?.filingDate)
  const jurisdiction = formatJurisdiction(lead?.jurisdiction)
  const details = `${recordType} · filed ${filed} · ${jurisdiction}`
  if (options.includeCompany === false) return details
  return `${name} · ${details}`
}

export function filingMetaLine(lead) {
  return supportLine(lead, { includeCompany: false })
}

export function isUrgencyEligible(lead) {
  if (!lead) return false
  const eventType = String(lead?.event_type || lead?.recordType || '').toLowerCase()
  const score = Number(lead?.score ?? lead?.severity ?? 0)
  if (/form_4|congress|institutional_13f|13f|insider|stock.?act/.test(eventType) && score >= 70) return true
  if (/warn/.test(eventType) && (Number(lead?.workers) > 0 || score >= 65)) return true
  if (/lien|ucc|mechanics|secured/.test(eventType) && score >= 70) return true
  if (/bankruptcy|chapter|receivership/.test(eventType) && score >= 75) return true
  if (/civil|lawsuit|adversary|complaint/.test(eventType) && score >= 80) return true
  return false
}

function isWarnLead(lead) {
  return /warn/.test(String(lead?.event_type || lead?.recordType || '').toLowerCase())
}

export function pickPlaybookTemplate(env, lead, rotationIndex) {
  const idx = rotationIndex(env, PLAYBOOK_TEMPLATES.length)
  let templateId = PLAYBOOK_TEMPLATES[idx]
  if (templateId.startsWith('urgency-') && !isUrgencyEligible(lead)) {
    return PLAYBOOK_TEMPLATES[idx % 3]
  }
  // urgency-2 copy is WARN-specific; never apply it to other record types.
  if (templateId === 'urgency-2' && !isWarnLead(lead)) {
    templateId = 'urgency-3'
  }
  return templateId
}

export function buildPlaybookTweet({ lead, siteUrl, templateId, scoreText }) {
  const company = String(lead?.name || 'Public record').trim()
  const recordType = humanRecordType(lead?.event_type || lead?.recordType || 'public record')
  const filed = formatFilingDate(lead?.filingDate)
  const jurisdiction = formatJurisdiction(lead?.jurisdiction)
  const workers = lead?.workers ? String(lead.workers) : null
  const score = scoreText || 'N/A'
  const meta = supportLine(lead)
  const stake = plainLanguageStake(lead)
  const link = siteUrl.replace(/\/$/, '')
  const framing = templateId.startsWith('urgency-') ? 'urgency' : 'relief'

  let hook = stake
  let body = meta
  let ctaText = `See the full filing → ${link}`
  let cardCta = framing === 'urgency' ? 'Check your exposure →' : 'See the full filing →'

  switch (templateId) {
    case 'relief-1':
      if (/form_4|congress|13f|insider|stock.?act/.test(String(lead?.event_type || lead?.recordType || '').toLowerCase())) {
        hook = `${company} · ${recordType} · filed ${filed}. Still no mainstream headline.`
        body = `Desk subscribers had the filer, issuer, and source URL the day it hit the record. Friction ${score}/100.`
      } else {
        hook = `${company} · ${recordType} · filed ${filed}. Still no headline.`
        body = `Subscribers had the source document and timeline the day it hit the docket. Friction ${score}/100.`
      }
      ctaText = `See what filed today → ${link}`
      break
    case 'relief-2':
      if (/form_4|congress|13f|insider|stock.?act/.test(String(lead?.event_type || lead?.recordType || '').toLowerCase())) {
        hook = `No surprises: ${company} ${recordType} hit the public record the same day (${filed}).`
        body = 'Who traded, which issuer, dated source. Not a rumor thread. Not a delayed recap.'
      } else {
        hook = `No surprises: ${company} ${recordType} surfaced same day it was filed (${filed}).`
        body = 'Straight from the docket, dated and sourced. Not a press release, not a recap thread.'
      }
      ctaText = `See it before it's news → ${link}`
      break
    case 'relief-3':
      hook = `This is what "never caught off guard" looks like: ${company}.`
      body = `${recordType} · filed ${filed} · friction ${score}/100 · sourced public record, not a rumor.`
      ctaText = `Get the live feed → ${link}`
      break
    case 'urgency-1':
      if (/form_4|congress|13f|insider|stock.?act/.test(String(lead?.event_type || lead?.recordType || '').toLowerCase())) {
        hook = `Watching ${company}? A ${recordType.toLowerCase()} hit the public record on ${filed}.`
        body = 'Read the filing before the tape and the takes catch up.'
      } else {
        hook = `Vendor, landlord, or counterparty to ${company}? A ${recordType.toLowerCase()} hit the public record on ${filed}.`
        body = 'Check your exposure before the next invoice, renewal, or wire goes out.'
      }
      ctaText = `Read the filing now → ${link}`
      cardCta = 'Check your exposure →'
      break
    case 'urgency-2':
      if (isWarnLead(lead)) {
        hook = `${workers ? `${workers} jobs. One public filing. ` : ''}${company} filed a WARN notice in ${jurisdiction} on ${filed}.`
        body = 'WARN filings often run days or weeks ahead of the layoff story.'
      } else {
        hook = `New court record: ${company} · ${jurisdiction} · filed ${filed}.`
        body =
          'If you have money, inventory, or a contract on the line with them, read the public filing first, not the recap later.'
      }
      ctaText = `Read the filing now → ${link}`
      cardCta = 'Check your exposure →'
      break
    case 'urgency-3':
      hook = `New court record: ${company} · ${jurisdiction} · filed ${filed}.`
      body =
        'If you have money, inventory, or a contract on the line with them, read the public filing first, not the recap later.'
      ctaText = `Read the filing now → ${link}`
      cardCta = 'Check your exposure →'
      break
    default:
      break
  }

  const text = trimTweet([hook, body, ctaText].join('\n\n'), PRIMARY_HASHTAG)

  return {
    text,
    hook,
    body,
    ctaText,
    stakeLine: stake,
    supportLine: meta,
    framing,
    templateId,
    cardTitle: stake,
    cardSubtitle: meta,
    cardCta,
  }
}

/** X counts every URL as 23 chars (t.co), regardless of raw length. */
function tweetWeight(text) {
  return String(text).replace(/https?:\/\/\S+/g, 'x'.repeat(23)).length
}

function trimTweet(base, hashtag, maxLength = 280) {
  // Every post carries the protective phrase; compliance requires it.
  const tagLine = `Research only. ${hashtag}`
  const withTags = `${base}\n\n${tagLine}`
  if (tweetWeight(withTags) <= maxLength) return withTags

  const parts = base.split('\n\n')
  const cta = parts.pop() || ''
  const hookPart = parts.shift() || ''
  const bodyPart = parts.join('\n\n')
  const budget = Math.max(
    24,
    maxLength - tweetWeight(hookPart) - tweetWeight(cta) - tagLine.length - 8,
  )
  const trimmedBody = bodyPart.length > budget ? `${bodyPart.slice(0, budget - 1)}…` : bodyPart
  return [hookPart, trimmedBody, cta, tagLine].filter(Boolean).join('\n\n')
}

function humanRecordType(value) {
  return String(value || 'public record').replaceAll('_', ' ').trim()
}

function formatFilingDate(value) {
  const text = String(value || 'recent').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T12:00:00Z`)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  }
  return text
}

function formatJurisdiction(value) {
  const text = String(value || '').trim()
  if (!text || /^https?:\/\//i.test(text)) return 'multi-jurisdiction'
  return text
}
