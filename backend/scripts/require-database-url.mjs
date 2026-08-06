/**
 * Exits with a actionable message when DATABASE_URL is missing or still a template placeholder.
 * Intended to run *after* dotenv-cli has loaded env files (see package.json scripts).
 */
export function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();

  const placeholder =
    !url ||
    url.includes('CHANGE_ME') ||
    url.includes('YOUR_DB_PASSWORD') ||
    url.includes('PROJECT_REF') ||
    url.includes('YOUR_UPSTASH');

  if (placeholder) {
    console.error(`❌ DATABASE_URL is not configured.

Make sure your .env.local file exists
or configure DATABASE_URL in your deployment environment.

Do not run npx prisma directly.
Use:

  npm run prisma:migrate:deploy

Setup: copy backend/.env.example → backend/.env.local and fill in secrets.
See backend/ENV_SCHEMA.md for details.`);
    process.exit(1);
  }
}
