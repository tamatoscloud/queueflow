# Super Admin Portal — Deployment Guide

## Build

```bash
cd apps/admin_panel
flutter pub get
flutter build web --release -t lib/main_production.dart
```

Output: `build/web/`

## Environment files

| File | Use |
|------|-----|
| `.env.dev` | Local development |
| `.env.staging` | Staging |
| `.env.production` | Production |

Required variables:

```
API_BASE_URL=https://api.your-domain.com/api/v1
WS_BASE_URL=https://api.your-domain.com
APP_NAME=QueueFlow Admin
```

## Hosting options

### Static hosting (recommended)

Deploy `build/web` to any static host:

- **Vercel / Netlify / Cloudflare Pages** — point build output, enable SPA fallback to `index.html`
- **S3 + CloudFront** — upload artifacts, configure `index.html` as error document for client routing

### Nginx example

```nginx
server {
  listen 443 ssl;
  server_name admin.queueflow.app;
  root /var/www/admin_panel;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## CORS

Ensure backend `CORS_ORIGINS` includes the admin portal origin (e.g. `https://admin.queueflow.app`).

## DNS

Recommended subdomain: `admin.<your-domain>` — internal use only; restrict via VPN or IP allowlist if required.

## CI/CD sketch

```yaml
- run: flutter build web --release -t lib/main_production.dart
  working-directory: apps/admin_panel
- upload: build/web
```

## Post-deploy checks

1. Login with platform admin credentials
2. Dashboard KPIs load
3. Health screen shows Redis/database status
4. Token refresh works after 15+ minutes
