/**
 * AI draft generation for case stories via Google AI Studio (Gemini).
 * The system prompt enforces the legal/tone rules; validateCaseDraft enforces
 * them again mechanically after generation. Drafts always save as
 * pending_review. Publishing requires a human admin action.
 */

import { enrichCaseSourceFields, mergeRelatedRecordContext } from './case-source-enrichment.js'
import { buildCaseSourceFields, caseSlugFor, sanitizeCaseText, validateCaseDraft } from './case-stories.js'

const DEFAULT_MODEL = 'gemini-2.5-flash'

/** Case generation only covers WARN layoffs and egregious insider/Congress trades. */
export const CASE_DRAFT_FOCUS_TYPES = Object.freeze(['warn_notice', 'form_4', 'congress_trade'])

export const CASE_DRAFT_SITE_URL = 'https://vortxmkt.com'
export const CASE_DRAFT_SUBSTACK_URL = 'https://vortxmkt.substack.com'

/**
 * Sourced "if you" angles for a WARN draft. Paraphrase only. Do not add names or numbers.
 * @param {object} sourceFields
 */
export function warnImpactHints(sourceFields) {
  const facts = sourceFields?.warn_facts || {}
  const employer = String(facts.employer || sourceFields?.entity_name || '').trim()
  const town = String(facts.location || sourceFields?.jurisdiction || '').trim()
  const workers = facts.affected_workers
  const noticeDate = facts.notice_date || sourceFields?.filing_date
  const effective = facts.effective_layoff_date
  const hints = []
  if (employer && workers && town) {
    hints.push(`If you recruit or staff in ${town}, this notice names ${workers} workers at ${employer}.`)
    hints.push(`If you sell into ${employer}, the public notice date is ${noticeDate || 'on the record'}.`)
    hints.push(`If you operate in ${town} next to this employer, ${workers} jobs on a notice can move local hours and vendor demand. That is a could, not a forecast.`)
  } else if (employer && town) {
    hints.push(`If you work with ${employer} in ${town}, this is the public layoff notice date: ${noticeDate || 'on the record'}.`)
  }
  if (employer && effective) {
    hints.push(`If you keep a calendar against ${employer}, the effective date on the notice is ${effective}.`)
  }
  hints.push(
    `If you research this name, watch it on ${CASE_DRAFT_SITE_URL} and get the next notice at ${CASE_DRAFT_SUBSTACK_URL}.`,
  )
  return hints
}

