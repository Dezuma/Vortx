#!/usr/bin/env node
import {
  deriveTradingSignalMeta,
  form4Severity,
  mapCongressTrade,
  mapForm4Filing,
  mapInstitutional13f,
  parseEdgarAtomEntries,
  selectBalancedTradingFeed,
  thirteenfFormLabel,
  thirteenfPeriodLabel,
  tradingRecordLabel,
} from '../frontend/functions/lib/trading-filings.js'
import {
  indexJsonUrlFromAtomLink,
  ownershipXmlUrlFromIndexHtml,
  parseOwnershipDocument,
  pickOwnershipXmlName,
} from '../frontend/functions/lib/form4-ownership.js'
import { mapHouseClerkPtrRow } from '../frontend/functions/lib/house-clerk-ptr.js'
import {
  attachFilingIdentifiers,
  cikFromSourceValue,
  edgarFilingIndexUrl,
  eventEvidenceListPath,
  isGenericSourceDeskUrl,
  isPublicRecordFilingUrl,
  officialSecFilingUrl,
  resolveEventSourceUrl,
} from '../frontend/functions/lib/event-evidence.js'

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

check('parses Form 4 atom titles', () => {
  const xml = `<?xml version="1.0"?>
  <feed>
    <entry>
      <title>424B2 - UBS AG (0001114446) (Filer)</title>
      <updated>2026-07-28T15:04:00-04:00</updated>
      <id>tag:sec.gov,2008:accession-number=0000</id>
      <link href="https://www.sec.gov/Archives/edgar/data/1/0000-index.htm"/>
    </entry>
    <entry>
      <title>4 - Example Issuer Inc (EXMP) (0001234567)</title>
      <updated>2026-07-28T15:04:00-04:00</updated>
      <id>tag:sec.gov,2008:accession-number=0001</id>
      <link href="https://www.sec.gov/Archives/edgar/data/1/0001-index.htm"/>
    </entry>
  </feed>`
  const entries = parseEdgarAtomEntries(xml, { formPrefix: '4' })
  if (entries.length !== 1) throw new Error(`expected 1 entry, got ${entries.length}`)
  if (entries[0].ticker !== 'EXMP') throw new Error(`bad ticker: ${entries[0].ticker}`)
  if (!entries[0].companyName.includes('Example Issuer')) throw new Error('bad issuer')
})

check('tags Form 4 Reporting vs Issuer roles', () => {
  const xml = `<?xml version="1.0"?>
  <feed>
    <entry>
      <title>4 - Jane Executive (0001111111) (Reporting)</title>
      <updated>2026-07-28T15:04:00-04:00</updated>
      <id>tag:sec.gov,2008:accession-number=0002</id>
      <link href="https://www.sec.gov/Archives/edgar/data/1/0002-index.htm"/>
    </entry>
    <entry>
      <title>4 - Example Issuer Inc (EXMP) (0001234567) (Issuer)</title>
      <updated>2026-07-28T15:05:00-04:00</updated>
      <id>tag:sec.gov,2008:accession-number=0003</id>
      <link href="https://www.sec.gov/Archives/edgar/data/1/0003-index.htm"/>
    </entry>
  </feed>`
  const entries = parseEdgarAtomEntries(xml, { formPrefix: '4' })
  if (entries.length !== 2) throw new Error(`expected 2 entries, got ${entries.length}`)
  if (entries[0].role !== 'reporting') throw new Error(`bad role ${entries[0].role}`)
  if (entries[1].role !== 'issuer') throw new Error(`bad role ${entries[1].role}`)
  const person = mapForm4Filing(
    { filer: entries[0].companyName, issuer: '', filing_date: '2026-07-28', id: 'acc-2' },
    { slug: 'sec-edgar-form4', source_url: 'https://www.sec.gov/' },
  )
  if (!person.event.entity_name.includes('Jane Executive')) throw new Error('person-first entity missing')
  if (!person.event.summary.includes('Reporting owner:')) throw new Error('reporting owner summary missing')
})

