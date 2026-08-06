# TV Display — Configuration Guide

## Environment

Copy `.env.dev` and set:

| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | Backend REST base (`http://localhost:3000/api/v1`) |
| `WS_BASE_URL` | Socket.IO host (`http://localhost:3000`) |

## Staff configuration (recommended first-time setup)

1. Open the app → **Staff configuration**
2. Sign in as **Business Owner** or **Manager**
3. Select **Branch** and **Queue**
4. Choose display mode and options
5. Tap **Save & start display**

The app generates an 8-character **display token** and stores the full configuration locally.

## Public mode (no login)

Use when the TV is already configured, or to pair with a Queue ID:

| Input | Example |
|-------|---------|
| Display token | `ABCD1234` (from staff setup on this device) |
| Queue ID | Full UUID from staff setup screen |

On success, the display connects to Socket.IO room `queue:{queueId}:display`.

## Display settings (runtime)

Tap the ⚙ icon on the display screen:

- Show customer names / tokens only
- Dark mode
- Font scale (0.8–1.6×)
- Sound on call
- Refresh interval (HTTP fallback polling)
- Fullscreen
- Unpair display

## Supported Socket.IO events

`CustomerCalled`, `CustomerCompleted`, `CustomerSkipped`, `QueuePaused`, `QueueResumed`, `QueueClosed`, `EstimatedWaitChanged`, `QueueUpdated`

## TV sizes

Layouts use responsive `fontScale` and flex layouts for 32″–65″ and 4K. Increase font scale in settings for distant viewing.