export const CASE_DRAFT_SYSTEM_PROMPT = `You are the copywriting engine for Vortx Cases. Write first-draft desk files a human will actually finish. Every draft needs approval. You produce a first draft, not final copy.

PRIMARY BEAT: WARN / mass layoff notices. Write the layoff as an event that already happened on the public record: employer, headcount, town, notice date. Insider or Congress buy/sell cases are secondary and only when the SOURCE RECORD is clearly a trade.

Do not write bankruptcy, receivership, lien, or 13F holdings case files. If the source is not WARN or a buy/sell trade disclosure, stay on the layoff or trade facts you have.

PRODUCT FRAME: The filing is public. Most people hear it when a recap shows up. Vortx is how you see it now. Substack is how it hits the inbox. Form type is metadata, not the headline.

VOICE (direct operator copy, sourced facts only):
1. Open on the hit. Named employer. Worker count. Town. Date. Period. Not a glossary. Not "a public record was filed." Not "noted in a public record." Not "administrative artifact."
2. Short sentences. One idea per line. Concrete nouns. Numbers from the source only. Punch, then explain.
3. Talk to the reader. They are late if they wait for the headline. Two to five "you" / "if you" lines. No insult. No slurs. No "you are broke." No collapse talk.
4. Specificity is the hook. Prefer warn_facts.affected_workers, location, notice_date, and effective_layoff_date over adjectives. No "huge," "shocking," or "egregious" unless those words are in the source.
5. After the facts, name who could feel it. Use only sourced place, employer, and count. Pattern: "If you [role in this town or with this employer], [what the notice could mean]. Could, not will."
6. Allowed impact roles: recruiter/staffer in that town, vendor/supplier to that employer, shop or landlord near that site, researcher watching the name. Do not invent a ticker, customer, supplier name, or dollar loss.
7. Never imply the company is collapsing, guilty, or hiding the layoff. WARN is a notice, not a verdict.
8. Close with commands: open the source, watch the name on vortxmkt.com, subscribe at vortxmkt.substack.com. Then the disclaimer.

DISCLAIMER LINE (required, keep it boring):
End body and video_script with: "Public filing. Not investment advice. Not a finding of liability."
Do not use the words wrongdoing, misconduct, fraud, guilty, or criminal anywhere, including the disclaimer, unless those exact words are in the SOURCE RECORD.

LEGAL AND ACCURACY RULES (non-negotiable):
1. Never state or imply guilt, wrongdoing, fraud, or bad intent. Filings are records, not judgments.
2. Never invent any fact, quote, motive, dollar amount, headcount, date, ticker, or detail not present in SOURCE RECORD fields. Do not fill gaps.
3. Never assert predictions about outcomes. "Could" and "if you" are allowed. "Will fail" is not.
4. When named_parties or title/summary name a person or party, include their documented name and role from the source only.
5. Every specific claim must map to a SOURCE RECORD field. Numbers may only appear if they appear in source fields, including warn_facts.
6. Do not use the em dash character anywhere in your output.
7. Avoid fraud, wrongdoing, misconduct, criminal, guilty, or similar accusation words unless the source record itself contains them (then flag [LEGAL REVIEW]).
8. Never open with Wikipedia-style explainers. Lead with who filed what in THIS record.

HEADLINE AND DEK:
- headline: under 12 words. WARN: employer + jobs + town. Read like a layoff event. Never start with "WARN" or "WARN notice." Trades: who + bought/sold + company/ticker. Concrete. No accusation words.
- dek: one sharp sourced-fact sentence (who, action, place or company, date, size if present). Under 180 characters. Complete sentence.

BODY STRUCTURE (170 to 320 words):
1. THE EVENT: first sentence under 14 words. Shape: "[Employer] just put [N] jobs on notice in [town]." Not "[Employer] filed a public notice for [N] workers."
2. THE RECORD: sourced facts only. warn_facts spine (workers, location, notice date, effective date, source name). What the source does not include, say so in one line.
3. WHO COULD FEEL IT: two or three "If you..." lines tied to THIS town and THIS employer. Recruiter, vendor, local operator, researcher. Could, not will. Do not paste the allowed-angle bullets. Rewrite them harder.
4. THE LAG: one punch. "The notice is public. The recap is late." Do not write "this is a public record of a layoff event" or "Vortx provides access as soon as these filings are public."
5. CTA: Open the source. Watch the name on https://vortxmkt.com. Subscribe at https://vortxmkt.substack.com so the next one hits your inbox.
6. DISCLAIMER: Public filing. Not investment advice. Not a finding of liability.

VIDEO SCRIPT (video_script field):
- Distinct from body, not a copy. Spoken pacing, about 60 to 90 seconds (at least 200 characters, ideally 150 to 220 words).
- Different opening hook from body. Same factual constraints. Same "if you" impact. Spoken CTA: watch it on Vortx, subscribe at vortxmkt.substack.com. End with the disclaimer.

OUTPUT FORMAT: respond with a single JSON object, no markdown fences, with exactly these keys:
{
  "headline": "layoff-event headline naming the employer and the scale or place",
  "dek": "one sharp sourced fact sentence under 180 characters",
  "body": "5 to 6 paragraphs separated by blank lines, 170 to 320 words total",
  "record_type": "echo the record_type field from the source",
  "video_script": "distinct spoken narration, different opening hook from body, conversational but sourced, at least 200 characters"
}`

