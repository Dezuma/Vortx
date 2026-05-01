function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type, x-bot-token',
      ...(init.headers || {}),
    },
  })
}

function getBearer(request) {
  const auth = request.headers.get('authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  return request.headers.get('x-bot-token') || ''
}

function asProbability(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.max(1, Math.min(99, Math.round(n)))
}

function buildPost({ event, probability, market, origin, sources }) {
  const marketPath = market ? `/m/${encodeURIComponent(market)}` : '/markets'
  const sourceText = sources?.length ? `\nSources: ${sources.join(', ')}` : ''
  return [
    `${probability}% probability: ${event}`,
    `Probability from Vortx — trade this outcome: ${origin}${marketPath}`,
    sourceText,
  ]
    .filter(Boolean)
    .join('\n')
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return json({ ok: true })
  if (!['GET', 'POST'].includes(request.method)) {
    return json({ ok: false, error: 'method_not_allowed' }, { status: 405 })
  }

  const adminToken = env.BOT_ADMIN_TOKEN
  if (adminToken && getBearer(request) !== adminToken) {
    return json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  let body = {}
  if (request.method === 'POST') {
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }
  }

  const event = String(body.event || url.searchParams.get('event') || '').trim()
  const probability = asProbability(body.probability || url.searchParams.get('probability'))
  const market = String(body.market || url.searchParams.get('market') || '').trim()
  const dryRun = String(body.dryRun || url.searchParams.get('dryRun') || '1') !== '0'
  const sourcesRaw = body.sources || url.searchParams.get('sources') || ''
  const sources = Array.isArray(sourcesRaw)
    ? sourcesRaw.map(String).filter(Boolean)
    : String(sourcesRaw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

  if (!event || probability == null) {
    return json(
      {
        ok: false,
        error: 'missing_fields',
        required: ['event', 'probability'],
        example: '/api/oracle-bot?event=Fed%20cuts%20before%20Oct%201&probability=42&market=fed-cut-q3&dryRun=1',
      },
      { status: 400 },
    )
  }

  const origin = env.PUBLIC_SITE_URL || url.origin
  const post = buildPost({ event, probability, market, origin, sources })

  if (!dryRun) {
    return json(
      {
        ok: false,
        error: 'posting_adapter_not_configured',
        message: 'Dry-run works. Add a specific X/Farcaster adapter before live posting.',
        post,
      },
      { status: 501 },
    )
  }

  return json({
    ok: true,
    mode: 'dry_run',
    protected: Boolean(adminToken),
    post,
    next: 'Set dryRun=0 only after adding a social posting adapter and credentials in Cloudflare secrets.',
  })
}
