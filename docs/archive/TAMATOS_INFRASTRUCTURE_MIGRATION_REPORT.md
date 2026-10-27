# QueueFlow — Tamatos Infrastructure Migration Report

**Date:** 2026-08-12  
**Final status:** **BLOCKED** — multiple platform authentications / Supabase org ownership incomplete

---

## Phase 1 — GitHub / Tamatos repository

**STATUS: PASS**

| Field | Result |
|-------|--------|
| GitHub account | `tamatoscloud` |
| Repository | `tamatoscloud/queueflow` (private) |
| Branch | `main` |
| HEAD | `6971ebf3472db967e269defa5d381915b7c59f22` |
| `tamatos/main` | `6971ebf3472db967e269defa5d381915b7c59f22` |
| `origin` | `https://github.com/sealiasad/queueflow.git` (preserved) |
| Force push | Not used |

**Evidence:** `git rev-parse HEAD`, `git rev-parse tamatos/main`, `gh api user --jq '.login'`

---

## Vercel plugin (Cursor)

**STATUS: PASS** (installed; CLI auth wrong account)

| Field | Result |
|-------|--------|
| Plugin installed | Yes — `~/.cursor/extensions/vercel.vercel-plugin-*` |
| Reinstall | Not performed |
| `npx vercel whoami` | **`sealiasad-2685`** |
| Vercel team visible | `sealiasadgmailcom's projects` only |
| Tamatos team | **Not identified** |
| Customer portal deploy | **NOT STARTED** (wrong account) |

**Evidence:** `npx vercel whoami`, `npx vercel teams list`

**Required operator action:**

```bash
npx vercel logout
npx vercel login
npx vercel whoami
npx vercel teams list
```

Authenticate as the **Tamatos** Vercel account/team. Do not deploy until `whoami` / team list confirms Tamatos.

---

## Phase 2 — Supabase organization

**STATUS: BLOCKED**

No explicitly authorized Tamatos Supabase organization has been provided.

Visible orgs (authenticated CLI):

| Name | Org ID |
|------|--------|
| imantech | `dwayugmdfcunzfwkjvle` |
| burqOra | `wpnszicpoirvunmmmtgr` |
| buildbid | `rkplarxacgklszhuaihr` |

**Do not guess.** Reply with the exact org name + ID to use for `queueflow-staging`.

**Note:** `.cursor/mcp.json` references Supabase project ref `rmjirgsfikbnfoljeoag`. MCP server was configured but not active in the current agent session. Project identity as QueueFlow staging is **not verified** until org ownership and schema are confirmed.

---

## Phase 3 — Create `queueflow-staging` Supabase project

**STATUS: BLOCKED** (depends on Phase 2)

---

## Phase 4 — PostgreSQL / Prisma migrations

**STATUS: BLOCKED**

| Field | Result |
|-------|--------|
| Staging DATABASE_URL | Not configured |
| `prisma migrate deploy` | Not run |
| Destructive ops | None |

---

## Phase 5 — Upstash Redis

**STATUS: BLOCKED**

| Field | Result |
|-------|--------|
| `UPSTASH_API_KEY` | MISSING |
| Instance `queueflow-staging` | Not created |

**Required:** Upstash dashboard auth or API key; create dedicated staging Redis (`rediss://`).

---

## Phase 6 — Railway

**STATUS: BLOCKED**

```text
railway whoami → Unauthorized. Please login with `railway login`
```

**Required operator action (browser):**

```bash
railway login
railway whoami
```

---

## Phases 7–12 — Deploy / health / validation

**STATUS: NOT RUN**

No staging backend, Redis, or verified Supabase DB exists.

---

## Phase 13 — Final repository safety

**STATUS: PASS**

| Check | Result |
|-------|--------|
| HEAD | `6971ebf` |
| `tamatos/main` | `6971ebf` |
| Golden PNGs committed | No (local mods only) |
| Secrets tracked | No (templates only) |
| Application code modified | No |
| Production config changed | No |

Untracked local only: docs reports, `.cursor/mcp.json`, `.agents/`, `supabase/` temp — not committed.

---

## Final decision

### **BLOCKED**

GitHub migration remains complete. Staging infrastructure cannot proceed until:

1. **Supabase org** explicitly chosen
2. **`railway login`** completed
3. **Upstash** staging Redis created/authenticated
4. **Vercel** re-authenticated as Tamatos (currently `sealiasad-2685`)

---

## Operator checklist (in order)

1. Reply: Supabase org name + ID for `queueflow-staging`
2. `railway login` → confirm `railway whoami`
3. Create Upstash `queueflow-staging` Redis
4. `npx vercel logout` → `npx vercel login` as Tamatos → confirm team
5. Re-run migration from Phase 3

No secrets were printed. No deployments performed. No migrations run.
