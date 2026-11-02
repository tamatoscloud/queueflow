#!/usr/bin/env bash
# Publishes apps/landing_web (static site for quyk.io) to the VPS static server.
# Usage on the VPS: bash /opt/queueflow/scripts/deploy-landing.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST=/srv/quyk/landing
VER="$(git -C "$ROOT" rev-parse --short=10 HEAD)"
rm -rf "$DEST.new"
cp -r "$ROOT/apps/landing_web" "$DEST.new"
rm -f "$DEST.new/README.md"
sed -i "s/__V__/$VER/g" "$DEST.new/index.html"
chmod -R a+rX "$DEST.new"
rm -rf "$DEST.old"; [ -d "$DEST" ] && mv "$DEST" "$DEST.old"
mv "$DEST.new" "$DEST"
echo "Landing $VER published to $DEST (previous version kept in $DEST.old)"
