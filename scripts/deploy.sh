#!/usr/bin/env bash
# Deploy Worker + static assets to Cloudflare (same project as vortxmkt.com routes in wrangler.jsonc).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "note: CLOUDFLARE_API_TOKEN unset ; trying deploy anyway (works after ./vortx login on this machine)." >&2
  echo "      Or: export CLOUDFLARE_API_TOKEN=...  https://developers.cloudflare.com/fundamentals/api/get-started/create-token/" >&2
fi

# Optional: same account id as shown in Cloudflare dashboard URL (avoids some wrangler prompts).
if [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  export CLOUDFLARE_ACCOUNT_ID
fi

# Vite reads frontend/.env.local during wrangler's build step so VITE_* embeds into dist.
if [[ ! -f "$ROOT/frontend/.env.local" ]]; then
  echo "warn: frontend/.env.local missing; Vite build may omit Supabase public keys." >&2
fi

npx wrangler deploy "$@"

if [[ "${DEPLOY_SKIP_OPS_CHECK:-}" == "1" ]]; then
  echo "Skipping post-deploy ops check (DEPLOY_SKIP_OPS_CHECK=1)." >&2
  exit 0
fi

echo "Running post-deploy ops check..."
node scripts/ops-check.mjs
