# Super Admin Portal — Testing Report

**Date:** 2026-07-23  
**App:** `apps/admin_panel`  
**Stack:** Flutter Web, Riverpod, GoRouter

## Test suites

| Suite | Path | Coverage |
|-------|------|----------|
| Unit | `test/unit/auth_controller_test.dart` | AuthUser parsing, AuthState |
| Unit | `test/unit/platform_models_test.dart` | Dashboard/business model parsing |
| Widget | `test/widget/login_screen_test.dart` | Login UI, app bootstrap |
| Widget | `test/widget/admin_widgets_test.dart` | KpiCard, StatusChip |
| Widget | `test/widget_test.dart` | End-to-end app smoke |
| Golden | `test/golden/login_screen_golden_test.dart` | Login layout regression |

## Run

```bash
cd apps/admin_panel
flutter test
```

## Manual QA checklist

- [ ] Platform admin login succeeds (`ops@queueflow.app`)
- [ ] Non-admin user rejected at login
- [ ] Dashboard KPIs match backend `/platform/dashboard`
- [ ] Tenant create/search/pagination
- [ ] Tenant deactivate/delete
- [ ] Branch list per business
- [ ] User suspend + password reset
- [ ] Subscription manual override
- [ ] Failed notification retry
- [ ] Audit log search
- [ ] Support ticket create/update
- [ ] Global feature flag toggle
- [ ] System health refresh
- [ ] Analytics charts render
- [ ] Logout clears session
- [ ] Responsive: desktop rail + mobile drawer

## Known limitations

- Revenue MRR is placeholder until billing integration
- Peak-hours analytics deferred on backend
- Per-business feature flags UI directs to API (global toggles in UI)
- Golden tests require `--update-goldens` when intentionally changing login layout
