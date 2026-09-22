#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { parseCaliforniaWarnXlsx, excelSerialToIsoDate } from '../frontend/functions/lib/warn-xlsx.js'
import {
  mapCaliforniaWarnRows,
  mapIllinoisWarnRows,
  mapNewYorkWarnRows,
  parseCsvRows,
} from '../frontend/functions/lib/warn-ingest.js'
import { warnSeverityFromWorkers } from '../frontend/functions/lib/warn-notice.js'

let failed = 0
async function check(label, fn) {
  try {
    await fn()
    console.log(`ok ${label}`)
  } catch (error) {
    failed += 1
    console.error(`fail ${label}:`, error instanceof Error ? error.message : error)
  }
}

await check('converts excel serial dates', async () => {
  const date = excelSerialToIsoDate(46203)
  if (!date || !date.startsWith('2026-')) throw new Error(`expected 2026 date, got ${date}`)
})

await check('parses california warn xlsx fixture', async () => {
  const buffer = readFileSync(new URL('../test/fixtures/warn_report1.xlsx', import.meta.url))
  const rows = await parseCaliforniaWarnXlsx(buffer)
  if (!rows.length) throw new Error('expected CA rows')
  if (!rows[0].company) throw new Error('missing company')
  const mapped = mapCaliforniaWarnRows(rows, {
    slug: 'california-warn-notices',
    jurisdiction: 'CA',
    source_url: 'https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report1.xlsx',
  })
  if (!mapped[0].event.entity_name) throw new Error('missing mapped entity')
})

await check('parses new york warn csv fixture', async () => {
  const text = readFileSync(new URL('../test/fixtures/ny-warn-sample.csv', import.meta.url), 'utf8')
  const rows = parseCsvRows(text)
  if (rows.length < 2) throw new Error('expected NY rows')
  const mapped = mapNewYorkWarnRows(rows, {
    slug: 'new-york-warn-notices',
    jurisdiction: 'NY',
    source_url: 'https://public.tableau.com/views/WorkerAdjustmentRetrainingNotificationWARN/WARN',
  })
  const large = mapped.find((record) => Number(record.event.amount) >= 100)
  if (!large) throw new Error('expected a large NY layoff in fixture')
  if (warnSeverityFromWorkers(large.event.amount) < 80) throw new Error('NY large layoff should reach case-draft severity')
})

await check('maps illinois warn api rows', async () => {
  const mapped = mapIllinoisWarnRows(
    [
      {
        Id: 9130,
        IebsId: '20260709002',
        LocationName: 'Eurofins Environment Testing North Central, LLC',
        City: 'Geneva',
        State: 'IL',
        InitialReportDate: '2026-07-07T00:00:00',
        ExpectedLayoff: '2026-09-30T00:00:00',
        LayoffCount: 29,
        Reason: 'Mass Layoff',
        LayoffType: 'State',
        IndustryName: 'Professional and Technical Services',
      },
    ],
    {
      slug: 'illinois-warn-notices',
      jurisdiction: 'IL',
      source_url: 'https://apps.illinoisworknet.com/iebs/api/public/searchWarn',
    },
  )
  if (mapped[0].raw.source_record_id !== 'il-warn-20260709002') {
    throw new Error(`unexpected id ${mapped[0].raw.source_record_id}`)
  }
  if (mapped[0].event.filing_date !== '2026-07-07') throw new Error(mapped[0].event.filing_date)
})

if (failed) process.exit(1)
console.log('\nWARN adapter tests passed.')
