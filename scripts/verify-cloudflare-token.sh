#!/usr/bin/env bash
# Verify CLOUDFLARE_API_TOKEN without printing the token. Usage:
#   export CLOUDFLARE_API_TOKEN='...'
#   ./scripts/verify-cloudflare-token.sh
set -euo pipefail

# Allow either name (Wrangler docs sometimes use CF_API_TOKEN).
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" && -n "${CF_API_TOKEN:-}" ]]; then
  export CLOUDFLARE_API_TOKEN="$CF_API_TOKEN"
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "error: set CLOUDFLARE_API_TOKEN (or CF_API_TOKEN) first ; do not paste it in chat." >&2
  exit 1
fi

# Trim accidental leading/trailing whitespace (common copy-paste issue).
CF_TOKEN="$(printf '%s' "${CLOUDFLARE_API_TOKEN}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
if [[ -z "$CF_TOKEN" ]]; then
  echo "error: token is empty after trimming whitespace." >&2
  exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

code="$(curl -sS -o "$tmp" -w '%{http_code}' \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  "https://api.cloudflare.com/client/v4/user/tokens/verify")"
body="$(cat "$tmp" 2>/dev/null || true)"

hints_401() {
  echo "" >&2
  echo "Cloudflare returned Invalid API Token (401). Checklist:" >&2
  echo "  1. Use an API Token (Create Token), not the Global API Key ; Bearer auth is for API tokens only." >&2
  echo "  2. Copy the token string shown once at creation. If you closed that screen, create a new token." >&2
  echo "  3. export CLOUDFLARE_API_TOKEN='...' ; no extra quotes inside the value, no line breaks." >&2
  echo "  4. echo \"\${#CLOUDFLARE_API_TOKEN}\" ; typical API tokens are long (dozens of chars); length 0 means unset." >&2
  echo "  5. Try: unset CLOUDFLARE_API_TOKEN && export CLOUDFLARE_API_TOKEN='paste-again'" >&2
}

if [[ "$code" != "200" ]]; then
  echo "HTTP $code ; token rejected or network error." >&2
  echo "$body" | head -c 600 >&2
  echo "" >&2
  if [[ "$code" == "401" ]] || echo "$body" | grep -q '"code":1000'; then
    hints_401
  fi
  exit 1
fi

if command -v jq >/dev/null 2>&1; then
  echo "$body" | jq '{success: .success, status: .result.status, id: .result.id}'
else
  echo "$body" | head -c 400
  echo
fi

echo "ok: Cloudflare accepted this API token."
