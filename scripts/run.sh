#!/usr/bin/env bash
# Usage: scripts/run.sh <customer_app|business_app|admin_panel|marketing_website> <dev|staging|production> [-- <extra flutter run args>]
set -euo pipefail

APP="${1:-}"
FLAVOR="${2:-}"
shift 2 || true

if [[ -z "$APP" || -z "$FLAVOR" ]]; then
  echo "Usage: scripts/run.sh <app> <dev|staging|production> [-- <extra flutter run args>]"
  echo "  apps: customer_app, business_app, admin_panel, marketing_website"
  exit 1
fi

case "$FLAVOR" in
  dev|staging|production) ;;
  *) echo "Flavor must be one of: dev, staging, production" >&2; exit 1 ;;
esac

APP_DIR="apps/$APP"
if [[ ! -d "$APP_DIR" ]]; then
  echo "Unknown app: $APP (expected a directory at $APP_DIR)" >&2
  exit 1
fi

cd "$APP_DIR"

if [[ -d android || -d ios ]]; then
  # Mobile apps: native flavor selects the matching build config
  # (see android/app/build.gradle.kts and ios/Flutter/*-<flavor>.xcconfig).
  flutter run --flavor "$FLAVOR" -t "lib/main_$FLAVOR.dart" "$@"
else
  # Web-only apps have no native flavor concept — the entrypoint alone
  # selects which .env.* file is loaded.
  flutter run -t "lib/main_$FLAVOR.dart" "$@"
fi
