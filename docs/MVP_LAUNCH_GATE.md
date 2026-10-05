# MVP launch gate (QF-102 / S14 roll-up)

Go/no-go checklist for Bella Vista demos after S14 production hardening.  
**Owners:** engineering on-call · update Pass/Fail + date when running a gate.

| # | Gate | Evidence / how | Pass? | Date | Blocker |
|---|------|----------------|-------|------|---------|
| 1 | API live health 200 | `curl …/api/v1/health/live` | **Pass** | 2026-10-05 | — |
| 2 | API on current `main` SHA | `/api/v1/health` → `gitSha` matches merge | **Pass** | 2026-10-05 | — (`b4a92d43`+) |
| 3 | Warm login & queues budgets | See QF-97 comment (login p95 &lt; 2s) | **Pass** | 2026-10-05 | Queues p95 spikes OK if median &lt; 800ms |
| 4 | Guest join + track (prod portal) | six-beta dine-in join → `/track/` | **Pass** | 2026-10-05 | — |
| 5 | Browse Menu E2E | Playwright `browse-menu.spec.ts` (QF-100) | **Pass*** | 2026-10-05 | *CI green pending PR #5 merge |
| 6 | Staff Call Next / Seat | Dual demo video + QF-94/96 Done | **Pass** | 2026-10-05 | — |
| 7 | Staff Live chip / offline honesty | QF-94 merged | **Pass** | 2026-10-05 | — |
| 8 | Notification call path | QF-103 smoke + unit tests | **Pass*** | 2026-10-05 | *closing with this gate |
| 9 | Quyk naming / indigo theme | QF-101 Done | **Pass** | 2026-10-05 | — |
| 10 | Vercel demo host (no SSO) | six-beta join URL HTTP 200 | **Pass** | 2026-10-05 | Git previews still blocked (QF-99 runbook) |
| 11 | Flutter + Backend CI on merge PRs | Green Actions (ignore Vercel author block) | **Pass** | 2026-10-05 | Invite `sealiasad` to Vercel team |
| 12 | Known defects listed | Below | **Pass** | 2026-10-05 | — |

\* Re-check after PR #5 / QF-103 merge land on `main`.

## Known defects (non-blocking for demo)

| Item | Ticket / note |
|------|----------------|
| Vercel git author protection blocks PR previews | QF-99 — use CLI / six-beta |
| Client RTT to `/health/live` ~450–500ms from PK | Geographic; server path O(1) |
| Railway CLI duplicate `up` can fail when GitHub already deployed | Prefer git deploy to `main` |

## Stop-ship rules

- **N1** API down / health not 200 → **Fail** — stop demo  
- **N2** CI red on `main` for Backend or Customer Portal → **Fail** until green  
- Guest cannot join or track never updates → **Fail**

## Demo rollback / contacts

1. Confirm Railway deployment SUCCESS for `queueflow-backend` on last known-good SHA  
2. Portal: keep alias `queueflow-six-beta.vercel.app` (do not point clients at SSO previews)  
3. Seed: Bella Vista queues in `docs/demo/bella-vista-manifest.json`  
4. Escalation: Tamatos Cloud owner + Railway project **Queueflow**

## Sign-off

| Role | Name | Result | Date |
|------|------|--------|------|
| Engineering | — | Ready pending PR #5 + QF-103 merge | 2026-10-05 |
| Product / presenter | — | | |

Link parent epic **QF-95** / launch **QF-92** when all rows Pass after merges.
