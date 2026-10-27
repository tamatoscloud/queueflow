# QueueFlow — Client Demo Runbook

**For restaurant presentations.** This guide walks you through a live Bella Vista demo — no technical background required.

QueueFlow helps restaurants manage waiting guests, takeaway pickups, and drive-in orders. Customers join from their phone (no app install). Staff call guests when ready. Owners see live performance. A TV screen shows who is being served.

---

## Production demo (start here)

Use these live URLs. Do **not** invent credentials in this doc — ask your technical contact for the Bella Vista owner/staff passwords.

### Demo credential provisioning (technical contact only)

Bella Vista accounts are provisioned with the normal bcrypt password path (no JWT bypass). Never commit the password.

```bash
# Generate a strong password, store it only in Railway / a gitignored operator file.
# Then, with DATABASE_URL pointing at production (prefer `railway run`):
cd backend
SEED_DEMO_PASSWORD='…' npm run demo:provision-passwords
```

Allowlisted emails only:

- `owner@bellavista.example.com`
- `manager.dt@bellavista.example.com`
- `staff1.dt@bellavista.example.com`
- `staff2.dt@bellavista.example.com`

Do **not** run `demo:reset` against production unless you intend to delete and recreate Bella Vista (queue UUIDs / QR URLs will change).

### Open first (presenter laptop)

1. **Business Dashboard:** https://queueflow-business-alpha.vercel.app  
2. Sign in as the Bella Vista **owner**.  
3. Open the **QR** tab in the side nav.  
4. Select the **Dine-in** queue and show the large QR (or copy the join link).

### Guest phone (scan or open)

**Dine-in join URL (canonical):**  
https://queueflow-six-beta.vercel.app/q/5354156e-0e46-41a1-ab49-8c6dd9ac80f7

### Staff tablet / second window

**Staff Console:** https://queueflow-staff.vercel.app  
Sign in as Bella Vista **staff** (same demo password as provided by your technical contact).

### Optional lobby TV

**TV Display:** https://queueflow-tv.vercel.app → pair with the dine-in queue ID from QR Center.

### 14-step acceptance journey

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Presenter | Open Business Dashboard | Login screen |
| 2 | Presenter | Sign in as owner | Dashboard / restaurant home |
| 3 | Presenter | Open **QR** | Large dine-in QR + join URL |
| 4 | Guest phone | Scan QR or open join URL | Landing: restaurant name, wait, **Join queue** |
| 5 | Guest | Tap Join queue | Party size stepper + name/phone |
| 6 | Guest | Submit join | Live track: queue number, position, ETA |
| 7 | Staff | Open Staff Console → Live Queue | Waiting count + Up next + **CALL NEXT** |
| 8 | Staff | Tap **CALL NEXT** | Guest entry becomes called |
| 9 | Guest | Watch phone | **It's your turn** (indigo full-screen) |
| 10 | Staff | Tap **COMPLETE** (or Seat) | Visit completed |
| 11 | Guest | Track updates | **You're all set** / completed |
| 12 | Optional | TV Display | NOW SERVING shows the called number |
| 13 | Optional | Business Queues | Waiting counts refresh live |
| 14 | Presenter | Show Marketing | https://queueflow-marketing.vercel.app restaurant story |

### Other production URLs

| App | URL |
|-----|-----|
| Customer Portal | https://queueflow-six-beta.vercel.app |
| Staff | https://queueflow-staff.vercel.app |
| Business | https://queueflow-business-alpha.vercel.app |
| Admin | https://queueflow-admin.vercel.app |
| TV | https://queueflow-tv.vercel.app |
| Marketing | https://queueflow-marketing.vercel.app |
| API | https://queueflow-backend-production.up.railway.app/api/v1 |

---

## Local development demo (below)

Use this section when demonstrating against a local backend instead of production.


### What you need

| Item | Why |
|------|-----|
| Laptop (presenter) | Runs apps and controls the demo |
| 1–2 phones or tablets | Customer experience (scan QR, join queue) |
| Optional: TV or projector | Lobby “Now Serving” display |
| Stable Wi‑Fi | All devices on the same network for live updates |

### First-time setup (your technical contact)

Someone on your team should complete this once before the first client demo:

