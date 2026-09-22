#!/usr/bin/env node
/**
 * Apply ByBizu-voice case drafts: update published WARN stories and queue
 * pending_review rows for bankruptcy/receivership cases (human approval still required).
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { supabaseRest } from '../frontend/functions/lib/supabase-rest.js'
import { caseSlugFor, validateCaseDraft } from '../frontend/functions/lib/case-stories.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readDevVars() {
  const env = {}
  for (const rawLine of readFileSync(resolve(root, '.dev.vars'), 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...parts] = line.split('=')
    env[key.trim()] = parts.join('=').trim()
  }
  return env
}

/** @type {Record<string, { headline: string, dek: string, body: string, video_script: string, flags?: string[] }>} */
const BYBIZU_BY_EVENT = {
  '949ca609-84b7-4071-ab71-983457b7dbc4': {
    headline: 'BCS AD 2 LLC hits Florida bankruptcy docket',
    dek: 'BCS AD 2 LLC appears on Middle District of Florida bankruptcy docket 2:26-bk-01685, filed 2026-07-08.',
    body: `BCS AD 2 LLC hit a Middle District of Florida bankruptcy docket on July 8, 2026.

Docket 2:26-bk-01685. Source: CourtListener RECAP Bankruptcy Dockets. This is public docket metadata, not a judgment.

If the name is on your AR list, subcontract stack, or open purchase order, the court index moved before your CRM did. Vendor screens do not ping for every RECAP line.

Details beyond this docket row are not in the source record. Open the CourtListener file and set a watch on BCS AD 2 LLC before you ship or invoice.

Public filing. Not a finding of liability.`,
    video_script: `BCS AD 2 LLC just landed on a Middle District of Florida bankruptcy docket. July 8, 2026. Docket 2:26-bk-01685. If that name sits on your AR list or subcontract stack, the court index moved first. Pull the CourtListener RECAP file before you release the next PO or wire. Public docket metadata only. Not a judgment. Not a credit score. Watch the next entry.`,
    flags: ['NEEDS SOURCE: asset/creditor details not in source record'],
  },
  '3e25272a-980e-4748-995d-a4b11c2116ff': {
    headline: 'Fairway America lands on Oregon bankruptcy index',
    dek: 'Fairway America Management Group II LLC appears on Oregon bankruptcy docket 26-32379, filed 2026-07-08.',
    body: `Fairway America Management Group II LLC showed up on a District of Oregon bankruptcy docket on July 8, 2026.

Docket 26-32379. Source: CourtListener RECAP Bankruptcy Dockets. Public record metadata only. Not a credit score. Not a verdict.

If you partner with Fairway, lend against their book, or lease to their properties, the index updated before your deal memo did. Capital call calendars do not subscribe to RECAP.

Case posture beyond this metadata row is not in the source. Pull docket 26-32379 on CourtListener before the next draw or renewal.

Public filing. Not a finding of liability.`,
    video_script: `Fairway America Management Group II LLC is on the Oregon bankruptcy index. July 8, 2026. Docket 26-32379. If you have capital or leases tied to this name, the public file updated before your inbox did. Open the RECAP docket on CourtListener before the next draw or renewal. Metadata from a public filing only. Not a verdict. Not financial advice.`,
    flags: ['NEEDS SOURCE: case posture beyond metadata'],
  },
  '89cb28d7-7aee-4ad0-9be7-3e6c915faa74': {
    headline: 'Eggmann and State Farm hit Illinois docket',
    dek: 'Eggmann and State Farm Fire and Casualty Company appear on Illinois docket 26-07016, filed 2026-07-07.',
    body: `Eggmann and State Farm Fire and Casualty Company appear together on an Illinois court docket filed July 7, 2026.

Docket 26-07016. Jurisdiction: U.S. court record (ILCB). Source: CourtListener RECAP Bankruptcy Dockets. Public filing metadata. Not a finding of fault.

If you adjust claims in this market, place reinsurance here, or vendor to State Farm locally, you get the docket date before you get a press release. Index lines rarely arrive with a memo.

The dispute subject is not spelled out in this summary record. Read docket 26-07016 on CourtListener and map any Illinois exposure you carry to both party names.

Public record. Not a finding of liability.`,
    video_script: `Eggmann versus State Farm Fire and Casualty Company. Illinois court index. July 7, 2026. Docket 26-07016. Two names on a public line. If either touches your book, open the file before you renew a policy line or float new exposure. The summary does not spell out the claim. Public metadata only. Not a finding of liability.`,
    flags: ['NEEDS SOURCE: claim subject not in record', 'LEGAL REVIEW: party-vs-party framing without allegation details'],
  },
  '7a387e46-b094-4fed-9f46-1c8484077806': {
    headline: 'SAM Trading Holdings on Texas Chapter 7 docket',
    dek: 'SAM Trading Holdings PCC Limited appears on Texas bankruptcy docket 26-90707, Chapter 7, filed 2026-07-07.',
    body: `SAM Trading Holdings PCC Limited is on a Texas bankruptcy docket dated July 7, 2026.

Docket 26-90707. Jurisdiction: U.S. court record (TXSB). Chapter 7 is on the source record. Source: CourtListener RECAP Bankruptcy Dockets. Public metadata only. Not a judgment.

If you trade, clear, or hold paper with this name, the court index is timestamped and your annual KYC refresh is not. Wire approvals should not wait for the next calendar review.

Case details beyond the docket line are not in this record. Open 26-90707 on CourtListener before the next transfer.

Public filing. Not a finding of liability.`,
    video_script: `SAM Trading Holdings PCC Limited hit the Southern District of Texas index. July 7, 2026. Docket 26-90707. Chapter 7 is listed on the source record. If you move money or goods with this name, the court file moved first. Pull the RECAP docket before you authorize the next transfer. Public metadata only. Not a judgment.`,
    flags: ['NEEDS SOURCE: case details beyond docket line'],
  },
  '513d3683-7f9b-4a82-9a71-0ac0b5e882df': {
    headline: 'Corp. Amer. Lending named in Eighth Circuit receivership',
    dek: 'Receivership record lists Compeer Financial, ACA v. Corp. Amer. Lending, Inc., Eighth Circuit, filed 2026-07-06.',
    body: `A receivership record naming Compeer Financial, ACA and Corp. Amer. Lending, Inc. hit the Court of Appeals for the Eighth Circuit on July 6, 2026.

Source: CourtListener Receivership Records. This is a civil docket event, not a liability ruling. Appointment details are not in this summary.

If you hold paper, sell inputs, or compete for the same borrowers, the court action is on file even when a loan file still says active. Marketing decks will not surface this first.

Why the court acted is not in the summary record. Pull the receivership opinion on CourtListener and pause new exposure to Corp. Amer. Lending, Inc. until you read the order.

Public filing. Not a finding of liability.`,
    video_script: `Compeer Financial versus Corp. Amer. Lending. Receivership record. Eighth Circuit. July 6, 2026. If you are in ag credit or lending in this footprint, read the receivership filing before you float another dollar. The summary does not include the full order text. Public record event only. Not a finding of liability. Open the CourtListener opinion and confirm the parties before you extend new exposure.`,
    flags: ['NEEDS SOURCE: appointment details', 'LEGAL REVIEW: receivership implications described generically'],
  },
  '9725fbf9-6192-42c7-a885-38a1b03059e1': {
    headline: 'Stonebridge Land Development on New Jersey bankruptcy docket',
    dek: 'Stonebridge Land Development LLC appears on New Jersey bankruptcy docket 26-17728 as debtor, filed 2026-07-06.',
    body: `Stonebridge Land Development LLC is on a New Jersey bankruptcy docket dated July 6, 2026.

Docket 26-17728. Jurisdiction: U.S. court record (NJB). Named parties on the source: Stonebridge Land Development LLC as debtor, plus the U.S. Trustee. Source: CourtListener RECAP Bankruptcy Dockets. Public metadata. Not a judgment.

If you hold a lot option, sub grading, or financed a phase, the court file can beat your project manager to the punch. Escrow calendars do not subscribe to RECAP.

Filing scope beyond this metadata row is not in the source. Open docket 26-17728 before you release escrow or mobilize.

Public filing. Not a finding of liability.`,
    video_script: `Stonebridge Land Development LLC is on a New Jersey bankruptcy docket. July 6, 2026. Docket 26-17728. The source lists Stonebridge as debtor with the U.S. Trustee on the party line. If you are in the dirt on this project, pull the RECAP docket before escrow release or mobilization. Public metadata only. Not a judgment.`,
    flags: ['NEEDS SOURCE: filing scope beyond metadata'],
  },
}

