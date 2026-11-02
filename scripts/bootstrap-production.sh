#!/usr/bin/env bash
# Prepares an empty production database: built-in roles/permissions/plans and
# one platform-admin login. Prompts for the admin email and password (hidden).
# Usage on the VPS: bash /opt/queueflow/scripts/bootstrap-production.sh
set -euo pipefail
cd "$(dirname "$0")/../backend"

read -rp "Platform admin email: " BOOTSTRAP_ADMIN_EMAIL
read -rsp "Password (min 12 chars, hidden): " BOOTSTRAP_ADMIN_PASSWORD; echo
read -rsp "Repeat password: " again; echo
if [ "$BOOTSTRAP_ADMIN_PASSWORD" != "$again" ]; then
  unset BOOTSTRAP_ADMIN_PASSWORD again
  echo "Passwords do not match. Nothing was changed."
  exit 1
fi
unset again
export BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_PASSWORD

npx dotenv -c production -- npx ts-node --transpile-only prisma/bootstrap-production.ts
unset BOOTSTRAP_ADMIN_PASSWORD
