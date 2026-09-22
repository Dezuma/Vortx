#!/usr/bin/env bash
# Pull VITE_SUPABASE_* from frontend/.env.local into .dev.vars so Wrangler matches Vite.
# Preserves existing SUPABASE_SERVICE_ROLE_KEY and moderator tokens in .dev.vars when present.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/frontend/.env.local"
DST="$ROOT/.dev.vars"

if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC ; create it from frontend/.env.example" >&2
  exit 1
fi

get_kv() {
  local key="$1"
  grep -E "^${key}=" "$SRC" 2>/dev/null | head -1 | cut -d= -f2- || true
}

URL="$(get_kv VITE_SUPABASE_URL)"
PUB="$(get_kv VITE_SUPABASE_PUBLISHABLE_KEY)"

if [[ -z "$URL" || -z "$PUB" ]]; then
  echo "frontend/.env.local must define VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY" >&2
  exit 1
fi

SR=""
GH=""
BT=""
if [[ -f "$DST" ]]; then
  SR="$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$DST" 2>/dev/null | cut -d= -f2- || true)"
  GH="$(grep -E '^GHOST_MODERATE_TOKEN=' "$DST" 2>/dev/null | cut -d= -f2- || true)"
  BT="$(grep -E '^BOT_ADMIN_TOKEN=' "$DST" 2>/dev/null | cut -d= -f2- || true)"
fi

if [[ -z "${GH:-}" ]]; then GH="$(openssl rand -hex 32)"; fi
if [[ -z "${BT:-}" ]]; then BT="$(openssl rand -hex 32)"; fi

umask 077
cat >"$DST" <<EOF
# Synced from frontend/.env.local + generated tokens. Gitignored.
# Paste SUPABASE_SERVICE_ROLE_KEY from Supabase → Settings → API → service_role (never commit).

VITE_SUPABASE_URL=${URL}
VITE_SUPABASE_PUBLISHABLE_KEY=${PUB}

SUPABASE_SERVICE_ROLE_KEY=${SR}

GHOST_MODERATE_TOKEN=${GH}
BOT_ADMIN_TOKEN=${BT}
EOF

echo "Updated $DST (Supabase URL + publishable from .env.local). Service role preserved if it was set."
