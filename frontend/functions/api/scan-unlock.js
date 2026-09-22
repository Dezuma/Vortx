import { json, hasSupabase, supabaseRest } from '../lib/supabase-rest.js'
import { rateLimit, rateLimitResponse } from '../lib/rate-limit.js'
import { buildScanResults, fetchScanData, SCAN_WINDOW_DAYS } from '../lib/scan-core.js'
import { scanLeadMetadata, scanLeadUseCase } from '../lib/scan-lead.js'
import { sendScanUnlockEmail } from '../lib/transactional-email.js'
import { API_RESEARCH_DISCLAIMER } from '../lib/product-positioning.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ENTITIES = 50

export async function onRequestPost({ request, env }) {
  const retryAfter = rateLimit(request, { keyPrefix: 'scan-unlock', limit: 5 })
  if (retryAfter) return rateLimitResponse(retryAfter)

  if (!hasSupabase(env)) {
    return json({ ok: false, error: 'supabase_unconfigured' }, { status: 503 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (String(body.website || '').trim()) {
    return json({ ok: true, message: 'Results unlocked.' })
  }

  const email = String(body.email || '').trim().toLowerCase().slice(0, 254)
  const entityIds = [...new Set((body.entity_ids || []).map((id) => String(id || '').trim()).filter(Boolean))]

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid_email', message: 'A valid email is required.' }, { status: 400 })
  }
  if (!entityIds.length) {
    return json({ ok: false, error: 'missing_entity_ids', message: 'Provide entity_ids from your scan.' }, { status: 400 })
  }
  if (entityIds.length > MAX_ENTITIES) {
    return json({ ok: false, error: 'entity_limit_exceeded', message: `Maximum ${MAX_ENTITIES} entities per scan.` }, { status: 400 })
  }

  const scannedAt = new Date().toISOString()
  const mode = String(body.mode || 'holdings').trim()
  const leadUseCase = scanLeadUseCase(mode)

  try {
    await supabaseRest(env, 'sales_leads', {
      method: 'POST',
      body: JSON.stringify([
        {
          email,
          name: email.split('@')[0].slice(0, 120) || 'Scan subscriber',
          company: 'Not provided',
          use_case: leadUseCase,
          message: `Blind spot scan unlock for ${entityIds.length} entit${entityIds.length === 1 ? 'y' : 'ies'}.`,
          source: 'blind_spot_scan',
          status: 'new',
          metadata: scanLeadMetadata({ entityIds, mode, scannedAt }),
        },
      ]),
    })
  } catch {
    return json({ ok: false, error: 'persist_failed', message: 'Could not save your email. Try again shortly.' }, { status: 500 })
  }

  const origin = new URL(request.url).origin
  const emailResult = await sendScanUnlockEmail(env, { email, entityIds, siteUrl: origin }).catch(() => ({
    sent: false,
    reason: 'send_failed',
  }))

  try {
    const data = await fetchScanData(env, supabaseRest, entityIds)
    const entities = buildScanResults(data, { unlockLevel: 'full' })

    return json({
      ok: true,
      unlocked: true,
      window_days: SCAN_WINDOW_DAYS,
      unlock_level: 'full',
      entities,
      email_notice: "We'll email you your scan results. Unsubscribe anytime.",
      email_sent: Boolean(emailResult?.sent),
      disclaimer: API_RESEARCH_DISCLAIMER,
    })
  } catch {
    return json({ ok: false, error: 'scan_failed', message: 'Email saved but results could not be loaded. Try again shortly.' }, { status: 500 })
  }
}

export function onRequestGet() {
  return json({ ok: true, message: 'POST JSON { email, entity_ids } to unlock full scan results.' })
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context)
  return onRequestGet(context)
}