/** Published WARN rewrites keyed by case_stories.id */
const PUBLISHED_BY_ID = {
  '0167a530-3180-4953-9089-78c51df7cdf4': {
    headline: 'Kuehne + Nagel WARN: 90 Jobs in Denton',
    dek: 'Texas WARN lists 90 affected workers for KUEHNE + NAGEL (KN) 2026 in Denton, filed 2026-06-16.',
    body: `Ninety workers are on a Texas WARN line for KUEHNE + NAGEL (KN) 2026 in Denton.

Filed June 16, 2026.
Source: Texas WARN Notices.

You trade logistics names.
You short freight.
You watch employment prints for a tell.

This filing hit the public record first.
The press release comes later, if it comes at all.

Ninety jobs in Denton are already on the books. Your screen may still show clean.

Why the notice dropped is not in the filing.

Open the WARN source.
Add Kuehne + Nagel Denton to your watchlist before the next tape move.

Ninety jobs in Denton are already on the books. Your screen may still show clean.

This is a public administrative record, not investment advice.`,
    video_script: `Ninety names. Denton. Kuehne + Nagel. Texas WARN dated June 16, 2026. If you trade logistics or freight, this is the public record before the narrative. Not a tip. Not a prediction. Pull the notice. Watch the name. Administrative WARN filing only.`,
  },
  '12a46959-a1d8-48b3-a4b5-9437564b69e8': {
    headline: 'JPMorgan WARN: 244 Jobs in Collin',
    dek: 'Texas WARN lists 244 affected workers for JPMorgan Chase & Co. in Collin, filed 2026-06-23.',
    body: `Two hundred forty-four workers appear on a JPMorgan Chase & Co. WARN notice in Collin, Texas.

Filed June 23, 2026.
Source: Texas WARN Notices.

You hold the bank.
You trade the financials.
You watch headcount for stress before the earnings call.

The WARN cleared the state feed first.
Your portfolio chat may still be quiet.

Two hundred forty-four jobs are public in Collin. The tape does not announce that for you.

What drove the notice is not stated on the record.

Open the Texas WARN source.
Flag JPMorgan Collin on your desk before the next print.

Two hundred forty-four jobs are public in Collin. The tape does not announce that for you.

This is a public administrative record, not investment advice.`,
    video_script: `Two forty-four on a Collin County WARN for JPMorgan Chase. June 23, 2026. If you trade banks, this is the public headcount signal before rumor season. Open the filing. Watch the name. WARN notice only. Not advice.`,
  },
}

