import { onRequestGet as health } from '../frontend/functions/api/health.js'
import { onRequest as oracleBot } from '../frontend/functions/api/oracle-bot.js'
import {
  onRequestGet as stripeCheckoutGet,
  onRequestPost as stripeCheckoutPost,
} from '../frontend/functions/api/stripe-checkout.js'

function notFound() {
  return new Response(JSON.stringify({ ok: false, error: 'not_found' }, null, 2), {
    status: 404,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

async function handleApi(request, env, ctx) {
  const url = new URL(request.url)
  const context = { request, env, ctx }

  if (url.pathname === '/api/health' && request.method === 'GET') {
    return health(context)
  }

  if (url.pathname === '/api/oracle-bot') {
    return oracleBot(context)
  }

  if (url.pathname === '/api/stripe-checkout') {
    if (request.method === 'POST') return stripeCheckoutPost(context)
    if (request.method === 'GET') return stripeCheckoutGet(context)
  }

  return notFound()
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, ctx)
    }

    return env.ASSETS.fetch(request)
  },
}