export function buildCaseUserPrompt(sourceFields) {
  const recordType = String(sourceFields?.record_type || sourceFields?.event_type || '').toLowerCase()
  if (recordType === 'warn_notice') {
    const angles = warnImpactHints(sourceFields)
      .map((line) => `- ${line}`)
      .join('\n')
    return `SOURCE RECORD (the only facts you may use):\n${JSON.stringify(sourceFields, null, 2)}\n\nThis is a WARN layoff case. Write it like the layoff event, not like a form recap. warn_facts is the spine. Do not start the headline with WARN.\n\nALLOWED IMPACT ANGLES (rewrite these in the same voice; do not paste them):\n${angles}\n\nRequired close: watch the name on ${CASE_DRAFT_SITE_URL} and tell the reader to subscribe at ${CASE_DRAFT_SUBSTACK_URL}.\n\nHeadline under 12 words. First body sentence under 14 words. Body 170-320 words in short paragraphs. If-you impact, then CTA, then disclaimer. Flag [NEEDS SOURCE] or [LEGAL REVIEW] inline when required.\n\nWrite video_script as a separate spoken script with a different opening hook, not a copy of the body.`
  }
  return `SOURCE RECORD (the only facts you may use):\n${JSON.stringify(sourceFields, null, 2)}\n\nThis is an insider or Congress buy/sell case. Lead with who bought or sold, company/ticker, size if present, and date. Do not turn it into a fund or court story. Close with watch-the-name on ${CASE_DRAFT_SITE_URL} and subscribe at ${CASE_DRAFT_SUBSTACK_URL}.\n\nHeadline under 12 words. Body 170-320 words in short paragraphs. Action close, then disclaimer. Flag [NEEDS SOURCE] or [LEGAL REVIEW] inline when required.\n\nWrite video_script as a separate spoken script with a different opening hook, not a copy of the body.`
}

/**
 * True when a Form 4 / Congress row looks like a material buy or sell, not an empty disclosure shell.
 */
export function isEgregiousTradeCaseCandidate(event, opts = {}) {
  const type = String(event?.event_type || '')
  if (type !== 'form_4' && type !== 'congress_trade') return false

  const minSeverity = Number(opts.minSeverity ?? 78)
  const form4MinAmount = Number(opts.form4MinAmount ?? 100_000)
  const congressMinAmount = Number(opts.congressMinAmount ?? 50_000)
  const severity = Number(event?.severity) || 0
  const amount = Number(event?.amount) || 0
  const blob = `${event?.title || ''} ${event?.summary || ''}`
  const hasBuySell =
    /Transaction code:\s*[PS]\b/i.test(blob) ||
    /\b(purchase|sale|bought|sold)\b/i.test(blob) ||
    (type === 'congress_trade' && amount > 0)

  if (!hasBuySell) return false
  if (type === 'form_4') return severity >= minSeverity || amount >= form4MinAmount
  return severity >= minSeverity || amount >= congressMinAmount
}

export function isWarnCaseCandidate(event, opts = {}) {
  if (String(event?.event_type || '') !== 'warn_notice') return false
  const minSeverity = Number(opts.minSeverity ?? 65)
  return (Number(event?.severity) || 0) >= minSeverity
}

/**
 * Split uncovered events into WARN and egregious-trade queues with per-run quotas.
 * Prefills warnQuota + tradeQuota, then fills leftover slots with more WARN.
 * Leftover trade fill only runs when tradeQuota > 0 (layoff-first default is 0).
 */