check('maps Form 4 without inventing amounts', () => {
  const record = mapForm4Filing(
    { companyName: 'Example Issuer Inc', ticker: 'EXMP', filing_date: '2026-07-28', id: 'acc-1' },
    { slug: 'sec-edgar-form4', source_url: 'https://www.sec.gov/' },
  )
  if (record.event.event_type !== 'form_4') throw new Error('bad type')
  if (record.event.amount != null) throw new Error('invented amount')
  if (!record.event.title.includes('Example Issuer')) throw new Error('missing issuer')
})

check('maps congress trade from sourced fields only', () => {
  const record = mapCongressTrade(
    {
      representative: 'Jane Doe',
      ticker: 'ABC',
      disclosure_date: '2026-07-20',
      type: 'Purchase',
      amount: '15001',
    },
    { slug: 'house-stock-act-ptr', jurisdiction: 'US-House', source_url: 'https://example.test' },
  )
  if (record.event.event_type !== 'congress_trade') throw new Error('bad type')
  if (record.event.amount !== 15001) throw new Error(`bad amount ${record.event.amount}`)
  if (!record.event.title.includes('Jane Doe')) throw new Error('missing member')
})

check('maps 13F filer as holdings report grain', () => {
  const record = mapInstitutional13f(
    { filer: 'Example Capital LP', title: '13F-HR/A - Example Capital LP', filing_date: '2026-07-15', id: '13f-1' },
    { slug: 'sec-edgar-13f', source_url: 'https://www.sec.gov/' },
  )
  if (record.event.event_type !== 'institutional_13f') throw new Error('bad type')
  if (!tradingRecordLabel('institutional_13f').includes('13F')) throw new Error('bad label')
  if (!record.event.summary.includes('not a buy/sell')) throw new Error('13F grain honesty missing')
  if (record.event.severity > 70) throw new Error(`13F severity too high: ${record.event.severity}`)
  if (!record.event.title.startsWith('13F-HR/A')) throw new Error(record.event.title)
  if (!record.event.summary.includes('Form on record: 13F-HR/A')) throw new Error(record.event.summary)
  if (!record.event.summary.includes('Report period: Q2 2026')) throw new Error(record.event.summary)
})

check('thirteenf form and period labels stay ticker-free', () => {
  if (thirteenfFormLabel('13F-HR - Example Capital LP (Filer)') !== '13F-HR') {
    throw new Error(thirteenfFormLabel('13F-HR - Example Capital LP (Filer)'))
  }
  if (thirteenfFormLabel('13F-NT/A - Notice filer') !== '13F-NT/A') {
    throw new Error(thirteenfFormLabel('13F-NT/A - Notice filer'))
  }
  if (thirteenfFormLabel('13F institutional filing: Locked entity') !== '13F-HR') {
    throw new Error('default form')
  }
  if (thirteenfPeriodLabel('2026-08-21') !== 'Q2 2026') throw new Error(thirteenfPeriodLabel('2026-08-21'))
  if (thirteenfPeriodLabel('2026-02-10') !== 'Q4 2025') throw new Error(thirteenfPeriodLabel('2026-02-10'))
  if (thirteenfPeriodLabel('') !== '') throw new Error('empty period')
})

