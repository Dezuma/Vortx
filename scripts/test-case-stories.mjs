#!/usr/bin/env node
import {
  buildCaseSourceFields,
  buildSubstackPost,
  caseSlugFor,
  caseSocialCopy,
  caseTeaserText,
  extractNamedParties,
  sanitizeCaseText,
  substackPublicationUrl,
  validateCaseDraft,
} from '../frontend/functions/lib/case-stories.js'

let failed = 0
function check(label, fn) {
  try {
    fn()
    console.log(`ok ${label}`)
  } catch (error) {
    failed += 1
    console.error(`fail ${label}:`, error instanceof Error ? error.message : error)
  }
}

const sourceFields = buildCaseSourceFields(
  {
    id: 'ev-1',
    event_type: 'warn_notice',
    title: 'WARN notice: Example Manufacturing LLC',
    summary: 'WARN notice listed 648 affected workers in Bexar County.',
    jurisdiction: 'Bexar County, Texas',
    filing_date: '2026-06-30',
    severity: 88,
    confidence: 82,
  },
  { canonical_name: 'Example Manufacturing LLC' },
  { name: 'Texas WARN Notices', record_type: 'warn_notice' },
  'https://data.austintexas.gov/example',
)

const goodDraft = {
  headline: 'Example Manufacturing puts 648 jobs on notice in Bexar',
  dek: 'Example Manufacturing LLC filed a WARN notice covering 648 workers in Bexar County on 2026-06-30.',
  body: [
    'Example Manufacturing LLC just put 648 jobs on a public layoff notice in Bexar County, Texas.',
    'That is not a rumor. That is a WARN filing dated 2026-06-30. Texas WARN Notices is the source. The notice is the event.',
    'If you recruit in Bexar County, 648 workers at Example Manufacturing LLC are now on the public record. If you sell into this employer, 2026-06-30 is the date the notice moved, not the date a recap thread found you. If you research the name, the filing is already live.',
    'Most people will hear this when the headline shows up. You do not have to wait.',
    'Open the source. Watch Example Manufacturing LLC on https://vortxmkt.com. Subscribe at https://vortxmkt.substack.com so the next notice hits your inbox.',
    'Public filing. Not investment advice. Not a finding of liability.',
  ].join('\n\n'),
  record_type: 'warn_notice',
  video_script: [
    'A layoff notice just hit the public record in Bexar County, Texas.',
    'Example Manufacturing LLC named 648 workers on a WARN filing dated 2026-06-30.',
    'If you staff that county, that is your pipeline. If you supply that employer, that is your date.',
    'Watch the name on vortxmkt.com. Subscribe at vortxmkt.substack.com.',
    'Public filing. Not investment advice. Not a finding of liability.',
  ].join(' '),
}

check('accepts a compliant draft', () => {
  const result = validateCaseDraft(goodDraft, sourceFields)
  if (!result.ok) throw new Error(result.issues.join('; '))
})

check('rejects guilt language not in source', () => {
  const result = validateCaseDraft(
    { ...goodDraft, body: goodDraft.body + '\n\nThis looks like fraud by the owners.' },
    sourceFields,
  )
  if (result.ok) throw new Error('expected rejection')
  if (!result.issues.some((issue) => issue.includes('fraud'))) throw new Error('expected fraud issue')
})

check('rejects generic mush opener', () => {
  const result = validateCaseDraft(
    {
      ...goodDraft,
      headline: 'Example Manufacturing noted in a public record',
      dek: 'Example Manufacturing LLC is noted in a public record filing dated 2026-06-30.',
      body: 'Example Manufacturing LLC is noted in a public record filing in Bexar County.\n\n' + goodDraft.body,
    },
    sourceFields,
  )
  if (result.ok) throw new Error('expected rejection')
  if (!result.issues.some((issue) => issue.includes('mush opener'))) throw new Error('expected mush opener issue')
})

check('rejects asserted predictions', () => {
  const result = validateCaseDraft(
    { ...goodDraft, body: goodDraft.body + '\n\nThe company will likely fail within a year.' },
    sourceFields,
  )
  if (result.ok) throw new Error('expected rejection')
  if (!result.issues.some((issue) => issue.includes('prediction'))) throw new Error('expected prediction issue')
})

check('rejects numbers not present in source record', () => {
  const result = validateCaseDraft(
    { ...goodDraft, body: goodDraft.body + '\n\nThe company owes $4,500,000 to vendors.' },
    sourceFields,
  )
  if (result.ok) throw new Error('expected rejection')
  if (!result.issues.some((issue) => issue.includes('number'))) throw new Error('expected number issue')
})

