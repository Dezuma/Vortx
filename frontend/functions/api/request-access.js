import { hasSupabase, json, supabaseRest } from '../lib/supabase-rest.js'
import { rateLimit, rateLimitResponse } from '../lib/rate-limit.js'
import { sendTradeAlertWaitlistEmail } from '../lib/transactional-email.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USE_CASES = new Set([
  'investors',
  'smb',
  'journalism',
  'real_estate',
  'legal_ops',
  'hr_workforce',
  'credit',
  'litigation',
  'collections',
  'competitive',
  'other',
])

function normalizeUseCase(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (USE_CASES.has(normalized)) return normalized
  if (normalized.includes('investor') || normalized.includes('trader') || normalized.includes('stock'))
    return 'investors'
  if (normalized.includes('journal') || normalized.includes('press') || normalized.includes('media'))
    return 'journalism'
  if (normalized.includes('real_estate') || normalized.includes('realtor') || normalized.includes('title'))
    return 'real_estate'
  if (normalized.includes('paralegal') || normalized.includes('legal_ops') || normalized.includes('cloc'))
    return 'legal_ops'
  if (normalized.includes('hr') || normalized.includes('workforce') || normalized.includes('shrm'))
    return 'hr_workforce'
  if (normalized.includes('smb') || normalized.includes('small_business') || normalized.includes('vendor'))
    return 'smb'
  if (normalized.includes('litigation')) return 'litigation'
  if (normalized.includes('credit')) return 'credit'
  if (normalized.includes('collection')) return 'collections'
  if (normalized.includes('competitive')) return 'competitive'
  return 'other'
}

function isAlertIntent(body) {
  const intent = String(body.intent || body.source || '')
    .trim()
    .toLowerCase()
  return intent === 'congress_alerts' || intent === 'trade_alerts'
}

export async function onRequestPost({ request, env }) {
  if (!hasSupabase(env)) {
    return json({ ok: false, error: 'supabase_unconfigured' }, { status: 503 })
  }

  let body
  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      body = Object.fromEntries(form.entries())
    } else {
      body = await request.json()
    }
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  // Honeypot — bots fill hidden "website"
  if (String(body.website || '').trim()) {
    return json({ ok: true, message: 'Request received.' })
  }

  const alertSignup = isAlertIntent(body)
  const retryAfter = rateLimit(request, {
    keyPrefix: alertSignup ? 'congress-alerts' : 'request-access',
    limit: alertSignup ? 8 : 20,
  })
  if (retryAfter) return rateLimitResponse(retryAfter)

  const email = String(body.email || '').trim().toLowerCase().slice(0, 254)
  let name = String(body.name || '').trim().slice(0, 120)
  const company = String(body.company || '').trim().slice(0, 160)
  const useCase = String(body.use_case || body.useCase || '').trim().slice(0, 120)
  let message = String(body.message || '').trim().slice(0, 4000)

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid_email', message: 'A valid email is required.' }, { status: 400 })
  }

  if (alertSignup) {
    name = name || 'Trade alerts'
    message =
      message ||
      'Alert me when Congress, insider, or fund trades hit the public record.'
  } else if (!name || !message) {
    return json({ ok: false, error: 'missing_fields', message: 'Name and message are required.' }, { status: 400 })
  }

  try {
    await supabaseRest(env, 'sales_leads', {
      method: 'POST',
      body: JSON.stringify([
        {
          email,
          name,
          company: company || (alertSignup ? 'Trade alerts' : 'Not provided'),
          use_case: normalizeUseCase(useCase || (alertSignup ? 'investors' : 'other')),
          message,
          source: alertSignup ? 'congress_alerts' : 'website',
          status: 'new',
          metadata: {
            path: new URL(request.url).pathname,
            intent: alertSignup ? 'congress_alerts' : 'request_access',
          },
        },
      ]),
    })
  } catch (error) {
    return json({ ok: false, error: 'persist_failed', message: 'Could not save your request. Try again shortly.' }, { status: 500 })
  }

  let emailSent = false
  if (alertSignup) {
    try {
      const mail = await sendTradeAlertWaitlistEmail(env, {
        email,
        siteUrl: new URL(request.url).origin,
      })
      emailSent = Boolean(mail?.sent)
    } catch {
      emailSent = false
    }
  }

  const acceptsHtml = (request.headers.get('accept') || '').includes('text/html')
  if (acceptsHtml) {
    return Response.redirect(`${new URL(request.url).origin}/?lead=queued#lead-capture`, 303)
  }

  return json({
    ok: true,
    email_sent: emailSent,
    message: alertSignup
      ? emailSent
        ? 'Waitlist confirmed. Check your inbox for the confirmation email.'
        : 'You are on the waitlist. We will email when live trade alerts launch.'
      : 'Request queued. We will review fit and source coverage before opening a sales conversation.',
  })
}

export function onRequestGet() {
  return json({ ok: true, message: 'POST JSON to request access.' })
}

/** Cloudflare Pages-style router (POST form or JSON). */
export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context)
  return onRequestGet(context)
}
