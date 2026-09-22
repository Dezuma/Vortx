# Supabase Edge Functions (optional)

Use **`supabase/functions/_shared/env.ts`** for **`Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`**-style access.

Set secrets (never commit):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY --project-ref <ref>
```

Project URL defaults to **`SUPABASE_URL`** in Edge; `getSupabaseUrl()` also accepts **`VITE_SUPABASE_URL`** if you mirror Worker naming.

The main Vortx API runs on **Cloudflare Workers** (`worker/index.js`) using the same variable names in **`vortx/.dev.vars`** (local) or Cloudflare env.