1. Install Node.js 20+, Flutter 3.38+, and PostgreSQL access (Supabase)
2. Copy environment files and set passwords (never share these in the presentation)
3. Run the database seed or demo reset (see [Reset demo](#reset-demo-between-presentations))
4. Note the join URLs from `docs/demo/bella-vista-manifest.json`

### Bella Vista demo restaurant

| | |
|--|--|
| **Restaurant** | Bella Vista |
| **Location** | Downtown |
| **Hours** | 12 PM – 11 PM |
| **Service modes** | Dine-in, Takeaway, Drive-in |

---

## Starting the demo environment

Open separate terminal windows for each service below. Wait until each one says it is running before moving on.

### 1. Database & Redis

Your technical contact ensures PostgreSQL and Redis are available.

- **Redis (local):** run `redis-server` on your machine, or use a managed Redis URL in backend settings
- **Database:** connection string in `backend/.env.local`

### 2. Backend API

```bash
cd backend
npm install
npm run dev
```

Opens at **http://localhost:3000** — powers all apps.

### 3. Customer Portal (guest phones)

```bash
cd apps/customer-portal
npm install
npm run dev
```

Opens at **http://localhost:3001** — this is what QR codes open.

> **Phones on Wi‑Fi:** Ask your technical contact to set `CUSTOMER_PORTAL_URL` to your laptop’s IP (e.g. `http://192.168.1.50:3001`) before seeding, so QR codes work on guest devices.

### 4. Staff App (reception)

```bash
cd apps/staff_app
flutter pub get
flutter run -d chrome -t lib/main_dev.dart
```

Log in as a host or manager (see [Credentials](#demo-login-credentials)).

### 5. Business Owner App

```bash
cd apps/business_app
flutter pub get
flutter run -d chrome -t lib/main_dev.dart
```

Same owner login — dashboard, reports, QR center.

### 6. TV Display

```bash
cd apps/tv_display
flutter pub get
flutter run -d chrome -t lib/main_dev.dart
```

Pair to the Bella Vista dine-in queue when prompted.

### 7. Super Admin (platform overview)

```bash
cd apps/admin_panel
flutter pub get
flutter run -d chrome -t lib/main_dev.dart
```

Platform operator login (optional for restaurant clients).

### 8. Marketing Website (optional)

```bash
cd apps/marketing_website
flutter pub get
flutter run -d chrome -t lib/main_dev.dart
```

Product website for “Book a demo” and pricing context.

---

## Demo login credentials

| Role | Email | Password |
|------|-------|----------|
| **Restaurant owner** | `owner@bellavista.example.com` | Your team’s demo password (`SEED_DEMO_PASSWORD`) |
| **Host / staff** | `staff1.dt@bellavista.example.com` | Same demo password |
| **Platform admin** | `ops@queueflow.app` | Same demo password |

> Passwords are set during seeding — they are **not** shown to customers and never appear on guest screens.

---

## QR codes & join links

After seeding, open **`docs/demo/bella-vista-manifest.json`** for exact URLs.

### Dine-in (main entrance)

| Placement | Code |
|-----------|------|
| Restaurant entrance | BV-ENTRANCE |
| Reception desk | BV-RECEPTION |
| Window | BV-WINDOW |
| Outdoor banner | BV-OUTDOOR |
| Parking area | BV-PARKING |

All dine-in QR codes open the **Dine-In Waiting List**.

### Takeaway & drive-in

Use the **Takeaway Pickup** and **Drive-In Lane** join URLs from the manifest `serviceModes` section, or print posters from **Owner App → QR Center**.

### How to open a QR without printing

1. Copy a join URL from the manifest
2. Paste into a phone browser, or
3. Generate a QR from **Owner App → QR Center → Copy / Share**

---

## 15-minute client demo (recommended script)

### The story in one minute

**CUSTOMER:** Scan QR → restaurant page → join → receive number → watch live position → get notified when ready  

**STAFF:** Guest appears automatically → tap **Call Next** → guest’s phone updates  

**CUSTOMER:** “Your table / order / car is ready”  

**STAFF:** Seat / Serve / Collect  

**OWNER:** Dashboard updates — waiting count, service performance  

**TV:** NOW SERVING changes  

**ADMIN:** Platform health and businesses visible (if showing SaaS angle)

---

### Minutes 1–3 — Customer joins (phone)

1. On a phone, open the **dine-in** join URL (or scan QR)
2. Show Bella Vista branding and current wait
3. Tap **Join the queue** — party of 2, name and mobile
4. Show the **tracking screen**: token number, position, estimated wait
5. Say: *“No app download — works in the browser.”*

### Minutes 3–6 — Staff workflow (laptop / tablet)

1. Open **Staff App → Today**
2. Point out: **how many waiting**, **who is next**, **Call Next**
3. Tap **Call Next** for dine-in
4. On the phone: screen changes to **“Your table is ready!”**
5. Tap **Seat** (or complete) on staff — guest sees thank-you / completed

### Minutes 6–8 — Takeaway (second phone, optional)

1. Open **takeaway** join URL
2. Enter order number **4821**, name, phone → **Track my order**
3. Staff switches to takeaway queue → **Call Next**
4. Phone shows **“Your order is ready!”** (not “table ready”)

### Minutes 8–10 — Drive-in (optional)

1. Open **drive-in** join URL
2. Enter vehicle **Black Toyota**, plate **ABC-123**
3. Staff calls next — phone shows **order on the way to your car**
4. Staff taps **Serve** / complete

### Minutes 10–12 — Owner dashboard

1. Open **Business Owner App**
2. Show **waiting now**, **served today**, **service performance** by mode
3. Open **QR Center** — posters for each service mode
4. Open **Reports** — today’s joined / served / average wait (real data)

### Minutes 12–14 — TV display

1. Show TV paired to dine-in queue
2. **NOW SERVING** updates when staff calls next
3. Mention automatic reconnect if Wi‑Fi blips

### Minutes 14–15 — Platform (optional)

1. **Super Admin** → businesses list, Bella Vista active
2. **Alerts** if any notification issues
3. Close: *“One platform — dine-in, takeaway, and drive-in.”*

---

## Service mode demos (detailed)

### Dine-in

| Step | What you do | What the client should see |
|------|-------------|----------------------------|
| Scan / open link | Guest opens dine-in URL | Restaurant hero, “parties waiting” |
| Join | Party size, name, phone | Token e.g. **A-024** |
| Wait | Leave tracking open | Position updates live |
| Staff Call Next | Staff app, dine-in queue | **Your table is ready!** |
| Complete | Staff seats guest | Thank-you / feedback screen |
| Owner | Refresh dashboard | Waiting count drops, served increases |
| TV | Watch board | Token moves to NOW SERVING |

### Takeaway

| Step | What you do | What the client should see |
|------|-------------|----------------------------|
| Open takeaway URL | From manifest | Pickup-oriented copy |
| Join | Order #4821 + contact | **Orders ahead** (not “parties”) |
| Staff | Shows order number on card | **Call Next** → **Ready for pickup** |
| Complete | Staff collects | Completed / feedback |

### Drive-in

| Step | What you do | What the client should see |
|------|-------------|----------------------------|
| Open drive-in URL | From manifest | Stay in your vehicle |
| Join | Vehicle + plate | **Cars ahead** |
| Staff | Vehicle on entry card | **Call Next** → **On the way to your car** |
| Complete | Staff serves at car | Completed |

---

## What should happen after each action

| Action | Customer | Staff | Owner | TV |
|--------|----------|-------|-------|-----|
| Guest joins | Tracking page, token, position | New entry in waiting list | Waiting count ↑ | Queue list updates |
| Call Next | Ready screen + notification queued | Entry moves to “called” | Live metrics refresh | NOW SERVING changes |
| Seat / Serve / Collect | — | Entry clears from active | Served count ↑ | Board updates |
| Complete | Completed / feedback | Entry removed | Reports update | Token leaves “now serving” |
| No-show / Cancel | Friendly ended message | Entry archived | Counts adjust | Board updates |
| Reconnect after Wi‑Fi blip | “Connection restored” | Same | Same | “Updating automatically” |

---

## Realtime verification

Live updates use a persistent connection. You do **not** need to refresh guest phones.

**Quick check:**

1. Join on a phone — note the position number
2. On staff, call someone ahead in line (or use a fresh demo after reset)
3. Phone position should count down automatically within a few seconds
4. TV and owner dashboard should update without manual refresh

**Reconnect test:** Toggle airplane mode on the phone for 5 seconds — tracking should recover and show **Connection restored**.

---

## Notification verification

QueueFlow queues SMS/WhatsApp notifications when a guest is called. In demo mode, messages go through the platform’s test/mock provider — **no real SMS charges**.

**Check:**

1. After **Call Next**, staff **Notifications** tab may show a pending/sent entry
2. Queue state stays correct even if a notification fails
3. Guests are never told a message was “sent” unless it was

---

## Staff workflow reference

**Today screen** answers four questions immediately:

1. How many customers / orders / cars are waiting?
2. Who is next?
3. What do I do? → **Call Next** (large button)
4. Can I call now? → Yes, when the queue is open

**After calling:** Seat (dine-in), Serve (drive-in), Collect (takeaway), No-show, Hold, Recall — all labeled for the active service mode.

---

## Owner workflow reference

| Area | Purpose |
|------|---------|
| **Dashboard** | What is happening right now |
| **Queues** | Manage dine-in, takeaway, drive-in lists |
| **Staff** | Invite and manage team |
| **QR Center** | Print/share join posters |
| **Reports** | Today’s joined, served, wait times |
| **Service performance** | Busiest mode, averages |
| **Settings** | Branding, hours, developer tools (hidden at bottom) |

---

## TV workflow reference

- **NOW SERVING** — largest token on screen
- **Up next** — next few guests / orders / cars
- **Connection banner** — friendly status, not technical errors
- **Fullscreen** — use browser fullscreen (F11) for lobby displays
- **Settings** — theme and queue pairing

---

## Admin workflow reference (platform demo)

| Area | Purpose |
|------|---------|
| **Overview** | Platform health snapshot |
| **Businesses** | Bella Vista and other tenants |
| **Alerts** | Notification or system issues |
| **Support** | Tickets |
| **More** (mobile) | All other sections |
| **Command palette** | Press **Ctrl+K** (Windows) or **Cmd+K** (Mac) to jump anywhere |

Revenue and some analytics show honest empty states when data is unavailable — not fake numbers.

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Phone cannot open QR link | Re-seed with your laptop’s LAN IP as `CUSTOMER_PORTAL_URL` |
| “Cannot reach server” in staff/owner app | Check `API_BASE_URL` points to backend (e.g. `http://localhost:3000/api/v1`) |
| Queue says closed | Demo join bypasses hours; ensure queue is **accepting entries** in owner app |
| Guest position not updating | Confirm backend and Redis are running; wait 5s or toggle reconnect |
| TV not updating | Re-pair queue in TV settings; check same branch |
| Wrong service mode copy | Use the correct manifest URL (dine-in vs takeaway vs drive-in) |
| Too many people in queue | Run [demo clear](#clean-demo-state-quick) before presenting |
| Login fails | Re-run demo reset with the same `SEED_DEMO_PASSWORD` |

---

## Reset demo between presentations

### Full reset (restores Bella Vista completely)

Removes and recreates Bella Vista only — **does not** delete other demo businesses or platform admin.

```bash
cd backend
SEED_DEMO_PASSWORD="your-demo-password" CUSTOMER_PORTAL_URL="http://localhost:3001" npm run demo:reset
```

**What this resets:**

- Bella Vista business, branch, users (owner, staff)
- All Bella Vista queues (dine-in, takeaway, drive-in, VIP, reservation)
- QR codes and demo queue history
- `docs/demo/bella-vista-manifest.json` (updated join URLs)

**What this does NOT touch:**

- Cafe Aroma, Bright Smile Dental, or other seeded tenants
- Platform admin (`ops@queueflow.app`)
- Subscription plans and system roles

### Clean demo state (quick)

Clears **active queue entries** only — keeps users, queues, and QR codes. Use between back-to-back demos in the same session.

```bash
cd backend
npm run demo:clear
```

### First-time or broken database

```bash
cd backend
SEED_DEMO_PASSWORD="your-demo-password" CUSTOMER_PORTAL_URL="http://localhost:3001" npm run db:seed
```

---

## Terminology cheat sheet

| | Dine-in | Takeaway | Drive-in |
|--|---------|----------|----------|
| Guest unit | Party | Order | Car / vehicle |
| Waiting | Parties waiting | Orders waiting | Cars waiting |
| Ready | Table ready | Order ready | On the way to your car |
| Staff action | Seat | Collect | Serve |
| Complete | Thanks for dining | Thanks for your order | Thanks — drive safe |

---

## One-command demo checklist

Before the client arrives:

- [ ] Backend running (`npm run dev` in `backend/`)
- [ ] Redis reachable
- [ ] Customer portal running (port 3001)
- [ ] `npm run demo:clear` or `npm run demo:reset` if needed
- [ ] Staff + Owner apps logged in
- [ ] TV paired (optional)
- [ ] Join URLs copied to presenter notes
- [ ] Two phones charged and on Wi‑Fi

**Exact demo start (fresh state):**

```bash
cd backend
SEED_DEMO_PASSWORD="your-password" CUSTOMER_PORTAL_URL="http://localhost:3001" npm run demo:reset
npm run dev
```

Then start customer portal and Flutter apps as above.

---

*Related technical docs: [DEMO_RESTAURANT.md](DEMO_RESTAURANT.md), [PHASE_2F_SERVICE_MODE_E2E.md](archive/PHASE_2F_SERVICE_MODE_E2E.md)*
