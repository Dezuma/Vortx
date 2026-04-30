#!/usr/bin/env bash
# Run once after clone: points this repo at .githooks (blocks Cursor attribution trailers).
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
chmod +x .githooks/commit-msg 2>/dev/null || true
git config core.hooksPath .githooks
echo "core.hooksPath set to .githooks (commit-msg guard active)."
