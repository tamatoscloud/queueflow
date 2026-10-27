# Release Checklist

Use this checklist before every staging or production release.

## Pre-release

- [ ] All CI checks green on `main` ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml))
- [ ] `npm test` passes in `backend/`
- [ ] `flutter test` passes for `business_app`, `admin_panel`, `tv_display`
- [ ] `npm test` + `npm run build` pass in `apps/customer-portal/`
- [ ] No `CHANGE_ME` or placeholder secrets in deployed environment
- [ ] `SEED_DEMO_PASSWORD` is **not** set in staging/production

## Database (Supabase)

- [ ] Review pending Prisma migrations: `npm run prisma:migrate:status`
- [ ] Apply migrations: `npm run prisma:migrate:deploy:prod`
- [ ] Verify connection: `npm run db:check` (against target DB)
- [ ] Confirm backup / PITR enabled on Supabase project
- [ ] Rollback plan documented if migration is destructive

## Redis (Upstash)

- [ ] `REDIS_URL` uses `rediss://` (TLS) in staging/production
- [ ] `NOTIFICATION_QUEUE_ENABLED=true`
- [ ] `NOTIFICATION_USE_MOCK=false` in production
- [ ] Notification worker started (API boot log shows `NotificationWorker bound to notification queue`)
- [ ] Queue depth acceptable via admin health dashboard

## Notification providers

- [ ] WhatsApp Cloud API credentials set (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`)
- [ ] SMS gateway configured (`SMS_HTTP_GATEWAY_URL`) or provider mock disabled
- [ ] Test message delivered end-to-end in staging

## Domains & HTTPS

- [ ] API: `https://api.<domain>` with valid TLS
- [ ] Customer portal: `https://portal.<domain>` or custom domain
- [ ] Business app: `https://app.<domain>`
- [ ] Admin panel: `https://admin.<domain>` (VPN/IP restricted recommended)
- [ ] TV display: branch-specific URLs if applicable
- [ ] `CORS_ALLOWED_ORIGINS` includes all frontend origins

## Secrets rotation

- [ ] `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are strong (32+ chars)
- [ ] Supabase service role key not exposed to clients
- [ ] Demo seed passwords not used in production
- [ ] Sentry DSN configured per environment

## Monitoring

- [ ] Sentry receiving events from backend + all frontends
- [ ] `GET /api/v1/health` returns `status: ok` (or acceptable `degraded`)
- [ ] Uptime monitor on health endpoint
- [ ] Log aggregation configured (structured JSON logs from backend)

## Smoke tests (manual)

- [ ] Platform admin can log in to admin panel
- [ ] Business owner can log in to business app
- [ ] Customer can join queue via QR portal
- [ ] Staff can call next customer
- [ ] Customer receives notification (or mock log in staging)
- [ ] TV display shows live queue updates
- [ ] Socket.IO reconnect works after network blip

## Rollback

- [ ] Previous backend artifact tagged and available
- [ ] Previous frontend builds retained (CDN versioning)
- [ ] Database rollback strategy: forward-fix migration preferred over down-migration
- [ ] On-call contact identified

## Post-release

- [ ] Verify health endpoint for 15 minutes
- [ ] Check Sentry for new error spikes
- [ ] Check notification failure rate in admin dashboard
- [ ] Announce release internally
