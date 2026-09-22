import { json } from '../lib/supabase-rest.js'
import {
  isPortraitType,
  resolveFilerPortrait,
  safePublicImageUrl,
} from '../lib/filer-portrait.js'

export async function onRequestGet({ request }) {
  const url = new URL(request.url)
  const type = String(url.searchParams.get('type') || '')
  const locked = url.searchParams.get('locked') === '1'
  const name = locked ? '' : String(url.searchParams.get('name') || '')
  let issuer = String(url.searchParams.get('issuer') || '')
  let ticker = String(url.searchParams.get('ticker') || '')
  if (!isPortraitType(type) && type !== 'congress_trade') {
    return json({ ok: false, error: 'invalid_type' }, { status: 400 })
  }
  if (locked && type !== 'form_4') {
    issuer = ''
    ticker = ''
  }
  if (type === 'congress_trade') {
    return json({ ok: false }, { headers: { 'cache-control': 'public, max-age=300' } })
  }
  const result = await resolveFilerPortrait({ type, name, issuer, ticker })
  const src = result ? safePublicImageUrl(result.src) : ''
  return json(src ? { ok: true, src, kind: result.kind } : { ok: false }, {
    headers: { 'cache-control': 'public, max-age=86400' },
  })
}
