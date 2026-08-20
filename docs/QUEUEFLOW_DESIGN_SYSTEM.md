# QueueFlow design system

One product language for Customer, Business, Staff, Admin, and TV. Indigo SaaS for restaurants and guest-facing businesses — not a clinic product and not five unrelated kits.

## Brand

| Token | Value | Use |
| --- | --- | --- |
| Primary | `#6366F1` | Buttons, live accents, focus |
| Primary dark | `#4F46E5` | Pressed / CALL NEXT / COMPLETE |
| Primary light | `#818CF8` | Charts, rings |
| Success | `#10B981` | Open, live, complete |
| Warning | `#F59E0B` | Paused, hold |
| Danger | `#EF4444` | Closed, errors, skip, cancel |
| Foreground | `#0F172A` | Text |
| Muted | `#64748B` | Labels |
| Border | `#E2E8F0` | Dividers |
| Surface | `#FFFFFF` | Cards |
| Canvas | `#F8FAFC` | Page |

### Queue status semantics

| Status | Color role | Notes |
| --- | --- | --- |
| Waiting | Primary | Guest in line |
| Called | Primary dark | Interrupt — full indigo canvas on customer phone |
| Completed | Success | Served |
| Cancelled / No-show / Skipped | Danger | Secondary confirmations |
| Holding / Paused | Warning | Temporary |

**Called state:** invert — indigo canvas, white type, max contrast. Optional `navigator.vibrate`. Honor `prefers-reduced-motion`.

Customer journey uses forced light `.booking-light`. Flutter `calmViolet` may remain in legacy calm widgets; new chrome uses primary indigo.

## Typography

- UI: Geist / system sans (`font-sans`); Flutter Inter via theme
- Ticket numbers: heavy sans, **tabular-nums**, 48–72px on mobile, ≥120px on TV
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64
- Labels: 10–12px uppercase tracking for POS-style section titles (`YOUR NUMBER`, `NOW SERVING`)

## Spacing and grid

4px base. Page padding 20px mobile, 32px desktop. Customer column max 28rem. Operator dashboards use 12-column: current | waiting on ≥1024px.

Radius: 8 / 12 / 16 / 24 / pill 999. Shadows: sm/md only — no neon.

## Touch targets (Staff)

| Size | Min height | Use |
| --- | --- | --- |
| md | 48px | Forms |
| lg | 56px | Standard primary |
| xl | **80px** | CALL NEXT / COMPLETE on tablets & kiosks |

Prefer one obvious primary CTA per screen. Secondary = outline. Destructive = danger with confirm.

## Components

- **Buttons:** primary fill; CALL NEXT uses primary dark, full width, icon `campaign`.
- **Inputs:** 48px height, visible label, error under field.
- **Cards:** white, 1px border, 16px radius, 16px padding.
- **Badges:** Open / Paused / Closed / Live / Waiting / Called.
- **Empty / Error:** one sentence + primary recovery (`EmptyStateView`, `PageError`).
- **Nav:** Customer — shell header. Business — side nav (Home, Queues, **QR**, …). Staff — Live Queue first; minimize chrome on floor. Admin — side nav. TV — no nav.

## States

- Loading: skeletons (not blank).
- Empty: one sentence + next step (“Waiting for the first guest”).
- Error: title + Retry.
- Offline / reconnecting: soft “Updating…” — never alarming socket jargon for guests.
- Session expired: Login CTA.

## Icons

Lucide (web) and Material outlined (Flutter). Metaphors: QrCode, Campaign (call), Check (complete).

## Accessibility

WCAG AA contrast. `:focus-visible` 2px primary ring. `aria-live="polite"` for position; `assertive` for CALLED. Reduced motion: no decorative spin.

## TV

Deep slate / black, white numbers ≥ 120px, currently serving vs waiting contrast, 16:9 safe margins.

## Copy voice

Restaurant-first: guests, parties, counters, queues — not patients, clinics, or appointments as the lead metaphor.

## Do not

Unsplash venue photos in production UI, fake ratings, five themes, hover-only actions on staff surfaces, equal visual weight for five CTAs on one screen.
