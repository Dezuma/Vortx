#!/usr/bin/env node
/** One-shot seed of Form 4 / 13F / House STOCK Act into ingest_legal_records. */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { supabaseRest } from '../frontend/functions/lib/supabase-rest.js'
import {
  mapCongressTrade,
  mapForm4Filing,
  mapInstitutional13f,
  parseEdgarAtomEntries,
} from '../frontend/functions/lib/trading-filings.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readDevVars() {
  const env = {}
  for (const raw of readFileSync(resolve(root, '.dev.vars'), 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function ingestSource(env, source, records) {
  for (const record of records) {
    record.raw.payload_hash = await sha256Hex(
      `${source.slug}:${record.raw.source_record_id}:${JSON.stringify(record.raw.payload)}`,
    )
    record.raw.source_timestamp = new Date().toISOString()
    record.raw.retrieved_at = new Date().toISOString()
  }
  const url = `${String(env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/rest/v1/rpc/ingest_legal_records`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      source: {
        slug: source.slug,
        name: source.name,
        jurisdiction: source.jurisdiction,
        record_type: source.record_type,
        access_method: 'api',
        terms_status: 'approved',
        refresh_cadence: 'daily',
        source_url: source.source_url,
        enabled: true,
        notes: 'Trading pivot ingest',
        last_success_at: new Date().toISOString(),
        adapter_kind: source.adapter_kind,
        rate_limit_per_hour: 60,
        terms_reviewed_at: new Date().toISOString(),
      },
      records,
    }),
  })
  const text = await res.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    payload = { raw: text }
  }
  if (!res.ok) throw new Error(JSON.stringify(payload))
  return payload
}

const env = readDevVars()
const ua = {
  'user-agent': 'VortxResearchBot/1.0 (https://vortxmkt.com)',
  accept: 'application/atom+xml,application/json',
}

const form4Src = {
  slug: 'sec-edgar-form4',
  name: 'SEC EDGAR Form 4 Filings',
  jurisdiction: 'US-SEC',
  record_type: 'form_4',
  adapter_kind: 'sec_edgar_form4_atom',
  source_url:
    'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&company=&dateb=&owner=include&count=100&output=atom',
}
const form4Xml = await fetch(form4Src.source_url, { headers: ua }).then((r) => r.text())
const form4 = parseEdgarAtomEntries(form4Xml, { formPrefix: '4' })
  .slice(0, 15)
  .map((e, i) => mapForm4Filing({ ...e, filer: e.companyName, issuer: e.companyName }, form4Src, i))
console.log('form4 records', form4.length)
if (form4[0]) console.log('sample', form4[0].event.title, form4[0].event.entity_name)
console.log(await ingestSource(env, form4Src, form4))

const f13 = {
  slug: 'sec-edgar-13f',
  name: 'SEC EDGAR 13F Institutional Filings',
  jurisdiction: 'US-SEC',
  record_type: 'institutional_13f',
  adapter_kind: 'sec_edgar_13f_atom',
  source_url:
    'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=13F&company=&dateb=&owner=include&count=100&output=atom',
}
const f13Xml = await fetch(f13.source_url, { headers: ua }).then((r) => r.text())
const f13recs = parseEdgarAtomEntries(f13Xml, { formPrefix: '13F' })
  .slice(0, 10)
  .map((e, i) => mapInstitutional13f({ ...e, filer: e.companyName }, f13, i))
console.log('13f records', f13recs.length, await ingestSource(env, f13, f13recs))

try {
  const house = {
    slug: 'house-stock-act-ptr',
    name: 'House STOCK Act Periodic Transaction Reports',
    jurisdiction: 'US-House',
    record_type: 'congress_trade',
    adapter_kind: 'house_stock_act_ptr',
    source_url: 'https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure',
    data_url:
      'https://raw.githubusercontent.com/house-stock-watcher/data/master/data/all_transactions.json',
  }
  const rows = await fetch(house.data_url, { headers: { accept: 'application/json' } }).then((r) => r.json())
  const recent = (Array.isArray(rows) ? rows : [])
    .slice()
    .sort((a, b) => String(b.disclosure_date || '').localeCompare(String(a.disclosure_date || '')))
    .slice(0, 25)
    .map((r, i) => mapCongressTrade(r, house, i))
  console.log('house ptr records', recent.length, await ingestSource(env, house, recent))
} catch (error) {
  console.log('house ptr skip', error instanceof Error ? error.message : error)
}

await ingestSource(
  env,
  {
    slug: 'senate-stock-act-efd',
    name: 'Senate STOCK Act eFD Disclosures',
    jurisdiction: 'US-Senate',
    record_type: 'congress_trade',
    adapter_kind: 'senate_stock_act_efd',
    source_url: 'https://efdsearch.senate.gov/search/',
  },
  [],
)
console.log('senate catalog registered')

const counts = await supabaseRest(
  env,
  'legal_events?select=event_type&or=(event_type.eq.form_4,event_type.eq.congress_trade,event_type.eq.institutional_13f)&limit=500',
)
const by = {}
for (const row of counts || []) by[row.event_type] = (by[row.event_type] || 0) + 1
console.log('trading events in db', by)
