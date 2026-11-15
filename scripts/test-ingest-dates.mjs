#!/usr/bin/env node
/** Filing dates must come from the source. Missing dates are not "today". */
import { mapCourtListenerRow, mapWarnPublicRow, parseDate } from '../worker/ingest-cron.js'

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

const today = new Date().toISOString().slice(0, 10)

check('blank and unparseable dates stay empty', () => {
  if (parseDate('') !== null) throw new Error('empty string')
  if (parseDate(null) !== null) throw new Error('null')
  if (parseDate('not-a-date') !== null) throw new Error('text')
  if (parseDate('2024-02-31') !== null) throw new Error('impossible day')
  if (parseDate('02/31/2024') !== null) throw new Error('impossible us day')
})

check('keeps real iso and us dates', () => {
  if (parseDate('2024-03-01') !== '2024-03-01') throw new Error(parseDate('2024-03-01'))
  if (parseDate('2024-03-01T00:00:00.000') !== '2024-03-01') throw new Error('timestamp')
  if (parseDate('03/01/2024') !== '2024-03-01') throw new Error(parseDate('03/01/2024'))
})

check('oregon warn with only a layoff date is not filed today', () => {
  const record = mapWarnPublicRow(
    {
      company: 'Example Mill LLC',
      received_date: null,
      layoff_date: '2024-03-01',
      employees_affected: '40',
      city: 'Bend',
    },
    {
      slug: 'oregon-warn-notices',
      jurisdiction: 'OR',
      source_url: 'https://data.oregon.gov/resource/ijbz-jpx8.json',
    },
  )
  if (!record) throw new Error('expected a record')
  if (record.event.filing_date !== '2024-03-01') {
    throw new Error(`filing_date ${record.event.filing_date}`)
  }
  if (record.event.filing_date === today) throw new Error('stamped with today')
  if (String(record.event.summary).includes(`Notice filed on ${today}`)) {
    throw new Error('summary invented a notice date')
  }
})

check('warn row with no dates is skipped', () => {
  const record = mapWarnPublicRow(
    { company: 'Undated Employer Inc' },
    { slug: 'texas-warn-notices', jurisdiction: 'TX', source_url: 'https://example.test/warn' },
  )
  if (record) throw new Error(`expected skip, got ${record.event.filing_date}`)
})

check('court record without a filing date is skipped', () => {
  const record = mapCourtListenerRow(
    { slug: 'courtlistener-search', jurisdiction: 'US-Federal', record_type: 'civil_docket', source_url: 'https://www.courtlistener.com/api/rest/v4/search/' },
    { caseName: 'Example Holdings LLC', id: 42, absolute_url: 'https://www.courtlistener.com/docket/42/' },
    0,
  )
  if (record) throw new Error(`expected skip, got ${record.event.filing_date}`)
})

check('court record keeps the source filing date', () => {
  const record = mapCourtListenerRow(
    { slug: 'courtlistener-search', jurisdiction: 'US-Federal', record_type: 'civil_docket', source_url: 'https://www.courtlistener.com/api/rest/v4/search/' },
    {
      caseName: 'Example Holdings LLC',
      id: 43,
      dateFiled: '2019-05-02',
      absolute_url: 'https://www.courtlistener.com/docket/43/',
    },
    0,
  )
  if (!record) throw new Error('expected a record')
  if (record.event.filing_date !== '2019-05-02') throw new Error(record.event.filing_date)
})

if (failed) process.exit(1)
console.log('\nIngest filing-date tests passed.')
