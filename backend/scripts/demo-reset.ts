/**
 * Reset Bella Vista demo tenant only — does not delete other businesses or platform admin.
 *
 * Usage:
 *   SEED_DEMO_PASSWORD="your-password" npm run demo:reset
 *   SEED_DEMO_PASSWORD="your-password" npm run demo:clear   # active queue entries only
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import {
  clearBellaVistaActiveEntries,
  resetBellaVistaDemo,
} from '../prisma/seed-restaurant-demo';

const prisma = new PrismaClient();
const mode = process.argv[2] ?? 'reset';

async function main() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password) {
    throw new Error(
      'SEED_DEMO_PASSWORD is required. Example: SEED_DEMO_PASSWORD="your-local-password" npm run demo:reset',
    );
  }

  if (mode === 'clear') {
    const cleared = await clearBellaVistaActiveEntries(prisma);
    console.log(`Cleared ${cleared} Bella Vista queue entries (queues, users, and QR codes unchanged).`);
    return;
  }

  if (mode !== 'reset') {
    throw new Error(`Unknown mode "${mode}". Use "reset" (default) or "clear".`);
  }

  console.log('Resetting Bella Vista demo tenant...');
  const manifest = await resetBellaVistaDemo({
    prisma,
    passwordHash: await bcrypt.hash(password, 12),
    portalBaseUrl: process.env.CUSTOMER_PORTAL_URL,
  });
  console.log('Bella Vista demo reset complete.');
  console.log(`  Business: ${manifest.business.name}`);
  console.log(`  Dine-in queue: ${manifest.serviceModes.DINE_IN.joinUrl}`);
  console.log(`  Takeaway queue: ${manifest.serviceModes.TAKEAWAY.joinUrl}`);
  console.log(`  Drive-in queue: ${manifest.serviceModes.DRIVE_IN.joinUrl}`);
  console.log(`  Manifest: docs/demo/bella-vista-manifest.json`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
