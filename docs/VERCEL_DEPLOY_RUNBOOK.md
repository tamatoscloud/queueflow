# Vercel deploy runbook (QF-99)

Keep demos unblocked when GitHub → Vercel previews fail.

## Public demo hosts (no SSO)

| Surface | URL | Notes |
|---------|-----|--------|
| **Customer portal (prod alias)** | https://queueflow-six-beta.vercel.app | Use for client demos |
| Dine-in join | https://queueflow-six-beta.vercel.app/q/5354156e-0e46-41a1-ab49-8c6dd9ac80f7 | Must return **HTTP 200** (no SSO redirect) |
| Staff | https://queueflow-staff.vercel.app | Flutter web |
| Business | https://queueflow-business-alpha.vercel.app | Flutter web |

Do **not** send clients to SSO-gated preview URLs (`*.vercel.app` with Vercel login wall). Prefer the aliases above.

## When git deploys are blocked

Symptom on GitHub checks:

```text
Vercel – queueflow-* … FAILURE
Deployment was blocked
Git author <login> must have access to the project on Vercel
```

**Cause:** Vercel team **git author / fork protection** — the commit author is not a member of the Queueflow Vercel team.

**Hobby plan note:** Team **Queueflow** is on **Hobby**, so member invites (e.g. `sealiasad`) are not allowed. Until the team is upgraded to Pro:

**Preferred workaround — author commits as the team owner:**

Agents/maintainers should use the helper (does **not** change git config):

```powershell
# Windows
.\scripts\commit-as-deploy.ps1 -Message "fix: whatever"
```

```bash
# macOS / Linux / Git Bash
./scripts/commit-as-deploy.sh "fix: whatever"
```

Equivalent one-liner:

```bash
git -c user.name="tamatoscloud" -c user.email="tamatos.cloud@gmail.com" commit -m "…"
git push tamatos HEAD
```

That author (`tamatoscloud <tamatos.cloud@gmail.com>`) is the Vercel team OWNER and passes git author checks.

**If Pro is available later:**

1. Vercel → Team **Queueflow** → Settings → Members  
2. Invite `se.aliasad@gmail.com` (GitHub `sealiasad`)  
3. Re-run the failed deployment from the Vercel dashboard

**CLI fallback:** use **CLI deploy from a slim tree** (below). Do not upload the whole monorepo root.

## CLI deploy — customer portal (six-beta)

Requires a Vercel account that already has access to project `queueflow` (or the six-beta project alias).

```bash
# 1) Auth (browser once)
npx vercel login
npx vercel whoami
npx vercel teams list   # expect team that owns queueflow / six-beta

# 2) From a clean checkout of the commit to ship
cd apps/customer-portal
npm ci
npm run build

# 3) Link (once per machine) — pick the project behind six-beta
npx vercel link --yes --scope queueflow --project queueflow
# If the demo alias lives on a different project name, use that project instead.

# 4) Production deploy (scoped to this app directory — keeps upload small)
npx vercel deploy --prod --yes

# 5) Smoke
curl -sS -o /dev/null -w "%{http_code}\n" \
  "https://queueflow-six-beta.vercel.app/q/5354156e-0e46-41a1-ab49-8c6dd9ac80f7"
# expect 200
```

### Fail-fast: do not deploy from monorepo root

```bash
# From repo root — wrong (huge upload / wrong Root Directory)
npx vercel deploy --prod   # ❌ often times out or exceeds size limits
```

Always `cd apps/customer-portal` (or the Flutter app’s `build/web`) first.

**Target:** typical CLI prod deploy **&lt; 5 minutes**; upload **&lt; 50MB** when scoped to the app folder.

## CLI deploy — Flutter web (staff / business)

```bash
cd apps/staff_app   # or business_app, admin_panel, tv_display
flutter pub get
flutter build web --release -t lib/main_production.dart
cd build/web
npx vercel deploy --prod --yes --scope queueflow --name queueflow-staff
```

Link each app to its Vercel project once (`queueflow-staff`, `queueflow-business`, etc.).

## Env vars (portal)

Set in Vercel project → Settings → Environment Variables (Production):

- `NEXT_PUBLIC_API_BASE_URL` → `https://queueflow-backend-production.up.railway.app/api/v1`
- `NEXT_PUBLIC_WS_BASE_URL` → `https://queueflow-backend-production.up.railway.app`
- optional: `NEXT_PUBLIC_SENTRY_DSN`

## Smoke checklist after any portal deploy

1. `curl` join URL → **200**, no Location to `vercel.com/login`  
2. Open join page → Bella Vista / Quyk branding renders  
3. Join one guest → track page updates  
4. Confirm portal calls Railway `/api/v1` (Network tab)

## Related

- Demo URLs: [`DEMO_RUNBOOK.md`](DEMO_RUNBOOK.md)  
- General deploy: [`DEPLOYMENT.md`](DEPLOYMENT.md)  
- Ticket: QF-99 (parent QF-95)
