# Super Admin Portal — Production Readiness

## Ready

- [x] Platform-admin-only authentication (client + server)
- [x] JWT session with refresh token interceptor
- [x] All Sprint 10 feature areas implemented
- [x] Responsive desktop/tablet layout
- [x] Unit, widget, and golden tests
- [x] Architecture and deployment documentation
- [x] Backend `/platform/*` APIs with RBAC

## Before production launch

| Item | Priority | Notes |
|------|----------|-------|
| Apply DB migration `20260723180000_platform_admin` | **Required** | `npx prisma migrate deploy` |
| Seed `platform_config` row | **Required** | Migration inserts default row |
| Restrict admin origin | **Required** | VPN, IP allowlist, or internal DNS |
| CORS configuration | **Required** | Add admin portal origin |
| HTTPS everywhere | **Required** | TLS for API and static host |
| Rotate demo passwords | **Required** | Seed uses demo hash |
| Error monitoring (Sentry/etc.) | Recommended | Not wired in app yet |
| Rate limiting on auth | Recommended | Backend concern |
| Billing integration | Future | Revenue KPI placeholder |

## Security

- Tokens in secure storage; separate key namespace from business app
- No secrets in `.env` committed to git
- Platform routes double-check `isPlatformAdmin`
- Soft-delete for businesses preserves audit trail

## Performance

- Paginated tenant/user/audit lists
- `FutureProvider.autoDispose` limits memory on navigation
- Charts use lightweight `fl_chart` widgets

## Operational runbook

1. **Health degraded:** Check `/platform/health` in portal or `GET /health` on API
2. **Redis down:** Notifications queue disabled; workers show degraded
3. **Failed notifications:** Use Notifications screen → Retry
4. **Locked-out admin:** Reset password via DB or another platform admin

## Out of scope (by design)

- Queue Engine modifications
- Notification system architecture changes
- Customer-facing flows