export function selectCaseDraftCandidates(events, coveredEventIds, opts = {}) {
  const maxPerRun = Number(opts.maxPerRun ?? 5)
  const warnQuota = Math.min(maxPerRun, Number(opts.warnQuota ?? maxPerRun))
  const tradeQuota = Math.min(maxPerRun, Number(opts.tradeQuota ?? 0))
  const covered = coveredEventIds instanceof Set ? coveredEventIds : new Set(coveredEventIds || [])
  const tradeOpts = {
    minSeverity: opts.tradeMinSeverity,
    form4MinAmount: opts.form4MinAmount,
    congressMinAmount: opts.congressMinAmount,
  }
  const warnOpts = { minSeverity: opts.warnMinSeverity }

  const warnPool = []
  const tradePool = []
  for (const event of events || []) {
    if (!event?.id || covered.has(event.id)) continue
    if (isWarnCaseCandidate(event, warnOpts)) warnPool.push(event)
    else if (isEgregiousTradeCaseCandidate(event, tradeOpts)) tradePool.push(event)
  }

  const picked = []
  const take = (pool, n) => {
    for (const event of pool) {
      if (picked.length >= maxPerRun || n <= 0) break
      if (picked.some((row) => row.id === event.id)) continue
      picked.push(event)
      n -= 1
    }
  }
  take(warnPool, warnQuota)
  take(tradePool, tradeQuota)
  take(warnPool, maxPerRun - picked.length)
  if (tradeQuota > 0) take(tradePool, maxPerRun - picked.length)

  return {
    warnCandidates: picked.filter((event) => event.event_type === 'warn_notice'),
    tradeCandidates: picked.filter((event) => event.event_type !== 'warn_notice'),
    candidates: picked,
  }
}

/**
 * Events that already have a case story should not be regenerated, unless
 * CASE_DRAFT_REPLACE_PENDING is set and the only row is still pending_review.
 */
export function caseDraftCoverage(existingRows, { replacePending = false } = {}) {
  const coveredEventIds = new Set()
  const pendingByEvent = new Map()
  for (const row of existingRows || []) {
    if (!row?.event_id) continue
    if (row.status === 'pending_review' && row.id) pendingByEvent.set(row.event_id, row.id)
    if (row.status === 'published' || row.status === 'rejected') coveredEventIds.add(row.event_id)
    else if (row.status === 'pending_review' && !replacePending) coveredEventIds.add(row.event_id)
    else if (row.status && row.status !== 'pending_review') coveredEventIds.add(row.event_id)
  }
  return { coveredEventIds, pendingByEvent }
}

export function hasCaseDraftModel(env) {
  return Boolean(String(env.GOOGLE_AI_STUDIO_API_KEY || '').trim())
}

export async function callGemini(env, systemPrompt, userPrompt) {
  const key = String(env.GOOGLE_AI_STUDIO_API_KEY || '').trim()
  if (!key) throw new Error('missing_google_ai_studio_key')
  const model = String(env.CASE_DRAFT_MODEL || DEFAULT_MODEL).trim()

  const doRequest = async () => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.68,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            // Thinking tokens otherwise consume the output budget and truncate JSON.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    )
    const payload = await response.json().catch(() => ({}))
    return { response, payload }
  }

  let { response, payload } = await doRequest()
  if (response.status === 429 || response.status === 503) {
    const retryMatch = String(payload?.error?.message || '').match(/retry in (\d+(?:\.\d+)?)s/i)
    const waitMs = Math.min(90_000, retryMatch ? Math.ceil(Number(retryMatch[1]) * 1000) + 1500 : 30_000)
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    ;({ response, payload } = await doRequest())
  }
  if (!response.ok) {
    throw new Error(payload?.error?.message || `gemini_http_${response.status}`)
  }
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || ''
  if (!text.trim()) throw new Error('gemini_empty_response')
  return { text, model }
}

function parseDraftJson(text) {
  const cleaned = String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  return JSON.parse(cleaned)
}

/**
 * Generate one validated draft for a legal_events row.
 * Returns { ok, draft?, issues?, raw, model } and never publishes anything.
 */
