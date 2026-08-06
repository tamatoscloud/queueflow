# Docker (deprecated)

QueueFlow **does not use Docker** for local development or deployment.

## Managed services instead

| Concern | Service |
|---------|---------|
| PostgreSQL | [Supabase](https://supabase.com) |
| Redis / BullMQ | [Upstash](https://upstash.com) |
| Backend API | Node.js host (Railway, Fly.io, Render, etc.) |
| Customer portal | Vercel / static host |
| Flutter web apps | Firebase Hosting, Cloudflare Pages, S3+CloudFront |
| CI/CD | GitHub Actions (see `.github/workflows/ci.yml`) |

## Legacy files

The `docker-compose.yml` and `Dockerfile.example` in this folder are **archived references only** and are not maintained. Do not use them for new environments.

See [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) for the current deployment guide.
