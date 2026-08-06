# TV Display — Testing Report

## Run

```bash
cd apps/tv_display
flutter test
```

## Suites

| Suite | File | Coverage |
|-------|------|----------|
| Unit | `test/display_config_test.dart` | Token generation, JSON round-trip |
| Unit | `test/queue_models_test.dart` | Snapshot parsing, current called |
| Socket | `test/tv_realtime_client_test.dart` | Envelope parsing, event list, client lifecycle |
| Widget | `test/widget/display_screen_test.dart` | Mode 3 token, status chip |
| Golden | `test/goldens/now_serving_token_test.dart` | Now serving typography |

## Manual QA checklist

- [ ] Staff login → configure branch/queue → display starts
- [ ] Public pair with Queue UUID
- [ ] Socket reconnect shows orange banner
- [ ] Call next from business app updates TV within 1s
- [ ] Pause/resume/close queue updates status chip
- [ ] HTTP polling works when socket disconnected
- [ ] Settings persist after browser refresh
- [ ] Landscape-only message in portrait (if enabled)

## Generate golden baseline

```bash
flutter test --update-goldens test/goldens/
```