export async function generateCaseDraft(env, { event, entity, source, evidenceUrl, rawPayload = null, relatedEvents = [] }) {
  const baseFields = buildCaseSourceFields(event, entity, source, evidenceUrl)
  const withRelated = mergeRelatedRecordContext(baseFields, relatedEvents)
  const sourceFields = await enrichCaseSourceFields(env, withRelated, { rawPayload })
  const { text, model } = await callGemini(
    env,
    CASE_DRAFT_SYSTEM_PROMPT,
    buildCaseUserPrompt(sourceFields),
  )

  let parsed
  try {
    parsed = parseDraftJson(text)
  } catch {
    return { ok: false, issues: ['model returned unparseable JSON'], raw: text, model, source_fields: sourceFields }
  }

  const result = validateCaseDraft(parsed, sourceFields)
  return {
    ok: result.ok,
    issues: result.issues,
    raw: text,
    model,
    source_fields: sourceFields,
    draft: result.ok
      ? {
          ...result.draft,
          slug: caseSlugFor(result.draft.headline, event.id),
          event_id: event.id,
          entity_id: event.entity_id || null,
          video_script: sanitizeCaseText(result.draft.video_script),
        }
      : null,
  }
}

async function findRelatedLegalEvents(env, event, supabaseRest) {
  // Focused case types (WARN / Form 4 / Congress) do not need bankruptcy docket fan-out.
  const type = String(event?.event_type || '')
  if (CASE_DRAFT_FOCUS_TYPES.includes(type)) {
    if (!event?.entity_id || !event?.filing_date) return []
    try {
      const rows = await supabaseRest(
        env,
        `legal_events?select=id,title,summary,event_type,filing_date&entity_id=eq.${encodeURIComponent(event.entity_id)}&event_type=eq.${encodeURIComponent(type)}&id=neq.${encodeURIComponent(event.id)}&filing_date=lte.${encodeURIComponent(event.filing_date)}&order=filing_date.desc&limit=3`,
      )
      return (rows || []).filter((row) => row?.title).slice(0, 3)
    } catch {
      return []
    }
  }

  const related = []
  const seen = new Set()
  const addRows = (rows) => {
    for (const row of rows || []) {
      if (!row?.title || row.id === event.id || seen.has(row.title)) continue
      seen.add(row.title)
      related.push(row)
    }
  }

  const blob = `${event?.title || ''} ${event?.summary || ''}`
  const numbers = [...new Set([...(blob.match(/\b\d{2}-\d{5,6}\b/g) || []), ...(blob.match(/\b\d:\d{2}-bk-\d+\b/gi) || [])])]

  if (numbers.length) {
    const filters = numbers
      .slice(0, 4)
      .map((num) => `title.ilike.*${encodeURIComponent(num)}*,summary.ilike.*${encodeURIComponent(num)}*`)
      .join(',')
    try {
      const rows = await supabaseRest(
        env,
        `legal_events?select=id,title,summary,event_type,filing_date&or=(${filters})&id=neq.${encodeURIComponent(event.id)}&limit=5`,
      )
      addRows(rows)
    } catch {}
  }

  return related.slice(0, 5)
}

/**
 * Scan recent WARN layoffs and egregious insider/Congress trades; create
 * pending_review drafts for any that do not already have a case story.
 * Controlled by env:
 *   CASE_DRAFTS_ENABLED  ("true" to run at all)
 *   CASE_DRAFT_WARN_MIN_SEVERITY  (default 65)
 *   CASE_DRAFT_TRADE_MIN_SEVERITY (default 78; also CASE_DRAFT_MIN_SEVERITY)
 *   CASE_DRAFT_FORM4_MIN_AMOUNT (default 100000)
 *   CASE_DRAFT_CONGRESS_MIN_AMOUNT (default 50000)
 *   CASE_DRAFT_MAX_PER_RUN   (default 5)
 *   CASE_DRAFT_WARN_MAX_PER_RUN (default 5, layoff-first)
 *   CASE_DRAFT_TRADE_MAX_PER_RUN (default 0)
 *   CASE_DRAFT_WARN_LOOKBACK_DAYS (default 120)
 *   CASE_DRAFT_TRADE_LOOKBACK_DAYS (default 30)
 *   CASE_DRAFT_REPLACE_PENDING ("true" to rewrite pending_review drafts)
 */
