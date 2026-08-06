/**
 * Runs Prisma CLI after verifying DATABASE_URL is configured.
 * Usage (via npm scripts): dotenv -e .env.development -e .env.local -- node scripts/prisma-with-preflight.mjs <prisma-args>
 */
import { spawnSync } from 'node:child_process';
import { requireDatabaseUrl } from './require-database-url.mjs';

requireDatabaseUrl();

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/prisma-with-preflight.mjs <prisma-command> [args...]');
  process.exit(1);
}

const result = spawnSync('npx', ['prisma', ...args], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
