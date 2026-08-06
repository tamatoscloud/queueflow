/**
 * Connectivity probe — run: npm run db:check
 * Reads DATABASE_URL from the environment; does not print credentials.
 */
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('FAIL: DATABASE_URL is not set');
    process.exit(1);
  }

  const prisma = new PrismaClient({ log: [] });
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    console.log('OK: database connection succeeded');
  } catch (err) {
    console.log('FAIL:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
