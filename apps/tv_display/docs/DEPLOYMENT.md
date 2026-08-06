# TV Display — Deployment Guide

## Build

```bash
cd apps/tv_display
flutter pub get
flutter build web -t lib/main_production.dart --release
```

Output: `build/web/`

## Hosting

Deploy `build/web/` to any static host (Firebase Hosting, Cloudflare Pages, S3 + CloudFront, nginx).

### Base href

If not served from domain root, build with:

```bash
flutter build web --base-href /tv/
```

### Environment

Inject production values before build:

```env
API_BASE_URL=https://api.yourdomain.com/api/v1
WS_BASE_URL=https://api.yourdomain.com
```

Or use CI secrets to generate `.env.production` at build time.

## CORS

Backend `CORS_ALLOWED_ORIGINS` must include the TV display origin.

In development, `localhost` origins are auto-allowed.

## Kiosk mode

1. Open the display URL in Chrome/Edge
2. Use **Enter fullscreen** in display settings
3. Enable OS kiosk mode (Windows Assigned Access, Chrome kiosk extension, or dedicated TV browser)

## Health check

Verify backend: `GET /api/v1/health`

Verify realtime: browser devtools → Network → WS connection to `/realtime`

## Rollback

Static assets are immutable per build — redeploy the previous `build/web` artifact.