check('Form 4 ownership XML supplies code/shares/trade date', () => {
  const xml = `<?xml version="1.0"?>
  <ownershipDocument>
    <issuer>
      <issuerCik>0001234567</issuerCik>
      <issuerName>Example Issuer Inc</issuerName>
      <issuerTradingSymbol>EXMP</issuerTradingSymbol>
    </issuer>
    <reportingOwner>
      <reportingOwnerId>
        <rptOwnerCik>0001111111</rptOwnerCik>
        <rptOwnerName>Jane Executive</rptOwnerName>
      </reportingOwnerId>
    </reportingOwner>
    <nonDerivativeTransaction>
      <transactionDate><value>2026-07-22</value></transactionDate>
      <transactionCoding><transactionCode>P</transactionCode></transactionCoding>
      <transactionAmounts>
        <transactionShares><value>1000</value></transactionShares>
        <transactionPricePerShare><value>10.50</value></transactionPricePerShare>
      </transactionAmounts>
    </nonDerivativeTransaction>
  </ownershipDocument>`
  const parsed = parseOwnershipDocument(xml)
  if (!parsed || parsed.ticker !== 'EXMP') throw new Error('bad ticker')
  if (parsed.transactionCode !== 'P') throw new Error('bad code')
  if (parsed.tradeDate !== '2026-07-22') throw new Error('bad trade date')
  if (parsed.amount !== 10500) throw new Error(`bad amount ${parsed.amount}`)
  const indexUrl = indexJsonUrlFromAtomLink(
    'https://www.sec.gov/Archives/edgar/data/1/0001-index.htm',
  )
  if (!indexUrl.endsWith('-index.json')) throw new Error(`bad index url ${indexUrl}`)
  const picked = pickOwnershipXmlName([{ name: 'xslF345X05/primary.xml' }, { name: 'form4.xml' }])
  if (picked !== 'form4.xml') throw new Error(`bad pick ${picked}`)
  const mapped = mapForm4Filing(
    {
      filer: parsed.ownerName,
      issuer: parsed.issuerName,
      ticker: parsed.ticker,
      transactionCode: parsed.transactionCode,
      amount: parsed.amount,
      trade_date: parsed.tradeDate,
      filing_date: '2026-07-23',
      ownership_enriched: true,
      id: 'acc-own-1',
    },
    { slug: 'sec-edgar-form4', source_url: 'https://www.sec.gov/' },
  )
  if (mapped.event.trade_date !== '2026-07-22') throw new Error('mapped trade_date missing')
  if (mapped.event.severity < 70) throw new Error('enriched purchase severity too low')
})

check('House Clerk PTR index maps disclosure without inventing ticker', () => {
  const record = mapHouseClerkPtrRow(
    {
      First: 'Alex',
      Last: 'Member',
      Year: '2026',
      DocID: '20012345',
      FilingDate: '07/28/2026',
      StateDst: 'TX12',
      FilingType: 'P',
    },
    { slug: 'house-stock-act-ptr', source_url: 'https://disclosures-clerk.house.gov/' },
  )
  if (record.event.event_type !== 'congress_trade') throw new Error('bad type')
  if (record.event.amount != null) throw new Error('invented amount')
  if (record.event.trade_date != null) throw new Error('invented trade_date')
  if (!String(record.event.evidence_url).includes('20012345.pdf')) throw new Error('bad pdf url')
  if (record.event.severity > 70) throw new Error(`ptr index severity too high: ${record.event.severity}`)
})

check('Form 4 without code stays below fake HOT severity', () => {
  const score = form4Severity({
    filingDate: '2026-07-28',
    filerName: 'Jane Executive',
    role: 'reporting',
  })
  if (score >= 75) throw new Error(`severity ${score} looks like fake HOT`)
})

check('resolves ownership.xml from HTML index when index.json is missing', () => {
  const html = `
    <table>
      <tr><td><a href="/Archives/edgar/data/1/0001/xslF345X06/ownership.xml">xsl</a></td></tr>
      <tr><td><a href="/Archives/edgar/data/1/0001/ownership.xml">xml</a></td></tr>
    </table>`
  const url = ownershipXmlUrlFromIndexHtml(html)
  if (!url.endsWith('/ownership.xml') || /xsl/i.test(url)) throw new Error(`bad url ${url}`)
})

check('decodes HTML entities in Form 4 names', () => {
  const record = mapForm4Filing(
    { filer: "O&#39;Shea Robert J", filing_date: '2026-07-30', id: 'acc-apos' },
    { slug: 'sec-edgar-form4', source_url: 'https://www.sec.gov/' },
  )
  if (record.event.entity_name.includes('&#')) throw new Error('entity not decoded')
  if (!record.event.entity_name.includes("O'Shea")) throw new Error(record.event.entity_name)
})

check('selectBalancedTradingFeed keeps Form 4 rows beside 13F', () => {
  const rows = [
    ...Array.from({ length: 30 }, (_, i) => ({
      id: `f-${i}`,
      event_type: 'institutional_13f',
      display_severity: 90,
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `i-${i}`,
      event_type: 'form_4',
      display_severity: 60,
    })),
  ]
  const picked = selectBalancedTradingFeed(rows, 40)
  const form4 = picked.filter((r) => r.event_type === 'form_4').length
  const thirteenf = picked.filter((r) => r.event_type === 'institutional_13f').length
  if (form4 < 6) throw new Error(`form_4 count ${form4}`)
  if (thirteenf < 6) throw new Error(`13f count ${thirteenf}`)
  if (picked.length !== 40) throw new Error(`len ${picked.length}`)
})

