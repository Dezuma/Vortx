import { getSupabaseUrl, hasSupabaseServiceRoleKey } from '../lib/worker-env.js'

function has(value) {
  return Boolean(String(value || '').trim())
}

function validHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim())
    return url.protocol === 'https:' || url.hostname === 'localhost'
  } catch {
    return false
  }
}

export function onRequestGet({ env }) {
  const supabaseUrl = getSupabaseUrl(env)
  const publicSiteUrl = String(env.PUBLIC_SITE_URL || '').trim()

  return new Response(
    JSON.stringify(
      {
        ok: true,
        services: {
          supabaseUrl: has(supabaseUrl),
          supabaseUrlValid: has(supabaseUrl) && validHttpUrl(supabaseUrl),
          supabasePublishableKey: has(env.VITE_SUPABASE_PUBLISHABLE_KEY) || has(env.VITE_SUPABASE_ANON_KEY),
          supabaseServiceRoleKey: hasSupabaseServiceRoleKey(env),
          stripeSecretKey: has(env.STRIPE_SECRET_KEY),
          publicSiteUrl: has(publicSiteUrl),
          publicSiteUrlValid: has(publicSiteUrl) && validHttpUrl(publicSiteUrl),
        },
        note: 'Stripe Checkout uses server-side Workers env. Verify checkout after STRIPE_SECRET_KEY is set.',
      },
      null,
      2,
    ),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    },
  )
}
