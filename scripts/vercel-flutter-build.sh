#!/usr/bin/env bash
# Builds a Flutter web app inside Vercel's own build step, so pushes to main
# deploy without a CLI token. Run from the app directory (the Vercel project's
# Root Directory), e.g. apps/staff_app:
#   bash ../../scripts/vercel-flutter-build.sh install
#   bash ../../scripts/vercel-flutter-build.sh build
set -euo pipefail

FLUTTER_VERSION="${FLUTTER_VERSION:-3.38.5}"
APP_DIR="$(pwd)"
REPO_ROOT="$(cd ../.. && pwd)"
APP_NAME="$(basename "$APP_DIR")"
FLUTTER_HOME="${FLUTTER_HOME:-$REPO_ROOT/.flutter-sdk}"
export PATH="$FLUTTER_HOME/bin:$FLUTTER_HOME/bin/cache/dart-sdk/bin:$HOME/.pub-cache/bin:$PATH"
export CI=true FLUTTER_SUPPRESS_ANALYTICS=true PUB_ENVIRONMENT=vercel

install() {
  if ! command -v unzip >/dev/null 2>&1; then
    (dnf install -y unzip || yum install -y unzip) >/dev/null
  fi
  if [ ! -x "$FLUTTER_HOME/bin/flutter" ]; then
    git clone --depth 1 --branch "$FLUTTER_VERSION" https://github.com/flutter/flutter.git "$FLUTTER_HOME"
  fi
  flutter --version
  flutter config --no-analytics --enable-web >/dev/null
  dart pub global activate melos
  (cd "$REPO_ROOT" && melos bootstrap)
}

build() {
  cd "$REPO_ROOT"
  melos exec -c 1 --scope="queueflow_core" --scope="queueflow_models" --scope="queueflow_network" -- \
    "dart run build_runner build --delete-conflicting-outputs"

  cd "$APP_DIR"
  if [ -f lib/features/auth/data/models/auth_user.dart ]; then
    dart run build_runner build --delete-conflicting-outputs \
      --build-filter="package:$APP_NAME/features/auth/data/models/auth_user.dart" \
      --build-filter="package:$APP_NAME/features/auth/data/models/auth_user.freezed.dart" \
      --build-filter="package:$APP_NAME/features/auth/data/models/auth_user.g.dart"
  fi

  for env in dev staging; do
    [ -f ".env.$env" ] || cp ".env.$env.example" ".env.$env"
  done
  cp .env.production.example .env.production
  # Production values come from Vercel env vars, with Railway defaults.
  set_env() { sed -i "s#^$1=.*#$1=$2#" .env.production; grep -q "^$1=" .env.production || echo "$1=$2" >> .env.production; }
  set_env API_BASE_URL "${API_BASE_URL:-https://queueflow-backend-production.up.railway.app/api/v1}"
  set_env WS_BASE_URL "${WS_BASE_URL:-https://queueflow-backend-production.up.railway.app}"
  set_env CUSTOMER_PORTAL_URL "${CUSTOMER_PORTAL_URL:-https://queueflow-six-beta.vercel.app}"
  set_env SENTRY_DSN "${SENTRY_DSN:-}"
  echo "--- .env.production"; cat .env.production

  flutter build web --release -t lib/main_production.dart
  node "$REPO_ROOT/scripts/patch-flutter-web-loader.mjs" build/web
}

case "${1:-}" in
  install) install ;;
  build) build ;;
  *) echo "usage: $0 install|build" >&2; exit 1 ;;
esac