check('deriveTradingSignalMeta reads ticker from Form 4 title', () => {
  const meta = deriveTradingSignalMeta({
    event_type: 'form_4',
    title: 'Form 4 insider filing: FARRELL PETER C (RMD) sale',
    summary: 'Reporting owner: FARRELL PETER C. Issuer on record: RESMED INC. Ticker on record: RMD.',
  })
  if (meta.ticker_label !== 'RMD') throw new Error(String(meta.ticker_label))
  if (!/RESMED/i.test(meta.issuer_label || '')) throw new Error(String(meta.issuer_label))
})

check('deriveTradingSignalMeta exposes 13F form and period without ticker', () => {
  const meta = deriveTradingSignalMeta({
    event_type: 'institutional_13f',
    title: '13F-HR institutional filing: Example Capital LP',
    summary: 'SEC 13F-HR holdings report. Form on record: 13F-HR. Report period: Q2 2026.',
    filing_date: '2026-08-21',
  })
  if (meta.form_label !== '13F-HR') throw new Error(String(meta.form_label))
  if (meta.period_label !== 'Q2 2026') throw new Error(String(meta.period_label))
  if (meta.ticker_label) throw new Error(`13F should not invent ticker ${meta.ticker_label}`)
})

check('generic clerk overview is not treated as a filing URL', () => {
  if (!isGenericSourceDeskUrl('https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure')) {
    throw new Error('overview should be generic')
  }
  const pdf = 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20012345.pdf'
  if (isGenericSourceDeskUrl(pdf)) throw new Error('ptr pdf should be specific')
  const evidence = new Map([['e1', pdf]])
  const resolved = resolveEventSourceUrl(
    { id: 'e1', source_id: 's1' },
    new Map([['s1', { source_url: 'https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure' }]]),
    evidence,
  )
  if (resolved !== pdf) throw new Error(resolved)
})

