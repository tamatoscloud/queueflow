# Notification smoke (QF-103)

Demo-safe checks for guest call / ready notifications and staff in-app feedback.

## Config (prod / staging)

| Env | Demo-safe value | Notes |
|-----|-----------------|--------|
| `NOTIFICATION_USE_MOCK` | `true` on staging if no Twilio/Meta | Jobs succeed without provider |
| `NOTIFICATION_QUEUE_ENABLED` | `true` when Redis up | Enqueue path exercised |
| Guest join | `notificationPreference`: `SMS` \| `WHATSAPP` \| `BOTH` | Persisted on entry |

Prod Railway currently runs the live API; use mock only when provider credentials are unset.

## Smoke steps (Bella Vista)

1. **Guest join (SMS)** — open dine-in join URL, pick SMS, join.  
   Expect: track page loads; preference stored (Messages / DB).
2. **Staff Call Next** — staff console Call Next for that guest.  
   Expect: guest track → ready / “your turn”; staff toast/sound (in-app).  
   Backend: `CustomerCalled` → bridge → `YOUR_TURN` via `scheduleForPreference`.
3. **Provider failure** — with mock/queue off or bad credentials.  
   Expect: track page still updates via realtime; no crash. Bridge logs warn and swallows errors.
4. **WhatsApp preference** — join with WhatsApp; Call Next.  
   Expect: preference passed through (automated in bridge unit test).

## Automated coverage

```bash
cd backend
npx vitest run src/infrastructure/notifications/__tests__/queue-notification-bridge.idempotency.test.ts
```

Asserts:

- `CustomerCalled` → `YOUR_TURN`
- WhatsApp preference forwarded to `scheduleForPreference`
- Dispatch failure is swallowed (demo-safe)

## Failure modes (stop-ship vs continue)

| Symptom | Action |
|---------|--------|
| Track never shows ready | Realtime / API — stop demo |
| Track OK, no SMS | Continue demo; check `NOTIFICATION_*` + provider later |
| Staff no toast | Continue if board updates; fix staff feedback separately (QF-94) |