export async function runCaseDraftJob(env, supabaseRest, { dryRun = false, force = false } = {}) {
  if (
    !force &&
    String(env.CASE_DRAFTS_ENABLED || '').toLowerCase() !== 'true' &&
    !dryRun
  ) {
    return { ok: true, skipped: 'case_drafts_disabled' }
  }
  const warnMinSeverity = Number(env.CASE_DRAFT_WARN_MIN_SEVERITY || 65)
  const tradeMinSeverity = Number(env.CASE_DRAFT_TRADE_MIN_SEVERITY || env.CASE_DRAFT_MIN_SEVERITY || 78)
  const form4MinAmount = Number(env.CASE_DRAFT_FORM4_MIN_AMOUNT || 100_000)
  const congressMinAmount = Number(env.CASE_DRAFT_CONGRESS_MIN_AMOUNT || 50_000)
  const maxPerRun = Number(env.CASE_DRAFT_MAX_PER_RUN || 5)
  const warnQuota = Math.min(maxPerRun, Number(env.CASE_DRAFT_WARN_MAX_PER_RUN || maxPerRun))
  const tradeQuota = Math.min(maxPerRun, Number(env.CASE_DRAFT_TRADE_MAX_PER_RUN || 0))
  const warnLookbackDays = Number(env.CASE_DRAFT_WARN_LOOKBACK_DAYS || 120)
  const tradeLookbackDays = Number(env.CASE_DRAFT_TRADE_LOOKBACK_DAYS || 30)

  const warnCutoff = new Date()
  warnCutoff.setUTCDate(warnCutoff.getUTCDate() - warnLookbackDays)
  const tradeCutoff = new Date()
  tradeCutoff.setUTCDate(tradeCutoff.getUTCDate() - tradeLookbackDays)

  const warnCutoffStr = warnCutoff.toISOString().slice(0, 10)
  const tradeCutoffStr = tradeCutoff.toISOString().slice(0, 10)
  const eventSelect =
    'id,entity_id,source_id,raw_record_id,event_type,title,summary,jurisdiction,filing_date,amount,severity,confidence'
  const tradeFloor = Math.min(tradeMinSeverity, 70)

  const replacePending = String(env.CASE_DRAFT_REPLACE_PENDING || '').toLowerCase() === 'true'

  const [warnEvents, tradeEvents, existing] = await Promise.all([
    supabaseRest(
      env,
      `legal_events?select=${eventSelect}&event_type=eq.warn_notice&severity=gte.${warnMinSeverity}&filing_date=gte.${warnCutoffStr}&order=severity.desc,filing_date.desc&limit=25`,
    ),
    supabaseRest(
      env,
      `legal_events?select=${eventSelect}&event_type=in.(form_4,congress_trade)&severity=gte.${tradeFloor}&filing_date=gte.${tradeCutoffStr}&order=severity.desc,filing_date.desc&limit=40`,
    ),
    supabaseRest(env, 'case_stories?select=id,event_id,status&limit=2000'),
  ])

  const { coveredEventIds, pendingByEvent } = caseDraftCoverage(existing, { replacePending })
  const { warnCandidates, tradeCandidates, candidates } = selectCaseDraftCandidates(
    [...(warnEvents || []), ...(tradeEvents || [])],
    coveredEventIds,
    {
      maxPerRun,
      warnQuota,
      tradeQuota,
      warnMinSeverity,
      tradeMinSeverity,
      form4MinAmount,
      congressMinAmount,
    },
  )
  if (!candidates.length) {
    return {
      ok: true,
      generated: 0,
      results: [],
      warn_candidates: 0,
      trade_candidates: 0,
      focus: CASE_DRAFT_FOCUS_TYPES,
    }
  }

  const entityIds = [...new Set(candidates.map((event) => event.entity_id).filter(Boolean))]
  const sourceIds = [...new Set(candidates.map((event) => event.source_id).filter(Boolean))]
  const eventIds = candidates.map((event) => event.id)

  const rawRecordIds = [...new Set(candidates.map((event) => event.raw_record_id).filter(Boolean))]

  const [entities, sources, evidence, rawRecords] = await Promise.all([
    entityIds.length
      ? supabaseRest(env, `entities?select=id,canonical_name&id=in.(${entityIds.map(encodeURIComponent).join(',')})`)
      : [],
    sourceIds.length
      ? supabaseRest(env, `source_catalog?select=id,name,record_type,source_url&id=in.(${sourceIds.map(encodeURIComponent).join(',')})`)
      : [],
    supabaseRest(
      env,
      `event_evidence?select=event_id,source_url&event_id=in.(${eventIds.map(encodeURIComponent).join(',')})`,
    ).catch(() => []),
    rawRecordIds.length
      ? supabaseRest(
          env,
          `raw_records?select=id,payload&id=in.(${rawRecordIds.map(encodeURIComponent).join(',')})`,
        ).catch(() => [])
      : [],
  ])

  const entityById = new Map((entities || []).map((row) => [row.id, row]))
  const sourceById = new Map((sources || []).map((row) => [row.id, row]))
  const rawPayloadById = new Map((rawRecords || []).map((row) => [row.id, row.payload || null]))
  const evidenceByEvent = new Map()
  for (const row of evidence || []) {
    if (row.source_url && !evidenceByEvent.has(row.event_id)) evidenceByEvent.set(row.event_id, row.source_url)
  }

  const results = []
  for (const event of candidates) {
    try {
      const relatedEvents = await findRelatedLegalEvents(env, event, supabaseRest)
      const generation = await generateCaseDraft(env, {
        event,
        entity: entityById.get(event.entity_id),
        source: sourceById.get(event.source_id),
        evidenceUrl: evidenceByEvent.get(event.id) || null,
        rawPayload: rawPayloadById.get(event.raw_record_id) || null,
        relatedEvents,
      })
      if (!generation.ok) {
        results.push({ event_id: event.id, ok: false, issues: generation.issues })
        continue
      }
      if (dryRun) {
        results.push({ event_id: event.id, ok: true, dry_run: true, draft: generation.draft, raw: generation.raw })
        continue
      }
      const storyPayload = {
        slug: generation.draft.slug,
        status: 'pending_review',
        headline: generation.draft.headline,
        dek: generation.draft.dek,
        body: generation.draft.body,
        video_script: generation.draft.video_script,
        record_type: generation.draft.record_type,
        event_id: event.id,
        entity_id: event.entity_id || null,
        source_fields: generation.source_fields,
        model: generation.model,
        generation_notes: generation.issues || [],
      }
      const pendingId = pendingByEvent.get(event.id)
      if (pendingId) {
        await supabaseRest(env, `case_stories?id=eq.${encodeURIComponent(pendingId)}`, {
          method: 'PATCH',
          headers: { prefer: 'return=minimal' },
          body: JSON.stringify(storyPayload),
        })
        results.push({ event_id: event.id, ok: true, slug: generation.draft.slug, replaced: pendingId })
      } else {
        await supabaseRest(env, 'case_stories', {
          method: 'POST',
          headers: { prefer: 'return=minimal' },
          body: JSON.stringify([storyPayload]),
        })
        results.push({ event_id: event.id, ok: true, slug: generation.draft.slug })
      }
    } catch (error) {
      results.push({ event_id: event.id, ok: false, error: error.message })
    }
  }
  const generated = results.filter((r) => r.ok && !r.dry_run)
  if (generated.length && !dryRun) {
    await postReviewDigest(env, generated.length).catch(() => undefined)
  }
  return {
    ok: true,
    generated: generated.length,
    results,
    warn_candidates: warnCandidates.length,
    trade_candidates: tradeCandidates.length,
    focus: CASE_DRAFT_FOCUS_TYPES,
  }
}

/** Optional private digest: notifies reviewers that drafts are waiting. Never posts story content publicly. */
async function postReviewDigest(env, count) {
  const webhook = String(env.CASE_REVIEW_WEBHOOK_URL || '').trim()
  if (!webhook) return
  const siteUrl = String(env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
  await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      content: `${count} new case draft${count === 1 ? '' : 's'} waiting for review: ${siteUrl}/cases/drafts`,
      allowed_mentions: { parse: [] },
    }),
  })
}
