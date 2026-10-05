#!/usr/bin/env bash
# Commit with the Vercel-allowed Hobby team owner author (no git config change).
# Usage: ./scripts/commit-as-deploy.sh "fix: whatever" [paths to git add...]
set -euo pipefail
cd "$(dirname "$0")/.."
msg="${1:?usage: commit-as-deploy.sh \"message\" [paths...]}"
shift || true
if [[ $# -gt 0 ]]; then
  git add -- "$@"
fi
git -c user.name='tamatoscloud' -c user.email='tamatos.cloud@gmail.com' commit -m "$msg"
git log -1 --format='Committed as %an <%ae>%n%h %s'
