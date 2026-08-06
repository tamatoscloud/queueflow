#!/usr/bin/env bash
# One-time (and after-pulling-changes) workspace setup.
set -euo pipefail

if ! command -v melos &> /dev/null; then
  echo "Melos not found — activating globally via dart pub..."
  dart pub global activate melos
fi

melos bootstrap
melos run gen

echo ""
echo "Workspace ready. See docs/SETUP.md for how to run each app."