check('allows guilt terms when the source itself contains them', () => {
  const fields = { ...sourceFields, title: 'Adversary complaint alleging fraudulent transfer' }
  const result = validateCaseDraft(
    { ...goodDraft, body: goodDraft.body + '\n\nThe complaint alleges a fraudulent transfer; that allegation is untested.' },
    fields,
  )
  if (!result.ok) throw new Error(result.issues.join('; '))
})

check('strips em dashes in sanitize', () => {
  const out = sanitizeCaseText('before \u2014 after')
  if (out.includes('\u2014')) throw new Error('em dash survived')
})

check('slug is stable and url safe', () => {
  const slug = caseSlugFor('A 648-worker WARN notice lands in Bexar County', 'abc-123-def')
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`bad slug: ${slug}`)
  if (!slug.endsWith('abc123de')) throw new Error(`missing event suffix: ${slug}`)
})

check('teaser includes headline and link', () => {
  const teaser = caseTeaserText({ headline: 'H', body: 'First para.\n\nSecond.', slug: 's-1' }, 'https://vortxmkt.com')
  if (!teaser.includes('H') || !teaser.includes('/cases/s-1')) throw new Error('teaser malformed')
})

check('social copy prefers dek over educational hook', () => {
  const copy = caseSocialCopy(
    {
      headline: 'Example Manufacturing LLC Files WARN Notice in Bexar County',
      dek: '648 workers named in a Texas WARN notice filed 2026-06-30.',
      body: 'Mass layoff notices, known as WARN notices, are administrative filings...\n\nThe record shows more detail.',
      slug: 'warn-example',
      record_type: 'warn_notice',
      source_fields: sourceFields,
    },
    'https://vortxmkt.com',
  )
  if (!copy.discord.includes('CASE FILE')) throw new Error('missing case file label')
  if (!copy.discord.includes('Subscribers saw this before the headline.')) throw new Error('missing FOMO lead')
  if (!copy.discord.includes('648 workers')) throw new Error('dek missing from discord')
  if (copy.discord.includes('known as WARN notices')) throw new Error('used educational hook instead of dek')
  if (!copy.x.includes('/cases/warn-example')) throw new Error('x missing case link')
})

check('rejects educational explainer openers', () => {
  const result = validateCaseDraft(
    {
      ...goodDraft,
      body:
        'Mass layoff notices, known as WARN notices, are administrative filings that signal potential job impacts.\n\n' +
        goodDraft.body,
    },
    sourceFields,
  )
  if (result.ok) throw new Error('expected rejection')
  if (!result.issues.some((issue) => issue.includes('educational'))) throw new Error('expected educational issue')
})

check('requires video_script', () => {
  const result = validateCaseDraft({ ...goodDraft, video_script: '' }, sourceFields)
  if (result.ok) throw new Error('expected rejection')
})

check('rejects WARN headline that leads with the form name', () => {
  const result = validateCaseDraft(
    { ...goodDraft, headline: 'WARN: Example Manufacturing cuts 648 jobs' },
    sourceFields,
  )
  if (result.ok) throw new Error('expected rejection')
  if (!result.issues.some((issue) => issue.includes('layoff event'))) throw new Error('expected headline issue')
})

check('rejects WARN draft missing impact and subscribe CTA', () => {
  const result = validateCaseDraft(
    {
      ...goodDraft,
      body: [
        'Example Manufacturing LLC named 648 workers on a WARN filing in Bexar County, Texas on 2026-06-30.',
        'Texas WARN Notices is the source. Pull the document and watch the name.',
        'Public filing. Not investment advice. Not a finding of liability.',
      ].join('\n\n'),
      video_script:
        'Example Manufacturing LLC filed a WARN notice covering 648 workers in Bexar County on 2026-06-30. Public filing. Not investment advice. Not a finding of liability.',
    },
    sourceFields,
  )
  if (result.ok) throw new Error('expected rejection')
  if (!result.issues.some((issue) => issue.includes('if you'))) throw new Error('expected if-you issue')
  if (!result.issues.some((issue) => issue.includes('vortxmkt.com'))) throw new Error('expected site CTA issue')
  if (!result.issues.some((issue) => issue.includes('Substack'))) throw new Error('expected Substack CTA issue')
})

