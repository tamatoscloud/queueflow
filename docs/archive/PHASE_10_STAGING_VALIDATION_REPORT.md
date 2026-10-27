# QueueFlow Phase 10 — Staging Validation Report

**Date:** 2026-08-12  
**Task:** Staging deployment & PostgreSQL notification queue validation  
**Final decision:** **STAGING BLOCKED**

---

## STAGING STATUS

**NOT DEPLOYED / NOT VALIDATED**

Deployable commit is on Tamatos. Dedicated staging identity is still **not positively verified**.

---

## DEPLOYED COMMIT

| Reference | Value |
|-----------|-------|
| Local HEAD | `e6aeebd26bc185bfe3f552306e92a8f6e0627baf` |
| `tamatos/main` | `e6aeebd26bc185bfe3f552306e92a8f6e0627baf` |
| Live staging `gitSha` | **N/A — not deployed** |

Commit message: `feat: add postgres notification queue driver`

---

## Phase results

| Phase | Status | Evidence |
|-------|--------|----------|
| 0 Repository | **PASS** | `main` @ `e6aeebd`; matches `tamatos/main`; golden PNGs uncommitted only |
| 1 GitHub | **PASS** | `tamatoscloud/queueflow` main = `e6aeebd` |
| 2 Supabase staging | **BLOCKED** | No dedicated QueueFlow staging project identified |
| 3–4 DB / migrate | **NOT RUN** | No confirmed staging `DATABASE_URL` |
| 5 Railway deploy | **BLOCKED** | Only env named `production`; app secrets missing; last deploy `FAILED`; no domains |
| 6–19 Validation | **NOT RUN** | Blocked upstream |
| Redis removal | **NOT STARTED** (correct) | |

---

## Railway (non-secret)

| Field | Result |
|-------|--------|
| Account | `tamatos.cloud@gmail.com` |
| Workspace | `tamatoscloud's Projects` |
| Project | `Queueflow` (`1b12e1a3-080d-47d7-860b-fa9e82a6a0a4`) |
| Environments | **only** `production` |
| Service | `Queueflow` |
| Latest deployment | `FAILED` (`703ca83b-ef71-4470-bd4c-e2252d41573f`) |
| Domains | none |
| App vars present | **NO** — only platform `RAILWAY_*` keys |

Missing required app vars (names only): `APP_ENV`, `GIT_SHA`, `DATABASE_URL`, `REDIS_URL`, JWT/auth secrets, Supabase keys, `NOTIFICATION_QUEUE_DRIVER`, CORS origins, etc.

Per policy: **do not treat Railway `production` as staging**.

---

## Supabase (non-secret)

| Candidate | Disposition |
|-----------|-------------|
| MCP `user-supabase` / `phgjkhmklyybvgnceqmm` | **REJECTED** — attendance/shift schema (`attendance_logs`, `shift_sessions`, …) |
| CLI projects named `sealiasad's Project` (`phgjkhmklyybvgnceqmm`, `kqylyxmqikapppcbkllf`) | **Not** confirmed QueueFlow staging |
| MCP config ref `rmjirgsfikbnfoljeoag` | Configured in `.cursor/mcp.json` but **not positively verified** this run |
| Named `queueflow-staging` | **Not found** |

Orgs visible via CLI: `imantech`, `burqOra`, `buildbid` — none confirmed as QueueFlow staging owner.

---

## Vercel

| Field | Result |
|-------|--------|
| `vercel whoami` | `tamatoscloud` |
| Team | `queueflow` |
| Project seen | `queueflow` → `https://queueflow-queueflow.vercel.app` |
| Local link / env inspect | Not linked in this workspace |
| Portal staging validation | **NOT RUN** (blocked before API staging exists) |

---

## Documented staging hosts

From `config/staging.env.example`:

- `api.staging.queueflow.app`
- `staging.queueflow.app`
- `portal.staging.queueflow.app`

These are **not** bound to a verified Railway/Vercel staging service in this run.

---

## PostgreSQL notification queue

| Item | Status |
|------|--------|
| On `e6aeebd` / `tamatos/main` | **Present** |
| Staging migration | **NOT RUN** |
| Driver validation (`postgres` / `redis`) | **NOT RUN** |

Expected migration when unblocked: `20260812190000_notification_jobs_postgres_queue`

---

## Exact operator actions to unblock

1. **Create or name a dedicated staging stack** (do not reuse ambiguous production):
   - Railway environment named `staging` (or confirm in writing that the sole `production` env is actually dedicated staging and safe to use)
   - Backend domain for staging API
2. **Confirm Supabase QueueFlow staging project** (ref + org + that schema is QueueFlow, not attendance)
3. **Provision secrets on Railway staging** (names from `config/staging.env.example`): `DATABASE_URL`, `REDIS_URL`, JWT, Supabase, `APP_ENV=staging`, `GIT_SHA=e6aeebd…`, keep Redis; optionally later set `NOTIFICATION_QUEUE_DRIVER=postgres`
4. **Fix Railway build/start** so deploy of `e6aeebd` succeeds (root directory / start command for Nest backend)
5. Re-run this validation task against the verified staging identity only

---

## Confirmations

- No production treated as staging
- No migration applied to any real DB
- No Redis removed
- No Socket.IO / auth / tenant / queue-engine code changes
- No force push
- No secrets printed
- Unrelated attendance Supabase project rejected
