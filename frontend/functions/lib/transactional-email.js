const SCAN_RESULTS_FROM = 'Vortx Scan <scan@vortxmkt.com>'
const SUBSCRIPTION_FROM = 'Vortx <billing@vortxmkt.com>'

function scanResultsHtml({ entityCount, siteUrl }) {
  const safeCount = Number(entityCount) || 0
  return `<!doctype html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#020617;color:#f8fafc;padding:24px">
  <p style="color:#7dd3fc;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">Company scan</p>
  <h1 style="font-size:24px;margin:12px 0">Your scan results are ready</h1>
  <p style="color:#cbd5e1;line-height:1.6">We saved your public-record scan for ${safeCount} compan${safeCount === 1 ? 'y' : 'ies'}. These are public filings, not judgments.</p>
  <p style="margin-top:20px"><a href="${siteUrl}/scan" style="background:#38bdf8;color:#020617;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700">View scan again</a></p>
  <p style="margin-top:24px;color:#94a3b8;font-size:12px;line-height:1.6">Research and business intelligence only. Not legal, financial, credit, trading, or investment advice.<br/>Reply to unsubscribe from scan follow-ups.</p>
</body></html>`
}

export async function sendScanUnlockEmail(env, { email, entityIds, siteUrl }) {
  const apiKey = String(env.RESEND_API_KEY || '').trim()
  if (!apiKey || !email) {
    return { sent: false, reason: 'email_unconfigured' }
  }

  const origin = String(siteUrl || env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: String(env.SCAN_EMAIL_FROM || SCAN_RESULTS_FROM),
      to: [email],
      subject: 'Your Vortx company scan results',
      html: scanResultsHtml({ entityCount: entityIds?.length || 0, siteUrl: origin }),
    }),
  })

  if (!response.ok) {
    return { sent: false, reason: 'provider_error', status: response.status }
  }

  return { sent: true }
}

function subscriptionWelcomeHtml({ plan, siteUrl }) {
  const safePlan = String(plan || 'nebula').trim()
  const origin = String(siteUrl || 'https://vortxmkt.com').replace(/\/$/, '')
  return `<!doctype html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#020617;color:#f8fafc;padding:24px">
  <p style="color:#7dd3fc;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">Vortx subscription</p>
  <h1 style="font-size:24px;margin:12px 0">Your ${safePlan} plan is active</h1>
  <p style="color:#cbd5e1;line-height:1.6">Payment succeeded. Sign in with this same email, open Today's Trades to see the names, then watch one lawmaker or insider. We email you when they file again.</p>
  <p style="margin-top:20px"><a href="${origin}/?view=customer&amp;onboard=watch" style="background:#38bdf8;color:#020617;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700">Open desk · watch someone</a></p>
  <p style="margin-top:16px"><a href="${origin}/signup" style="color:#93c5fd">Create your password</a> if you have not signed up yet.</p>
  <p style="margin-top:24px;color:#94a3b8;font-size:12px;line-height:1.6">Stripe receipt is sent separately. Research only. Not investment advice.</p>
</body></html>`
}

export async function sendSubscriptionWelcomeEmail(env, { email, plan, siteUrl }) {
  const apiKey = String(env.RESEND_API_KEY || '').trim()
  if (!apiKey || !email) {
    return { sent: false, reason: 'email_unconfigured' }
  }

  const origin = String(siteUrl || env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: String(env.SUBSCRIPTION_EMAIL_FROM || env.SCAN_EMAIL_FROM || SUBSCRIPTION_FROM),
      to: [email],
      subject: 'Your Vortx subscription is active',
      html: subscriptionWelcomeHtml({ plan, siteUrl: origin }),
    }),
  })

  if (!response.ok) {
    return { sent: false, reason: 'provider_error', status: response.status }
  }

  return { sent: true }
}

function tradeAlertWaitlistHtml({ siteUrl }) {
  const origin = String(siteUrl || 'https://vortxmkt.com').replace(/\/$/, '')
  return `<!doctype html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#020617;color:#f8fafc;padding:24px">
  <p style="color:#7dd3fc;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">Vortx trade alerts</p>
  <h1 style="font-size:24px;margin:12px 0">You are on the waitlist</h1>
  <p style="color:#cbd5e1;line-height:1.6">We saved your email for free broadcast digests. Paid plans already email you when a name you Watch files again. This waitlist is only for free Congress digests when those launch.</p>
  <p style="margin-top:20px"><a href="${origin}/?view=overview" style="background:#38bdf8;color:#020617;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700">See today's trades</a></p>
  <p style="margin-top:16px"><a href="${origin}/?view=pricing&amp;plan=nebula" style="color:#93c5fd">See the names on Nebula</a></p>
  <p style="margin-top:24px;color:#94a3b8;font-size:12px;line-height:1.6">Research only. Not investment advice. Reply to opt out of waitlist updates.</p>
</body></html>`
}

