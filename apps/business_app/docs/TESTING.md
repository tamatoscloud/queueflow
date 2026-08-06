# QueueFlow Business App — Testing Report

## Summary

| Suite | Tests | Status |
|-------|-------|--------|
| `test/auth_user_test.dart` | Auth model JSON parsing | Pass |
| `test/widget_test.dart` | StatCard widget + golden | Pass (golden on CI with `--update-goldens` for first run) |

## Running tests

```bash
cd apps/business_app
flutter test
```

### Golden tests

First run or after intentional UI changes:

```bash
flutter test --update-goldens
```

Golden files live in `test/goldens/`.

## Coverage by feature

| Feature | Unit | Widget | Golden | Manual |
|---------|------|--------|--------|--------|
| Auth (login, refresh, logout) | AuthUser JSON | — | — | Login flow |
| Dashboard KPIs | — | StatCard | StatCard | Socket invalidation |
| Branches CRUD | — | — | — | Add/edit/delete |
| Queues | — | — | — | Create, open/pause/close |
| Queue console | — | — | — | Call/hold/skip/transfer |
| Customers | — | — | — | Phone lookup |
| Reports | — | StatCard | — | Tab navigation |
| Notifications | — | — | — | Infinite scroll |
| Realtime | — | — | — | Live chip status |
| Offline cache | cached_fetch | — | — | Airplane mode |

## Integration testing (recommended)

With backend running on `:3000` and seed data:

1. Login as `owner@cafe-aroma.example.com` / `Password123!`
2. Verify dashboard loads KPIs
3. Open queue console → call next → complete
4. Confirm Socket.IO chip shows **Live**

## Performance notes

- Provider invalidation is scoped per queue/business (no global rebuild)
- Hive cache serves branches/queues lists when offline
- Notifications paginate 20 per page with scroll-triggered fetch
- Tablet console uses split layout (waiting list + current panel)
