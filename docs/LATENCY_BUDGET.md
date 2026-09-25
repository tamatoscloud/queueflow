# Latency budget (production)

Targets for a realtime restaurant console. Measured from a warm process unless noted.

| Endpoint / UX | Budget (p95) | Notes |
|---|---|---|
| `GET /api/v1/health/live` | **< 200ms** server-side (O(1)); client RTT may be higher by geography | Railway / LB **must** probe this path |
| `GET /api/v1/health` | Best-effort; capped dependency probes (~1.5s each) | Ops only — not a liveness probe |
| `POST /api/v1/auth/login` | **< 2s** warm | bcrypt verify + session upsert; `lastLoginAt` is async |
| `GET /api/v1/queues` | **< 800ms** warm | count ∥ findMany with filtered `_count` for waiting |
| Call Next | **< 800ms** warm | Queue engine mutation |
| Staff: login → Live Queue interactive | **< 2s** warm | End-to-end UX |

## Configuration knobs

| Env | Default | Purpose |
|---|---|---|
| `BCRYPT_ROUNDS` | `10` | Cost for **new** password hashes (existing hashes keep their cost) |
| `REDIS_HEALTH_PROBE_TIMEOUT_MS` | `1000` | Redis connect/ping budget |
| `REDIS_HEALTH_CACHE_MS` | `10000` | Reuse last Redis health for deep `/health` |
| `HEALTH_DEPENDENCY_TIMEOUT_MS` | `1500` | Cap per dependency on deep `/health` |

## Railway

`backend/railway.toml` sets:

```toml
healthcheckPath = "/api/v1/health/live"
```

Confirm in the Railway dashboard that the service healthcheck path matches (dashboard overrides win if set).

## How to re-measure

```bash
API=https://queueflow-backend-production.up.railway.app/api/v1
# Warm live probe (repeat ≥20)
for i in $(seq 1 20); do
  curl -sS -o /dev/null -w "%{time_total}\n" "$API/health/live"
done
```

Document median / p95 in the QF-93 / QF-97 ticket when validating a release.
