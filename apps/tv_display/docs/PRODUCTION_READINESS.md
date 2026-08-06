# TV Display — Production Readiness

## Ready

- [x] Flutter Web app at `apps/tv_display`
- [x] Public + staff configuration modes
- [x] Socket.IO `subscribe:queue-display` (no new backend APIs)
- [x] Public REST: snapshot + customer-portal landing
- [x] Four display layout modes
- [x] Reconnect banner + HTTP polling fallback
- [x] Local config persistence (Hive)
- [x] Sound alert on `CustomerCalled`
- [x] Unit, widget, socket, golden tests
- [x] Deployment + configuration documentation

## Before production

- [ ] Set production `API_BASE_URL` / `WS_BASE_URL` in CI
- [ ] Add TV display origin to `CORS_ALLOWED_ORIGINS`
- [ ] Configure kiosk browser on each TV
- [ ] Optional: Web Speech API for voice announcements
- [ ] Optional: server-side display pairing API (cross-device token lookup)

## Known limitations

- Display tokens are stored locally — pairing another TV requires entering the Queue UUID or running staff setup on that device
- Voice announcement interface is stubbed (Web Speech API hook ready)
- Fullscreen uses browser API (kiosk browser recommended for 24/7 displays)

## Performance

- Riverpod `autoDispose` bindings limit rebuild scope
- Snapshot refresh only on socket events or poll interval
- `AnimatedSwitcher` / `FadeTransition` for 60 FPS-friendly updates on modern TVs
