function has(value) {
  return Boolean(String(value || '').trim())
}

export function onRequestGet({ env }) {
  return new Response(
    JSON.stringify(
      {
        ok: true,
        services: {
          supabaseUrl: has(env.VITE_SUPABASE_URL),
          supabasePublishableKey: has(env.VITE_SUPABASE_PUBLISHABLE_KEY) || has(env.VITE_SUPABASE_ANON_KEY),
          botAdminToken: has(env.BOT_ADMIN_TOKEN),
          publicSiteUrl: has(env.PUBLIC_SITE_URL),
        },
        note: 'Stripe Checkout uses server-side Workers env. Verify checkout from /pricing after STRIPE_SECRET_KEY is set.',
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