check('builds a paste-ready Substack post', () => {
  const post = buildSubstackPost(
    { ...goodDraft, slug: 'warn-648-abc123de', source_fields: sourceFields },
    'https://vortxmkt.com',
  )
  if (post.title !== goodDraft.headline) throw new Error('title mismatch')
  if (!post.body.includes('Subscribers on the Vortx desk')) throw new Error('missing FOMO lede')
  if (!post.body.includes('/cases/warn-648-abc123de')) throw new Error('missing case link')
  if (!post.body.includes('https://data.austintexas.gov/example')) throw new Error('missing source doc link')
  if (!post.body.includes('not judgments')) throw new Error('missing disclaimer')
  if (!post.full_text.startsWith(goodDraft.headline)) throw new Error('full_text missing title')
  if (post.full_text.includes('\u2014')) throw new Error('em dash in substack post')
})

check('substack publication url default and override', () => {
  if (substackPublicationUrl({}) !== 'https://vortxmkt.substack.com') throw new Error('bad default')
  if (substackPublicationUrl({ SUBSTACK_PUBLICATION_URL: 'https://x.example/' }) !== 'https://x.example') {
    throw new Error('override not applied')
  }
})

check('parses warn_facts from Texas-style summary', () => {
  const fields = buildCaseSourceFields(
    {
      id: 'ev-warn-facts',
      event_type: 'warn_notice',
      title: 'WARN notice: Acme Fabrication LLC',
      summary:
        'Reported affected employees: 412. Location: El Paso, Texas. Notice filed on 2026-08-01. Effective layoff date on record: 2026-10-15. Notice type: Plant closing.',
      jurisdiction: 'El Paso County, Texas',
      filing_date: '2026-08-01',
      severity: 91,
      confidence: 80,
    },
    { canonical_name: 'Acme Fabrication LLC' },
    { name: 'Texas WARN Notices', record_type: 'warn_notice' },
    'https://data.austintexas.gov/example-warn',
  )
  const facts = fields.warn_facts
  if (!facts) throw new Error('warn_facts missing')
  if (facts.employer !== 'Acme Fabrication LLC') throw new Error('employer')
  if (facts.affected_workers !== 412) throw new Error(`workers ${facts.affected_workers}`)
  if (facts.location !== 'El Paso, Texas') throw new Error(`location ${facts.location}`)
  if (facts.notice_date !== '2026-08-01') throw new Error(`notice_date ${facts.notice_date}`)
  if (facts.effective_layoff_date !== '2026-10-15') throw new Error('effective date')
  if (facts.notice_type !== 'Plant closing') throw new Error('notice_type')
})

check('omits warn_facts for non-WARN records', () => {
  const fields = buildCaseSourceFields(
    {
      event_type: 'institutional_13f',
      title: '13F holdings',
      summary: 'Reported value field: 50000000.',
      filing_date: '2026-08-01',
    },
    { canonical_name: 'Example Fund LP' },
    { record_type: 'institutional_13f' },
    null,
  )
  if (fields.warn_facts) throw new Error('warn_facts should be absent')
})

check('existing WARN sourceFields include warn_facts workers', () => {
  if (!sourceFields.warn_facts) throw new Error('warn_facts missing on existing fixture')
  if (sourceFields.warn_facts.affected_workers !== 648) {
    throw new Error(`expected 648 workers, got ${sourceFields.warn_facts.affected_workers}`)
  }
})

check('extracts named parties from v caption and role text', () => {
  const parties = extractNamedParties({
    title: 'Eggmann v State Farm Fire and Casualty Company',
    summary: 'CEO Jane Roe filed the notice on record.',
  })
  const names = parties.map((p) => p.name.toLowerCase())
  if (!names.some((n) => n.includes('eggmann'))) throw new Error('missing Eggmann')
  if (!names.some((n) => n.includes('state farm'))) throw new Error('missing State Farm')
  if (!names.some((n) => n.includes('ceo jane roe') || n.includes('jane roe'))) throw new Error('missing CEO name')
  const fields = buildCaseSourceFields(
    {
      title: 'Eggmann v State Farm Fire and Casualty Company',
      summary: 'CEO Jane Roe filed the notice on record.',
      event_type: 'civil_docket',
      jurisdiction: 'Illinois',
      filing_date: '2026-07-01',
    },
    { canonical_name: 'State Farm Fire and Casualty Company' },
    { record_type: 'civil_docket' },
    null,
  )
  if (!Array.isArray(fields.named_parties) || fields.named_parties.length < 2) throw new Error('named_parties missing')
})

if (failed) process.exit(1)
console.log('\nAll case story checks passed.')
