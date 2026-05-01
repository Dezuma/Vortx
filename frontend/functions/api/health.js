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
        note: 'Stripe Payment Links are compile-time VITE_* values on the static frontend; verify in /pricing.',
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
