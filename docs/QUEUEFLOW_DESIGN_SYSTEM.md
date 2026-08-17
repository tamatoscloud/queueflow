# QueueFlow design system

One product language for Customer, Business, Staff, Admin, and TV. Indigo SaaS, not a restaurant microsite and not five unrelated kits.

## Brand

| Token | Value | Use |
| --- | --- | --- |
| Primary | `#6366F1` | Buttons, live accents, focus |
| Primary dark | `#4F46E5` | Pressed / CALL NEXT |
| Primary light | `#818CF8` | Charts, rings |
| Success | `#10B981` | Open, live, complete |
| Warning | `#F59E0B` | Paused, hold |
| Danger | `#EF4444` | Closed, errors, skip |
| Foreground | `#0F172A` | Text |
| Muted | `#64748B` | Labels |
| Border | `#E2E8F0` | Dividers |
| Surface | `#FFFFFF` | Cards |
| Canvas | `#F8FAFC` | Page |

**Called state:** invert — indigo canvas, white type, max contrast. Optional `navigator.vibrate`. Honor `prefers-reduced-motion`.

Deprecate hospitality-only `#8B7CF8` / `#FAF8F5` as the default portal skin. Flutter `calmViolet` maps to primary indigo in new chrome where practical; do not block the demo on a full Flutter token rename.

## Typography

- UI: Geist / system sans (`font-sans`)
- Ticket numbers: display serif or heavy sans, **tabular-nums**, 48–72px on mobile, larger on TV
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64
- Labels: 10–12px uppercase tracking for POS-style section titles (`YOUR NUMBER`)

## Spacing and grid

4px base. Page padding 20px mobile, 32px desktop. Customer column max 28rem. Operator dashboards use 12-column: current | waiting on ≥1024px.

Radius: 8 / 12 / 16 / 24 / pill 999. Shadows: sm/md only — no neon.

## Components

- **Buttons:** primary fill 56px min height (staff 64px). CALL NEXT uses primary dark, full width, icon `campaign`. Secondary outline. Destructive text+border danger.
- **Inputs:** 48px height, visible label, error under field, `autocomplete`.
- **Cards:** white, 1px border, 16px radius, 16px padding.
- **Badges:** Open/Paused/Closed/Live.
- **Tables:** Flutter data rows; portal rarely tables.
- **Dialogs / sheets:** QR sheet, Call next sheet, walk-in. Focus trap + Esc.
- **Nav:** Customer — shell header (business name + Live). Business desktop — side nav with Live Queue first. Staff — bottom or rail, Live Queue only. Admin — side nav. TV — no nav.

## States

- Loading: skeletons matching card layout (not blank).
- Empty: one sentence + primary next step (“Waiting for the first guest”).
- Error: title + recovery (Retry / Ask staff).
- Offline: banner + last known ticket numbers remain visible.
- Success: join confirmation uses the ticket hero, not a toast-only.
- Permission: “You don’t have access to manage this queue.”
- Session expired: Login CTA.

## Icons

Lucide (web) and Material outlined (Flutter). One metaphor: QrCode, Campaign (call), Check (complete).

## Accessibility

WCAG AA contrast on text/buttons. `:focus-visible` 2px primary ring. `aria-live="polite"` for position; `assertive` for CALLED. Reduced motion: no conic spin.

## TV

Black or deep slate, white numbers ≥ 120px, currently serving vs next contrast, 16:9 safe margins.

## Do not

Unsplash venue photos in production UI, fake ratings, restaurant-only copy on generic tenants, five themes, decorative jazz pills without live meaning.
