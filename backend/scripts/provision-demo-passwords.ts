/**
 * One-time / repeatable demo credential provisioning for Bella Vista only.
 *
 * Uses the normal User.passwordHash path (bcrypt). Does not bypass JWT/RBAC,
 * does not create backdoors, and never prints the password.
 *
 * Usage (local with production DATABASE_URL via Railway):
 *   SEED_DEMO_PASSWORD="…" railway run --service queueflow-backend \
 *     npx ts-node --transpile-only scripts/provision-demo-passwords.ts
 *
 * Or with an explicit URL (never commit it):
 *   DATABASE_URL="…" SEED_DEMO_PASSWORD="…" npx ts-node --transpile-only scripts/provision-demo-passwords.ts
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserStatus } from '@prisma/client';

const ALLOWLIST = [
  'owner@bellavista.example.com',
  'manager.dt@bellavista.example.com',
  'staff1.dt@bellavista.example.com',
  'staff2.dt@bellavista.example.com',
] as const;

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error(
      'SEED_DEMO_PASSWORD is required and must be at least 12 characters. ' +
        'It is never written to source control.',
    );
  }

  const hash = await bcrypt.hash(password, 12);
  const updated: string[] = [];

  for (const email of ALLOWLIST) {
    const result = await prisma.user.updateMany({
      where: { email, deletedAt: null },
      data: {
        passwordHash: hash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    if (result.count > 0) {
      updated.push(email);
      await prisma.deviceSession.updateMany({
        where: { user: { email }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  if (updated.length === 0) {
    throw new Error(
      'No Bella Vista allowlisted users found. Confirm production has the demo tenant.',
    );
  }

  console.log(`Updated password hashes for ${updated.length} demo account(s):`);
  for (const email of updated) {
    console.log(`  - ${email}`);
  }
  console.log(
    'Password itself was not printed. Retrieve SEED_DEMO_PASSWORD from your secure operator store / Railway variable.',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
