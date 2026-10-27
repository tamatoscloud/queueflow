# Sprint 12 — Premium Customer Experience (Phase 2B)

Customer portal only. No backend, API, auth, realtime, or notification changes.

## Shared components (`src/components/customer/`)

| Component | Purpose |
|-----------|---------|
| `primitives.tsx` | `GlassCard`, `FloatingParticles`, `StepProgress` |
| `premium-states.tsx` | `PremiumEmpty`, `PremiumError`, `RatingStars` |
| `busy-meter.tsx` | Visual busy level from waiting count |
| `restaurant-landing.tsx` | Full QR landing experience |
| `join-wizard.tsx` | 5-step join flow (name → phone → party → alerts → notes) |
| `success-celebration.tsx` | Post-join reward screen with wallet pass |
| `table-ready.tsx` | Full-screen celebration + vibration + hold timer |
| `queue-ended.tsx` | Cancelled / expired / no-show recovery |
| `feedback-experience.tsx` | Emoji + stars + quick chips + coupon thank-you |
| `visit-completed.tsx` | Thank-you summary + rebook + Google review CTA |

## Demo content (`src/lib/demo/restaurant-content.ts`)

Specials, dishes, reviews, hours, address, smart wait messages, busy levels.

## Pages redesigned

| Route | Experience |
|-------|------------|
| `/q/[queueId]` | Hero, ratings, busy meter, specials carousel, menu, reviews, hours, join CTA |
| `/q/[queueId]/join` | Step wizard, large touch targets, progressive disclosure |
| `/q/[queueId]/success` | Confetti, wallet pass, share, add-to-home, menu tips |
| `/track/[entryId]` | Waiting experience OR table-ready OR ended states |
| `/completed/[entryId]` | Visit summary, timeline, feedback CTA |
| `/feedback/[entryId]` | Premium feedback with emojis and chips |
| `/offline` | Premium offline empty state |

## Waiting experience enhancements

- Smart contextual messages (`smartWaitMessage`)
- Queue-ahead dot animation
- Live connection states (connected / reconnecting / offline)
- Menu upsells and tips
- Table ready → dedicated full-screen with confetti + `navigator.vibrate`

## Microinteractions (`globals.css`)

- Button active scale
- Confetti, float blobs, noise texture
- Slide-in step transitions
- Glass cards with hover lift

## Try it

```bash
cd apps/customer-portal && npm run dev
# http://localhost:3001/q/<queue-id>
```

Bella Vista demo queue ID in `docs/DEMO_RESTAURANT.md`.