check('maps Form 4 atom link to an EDGAR filing receipt', () => {
  const href = 'https://www.sec.gov/Archives/edgar/data/1234567/000123456725000001/0001234567-25-000001-index.htm'
  const record = mapForm4Filing(
    {
      filer: 'Jane Executive',
      issuer: 'Example Issuer Inc',
      ticker: 'EXMP',
      filing_date: '2026-07-28',
      id: 'tag:sec.gov,2008:accession-number=0001234567-25-000001',
      link: href,
      cik: '0001234567',
    },
    { slug: 'sec-edgar-form4', source_url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4' },
  )
  if (record.event.evidence_url !== href) throw new Error(record.event.evidence_url)
})

check('maps 13F from cik and accession when atom link is missing', () => {
  const record = mapInstitutional13f(
    {
      filer: 'Example Capital LP',
      title: '13F-HR - Example Capital LP',
      filing_date: '2026-07-15',
      id: 'tag:sec.gov,2008:accession-number=0001535684-26-000088',
      cik: '0001535684',
    },
    { slug: 'sec-edgar-13f', source_url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=13F' },
  )
  const expected = edgarFilingIndexUrl('0001535684', '0001535684-26-000088')
  if (record.event.evidence_url !== expected) throw new Error(record.event.evidence_url || 'missing')
  if (/browse-edgar/i.test(record.event.evidence_url || '')) throw new Error('catalog url leaked')
  if (!record.event.summary.includes('CIK on record: 0001535684')) throw new Error(record.event.summary)
  if (!record.event.summary.includes('Accession: 0001535684-26-000088')) throw new Error(record.event.summary)
})

check('does not persist a generic EDGAR desk as Form 4 evidence', () => {
  const record = mapForm4Filing(
    { filer: 'Jane Executive', filing_date: '2026-07-28', id: 'acc-no-link' },
    { slug: 'sec-edgar-form4', source_url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4' },
  )
  if (record.event.evidence_url) throw new Error(record.event.evidence_url)
})

check('rejects EDGAR search desks and keeps accession filings', () => {
  const current = 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=13F&company=&dateb=&owner=include&count=40'
  const company = 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001234567&type=13F&dateb=&owner=include&count=10'
  const filing = 'https://www.sec.gov/Archives/edgar/data/1234567/000123456725000001/0001234567-25-000001-index.htm'
  if (!isGenericSourceDeskUrl(current)) throw new Error('getcurrent should be generic')
  if (!isGenericSourceDeskUrl(company)) throw new Error('getcompany should be generic')
  if (isGenericSourceDeskUrl(filing)) throw new Error('archives filing should be specific')
  if (!isPublicRecordFilingUrl(filing)) throw new Error('archives should be public record')
  if (isPublicRecordFilingUrl(current)) throw new Error('desk should not be public record')
  const rejected = resolveEventSourceUrl(
    { id: 'e2', source_id: 's2' },
    new Map([['s2', { source_url: current }]]),
    new Map([['e2', current]]),
  )
  if (rejected) throw new Error(`generic URL leaked: ${rejected}`)
  const constructed = resolveEventSourceUrl(
    { id: 'e3', cik: '0001234567' },
    new Map(),
    new Map([['e3', 'tag:sec.gov,2008:accession-number=0001234567-25-000001']]),
  )
  if (constructed !== filing) throw new Error(constructed)
  const missing = resolveEventSourceUrl({ id: 'e4' }, new Map(), new Map())
  if (missing) throw new Error(`missing evidence leaked: ${missing}`)
  if (officialSecFilingUrl({ cik: '0001234567', accession: '0001234567-25-000001' }) !== filing) {
    throw new Error('construct from cik+accession failed')
  }
})

check('event evidence query uses retrieved_at not created_at', () => {
  const path = eventEvidenceListPath(['e1'])
  if (!path.includes('order=retrieved_at.desc')) throw new Error(path)
  if (path.includes('created_at')) throw new Error(`wrong timestamp: ${path}`)
  if (!eventEvidenceListPath(['e1'], { order: false }).endsWith('event_id=in.(e1)')) {
    throw new Error(eventEvidenceListPath(['e1'], { order: false }))
  }
})

check('does not treat a UUID event id as an accession', () => {
  const uuid = '298e2c2c-ea2a-4359-b07d-87b310fc95ee'
  const built = officialSecFilingUrl({ id: uuid, cik: '0001234567' })
  if (built) throw new Error(`uuid leaked into archives url: ${built}`)
})

check('constructs Archives URL from stored identifiers without evidence rows', () => {
  const filing = 'https://www.sec.gov/Archives/edgar/data/1535684/000153568426000088/0001535684-26-000088-index.htm'
  const identified = attachFilingIdentifiers(
    { id: 'evt-1', title: '13F-HR institutional filing: Example Capital LP' },
    {
      entity: { cik: '0001535684' },
      raw: { source_record_id: '0001535684-26-000088', payload: { cik: '0001535684', accession: '0001535684-26-000088' } },
    },
  )
  const resolved = resolveEventSourceUrl(identified, new Map(), new Map())
  if (resolved !== filing) throw new Error(resolved)
})

check('constructs Archives URL from summary CIK and accession', () => {
  const filing = 'https://www.sec.gov/Archives/edgar/data/1535684/000153568426000088/0001535684-26-000088-index.htm'
  const fromSummary = officialSecFilingUrl({
    summary: 'SEC 13F-HR holdings report. CIK on record: 0001535684. Accession: 0001535684-26-000088.',
  })
  if (fromSummary !== filing) throw new Error(fromSummary || 'missing')
  if (cikFromSourceValue('CIK on record: 0001535684') !== '0001535684') throw new Error('cik parse')
})

check('missing identifiers stay empty and generic desks stay rejected', () => {
  const missing = resolveEventSourceUrl({ id: 'e-missing', title: '13F-HR institutional filing: Unknown' }, new Map(), new Map())
  if (missing) throw new Error(`missing identifiers leaked: ${missing}`)
  const desk = 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=13F'
  const rejected = resolveEventSourceUrl(
    { id: 'e-desk', cik: '0001234567' },
    new Map(),
    new Map([['e-desk', desk]]),
  )
  if (rejected) throw new Error(`generic URL leaked: ${rejected}`)
})

if (failed) process.exit(1)
console.log('\nAll trading-filings checks passed.')