const env = readDevVars()
const now = new Date().toISOString()
const results = { published: [], queued: [], errors: [] }

function assertDraft(draft, sourceFields, label) {
  const check = validateCaseDraft(
    { ...draft, record_type: sourceFields.record_type || draft.record_type },
    sourceFields,
  )
  if (!check.ok) {
    throw new Error(`${label}: ${check.issues.join('; ')}`)
  }
  return check.draft
}

async function patchCase(id, payload) {
  await supabaseRest(env, `case_stories?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ ...payload, updated_at: now }),
  })
}

async function insertCase(row) {
  await supabaseRest(env, 'case_stories', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify([row]),
  })
}

for (const [id, draft] of Object.entries(PUBLISHED_BY_ID)) {
  try {
    const rows = await supabaseRest(
      env,
      `case_stories?select=id,slug,status,source_fields& id=eq.${encodeURIComponent(id)}&limit=1`,
    )
    const row = rows?.[0]
    if (!row || row.status !== 'published') {
      results.errors.push({ id, error: 'published_row_not_found' })
      continue
    }
    const validated = assertDraft(draft, row.source_fields, `published:${id}`)
    await patchCase(id, {
      headline: validated.headline,
      dek: validated.dek,
      body: validated.body,
      video_script: validated.video_script,
      model: 'bybizu-manual-v1',
      generation_notes: ['ByBizu voice rewrite applied directly to published case'],
    })
    results.published.push({ id, slug: row.slug, headline: validated.headline })
  } catch (error) {
    results.errors.push({ id, error: error.message })
  }
}

const reviewJson = JSON.parse(readFileSync(resolve(root, '.case-generation-review.json'), 'utf8'))

for (const entry of reviewJson) {
  const eventId = entry.event_id
  const bybizu = BYBIZU_BY_EVENT[eventId]
  if (!bybizu) continue

  try {
    const sourceFields = entry.source_fields
    const validated = assertDraft(bybizu, sourceFields, `queue:${eventId}`)
    const flags = bybizu.flags || []
    const generationNotes = ['ByBizu voice first draft', ...flags.map((f) => `[${f}]`)]

    const existing = await supabaseRest(
      env,
      `case_stories?select=id,slug,status&event_id=eq.${encodeURIComponent(eventId)}&limit=1`,
    )
    const row = existing?.[0]

    if (row) {
      await patchCase(row.id, {
        status: 'pending_review',
        headline: validated.headline,
        dek: validated.dek,
        body: validated.body,
        video_script: validated.video_script,
        record_type: entry.draft?.record_type || sourceFields.record_type,
        model: 'bybizu-manual-v1',
        generation_notes: generationNotes,
        reviewed_by: null,
      })
      results.queued.push({ event_id: eventId, id: row.id, slug: row.slug, action: 'updated_to_pending_review' })
    } else {
      const slug = caseSlugFor(validated.headline, eventId)
      await insertCase({
        slug,
        status: 'pending_review',
        headline: validated.headline,
        dek: validated.dek,
        body: validated.body,
        video_script: validated.video_script,
        record_type: entry.draft?.record_type || sourceFields.record_type,
        event_id: eventId,
        entity_id: entry.draft?.entity_id || null,
        source_fields: sourceFields,
        model: 'bybizu-manual-v1',
        generation_notes: generationNotes,
      })
      results.queued.push({ event_id: eventId, slug, action: 'inserted_pending_review' })
    }
  } catch (error) {
    results.errors.push({ event_id: eventId, error: error.message })
  }
}

console.log(JSON.stringify(results, null, 2))
if (results.errors.length) process.exit(1)