export async function sendTradeAlertWaitlistEmail(env, { email, siteUrl }) {
  const apiKey = String(env.RESEND_API_KEY || '').trim()
  if (!apiKey || !email) {
    return { sent: false, reason: 'email_unconfigured' }
  }

  const origin = String(siteUrl || env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: String(env.SCAN_EMAIL_FROM || SCAN_RESULTS_FROM),
      to: [email],
      subject: 'You are on the Vortx trade alert waitlist',
      html: tradeAlertWaitlistHtml({ siteUrl: origin }),
    }),
  })

  if (!response.ok) {
    return { sent: false, reason: 'provider_error', status: response.status }
  }

  return { sent: true }
}

const ALERTS_FROM = 'Vortx Alerts <alerts@vortxmkt.com>'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function watchlistTradeAlertHtml({ headline, body, kind, filingDate, siteUrl }) {
  const origin = String(siteUrl || 'https://vortxmkt.com').replace(/\/$/, '')
  const meta = [kind, filingDate ? `filed ${filingDate}` : null].filter(Boolean).join(' · ')
  return `<!doctype html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;color:#0f172a;padding:24px">
  <p style="color:#0284c7;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">Vortx watch alert</p>
  <h1 style="font-size:22px;margin:12px 0;line-height:1.3">${escapeHtml(headline)}</h1>
  <p style="color:#334155;line-height:1.6;margin:0">${escapeHtml(body)}</p>
  ${meta ? `<p style="color:#64748b;font-size:13px;margin-top:14px">${escapeHtml(meta)}</p>` : ''}
  <p style="margin-top:22px"><a href="${origin}/?view=customer" style="background:#0284c7;color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700">Open My Desk</a></p>
  <p style="margin-top:24px;color:#94a3b8;font-size:12px;line-height:1.6">You get this because you tapped Watch on this name. Research only. Not investment advice. Reply to opt out of watch alerts.</p>
</body></html>`
}

export async function sendWatchlistTradeAlertEmail(
  env,
  { email, subject, headline, body, kind, filingDate, siteUrl },
) {
  const apiKey = String(env.RESEND_API_KEY || '').trim()
  if (!apiKey || !email) {
    return { sent: false, reason: 'email_unconfigured' }
  }

  const origin = String(siteUrl || env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: String(env.ALERTS_EMAIL_FROM || env.SCAN_EMAIL_FROM || ALERTS_FROM),
      to: [email],
      subject: String(subject || 'Vortx watch alert').slice(0, 180),
      html: watchlistTradeAlertHtml({
        headline: headline || 'A watched name filed again',
        body: body || 'Open My Desk to review the filing.',
        kind,
        filingDate,
        siteUrl: origin,
      }),
    }),
  })

  if (!response.ok) {
    return { sent: false, reason: 'provider_error', status: response.status }
  }

  return { sent: true }
}

export async function sendWatchedWeeklyDigestEmail(
  env,
  { email, subject, headline, rows = [], siteUrl },
) {
  const apiKey = String(env.RESEND_API_KEY || '').trim()
  if (!apiKey || !email) {
    return { sent: false, reason: 'email_unconfigured' }
  }

  const origin = String(siteUrl || env.PUBLIC_SITE_URL || 'https://vortxmkt.com').replace(/\/$/, '')
  const list = (rows || [])
    .slice(0, 12)
    .map((row) => {
      const early = row.early ? ' · You were early' : ''
      return `<li style="margin:0 0 10px;color:#e2e8f0;line-height:1.5"><strong>${escapeHtml(row.name || 'Watched name')}</strong> · ${escapeHtml(row.kind || 'Filing')}${early}<br/><span style="color:#94a3b8;font-size:13px">${escapeHtml(row.detail || '')}</span></li>`
    })
    .join('')

  const html = `<!doctype html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#020617;color:#f8fafc;padding:24px">
  <p style="color:#7dd3fc;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">Weekly watched digest</p>
  <h1 style="font-size:22px;margin:12px 0">${escapeHtml(headline || 'New filings on names you watch')}</h1>
  <ul style="padding-left:18px;margin:16px 0">${list || '<li style="color:#94a3b8">No new watched filings this week.</li>'}</ul>
  <p style="margin-top:22px"><a href="${origin}/?view=customer" style="background:#0284c7;color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700">Open My Desk</a></p>
  <p style="margin-top:24px;color:#94a3b8;font-size:12px;line-height:1.6">Research only. Not investment advice. You get this because you Watch names on Vortx.</p>
</body></html>`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: String(env.ALERTS_EMAIL_FROM || env.SCAN_EMAIL_FROM || ALERTS_FROM),
      to: [email],
      subject: String(subject || 'Vortx weekly watched digest').slice(0, 180),
      html,
    }),
  })

  if (!response.ok) {
    return { sent: false, reason: 'provider_error', status: response.status }
  }
  return { sent: true }
}
