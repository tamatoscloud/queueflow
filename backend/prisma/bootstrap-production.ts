/**
 * Production bootstrap for an empty database — no demo data.
 *
 * Creates (idempotently) the built-in permissions, system roles and
 * subscription plans, plus ONE platform-admin login. Businesses, owners and
 * staff are then created from the admin panel.
 *
 * Credentials come from the environment and are never printed:
 *   BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD (>= 12 chars)
 * On the VPS use scripts/bootstrap-production.sh, which prompts for them.
 */
import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import {
  PERMISSIONS,
  PLATFORM_ROLE_NAME,
  ROLE_PERMISSIONS,
  SUBSCRIPTION_PLANS,
  SYSTEM_ROLE_NAMES,
} from './catalog';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '';
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
  }
  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
  }

  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { category: p.category, description: p.description },
      create: p,
    });
  }
  const permissionIdByKey = new Map(
    (await prisma.permission.findMany()).map((p) => [p.key, p.id]),
  );

  const roleIdByName = new Map<string, string>();
  for (const name of [...SYSTEM_ROLE_NAMES, PLATFORM_ROLE_NAME]) {
    const existing = await prisma.role.findFirst({ where: { name, businessId: null, isSystem: true } });
    const role =
      existing ??
      (await prisma.role.create({
        data: {
          name,
          isSystem: true,
          description: name === PLATFORM_ROLE_NAME ? 'QueueFlow platform operations' : `Built-in ${name} role`,
        },
      }));
    roleIdByName.set(name, role.id);
    const keys = ROLE_PERMISSIONS[name] ?? [];
    await prisma.rolePermission.createMany({
      data: keys
        .map((key) => permissionIdByKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }

  for (const plan of SUBSCRIPTION_PLANS) {
    // Existing plans are left as-is so price edits made later are not overwritten.
    await prisma.subscriptionPlan.upsert({ where: { slug: plan.slug }, update: {}, create: plan });
  }

  const existingAdmin = await prisma.user.findFirst({ where: { email, businessId: null } });
  if (existingAdmin) {
    console.log('Platform admin already exists for that email — password left unchanged.');
  } else {
    const admin = await prisma.user.create({
      data: {
        businessId: null,
        email,
        fullName: 'Quyk Platform Admin',
        passwordHash: await bcrypt.hash(password, 12),
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.userRole.create({
      data: { userId: admin.id, roleId: roleIdByName.get(PLATFORM_ROLE_NAME)!, businessId: null },
    });
    console.log('Platform admin created.');
  }

  const [permissions, roles, plans, users] = await Promise.all([
    prisma.permission.count(),
    prisma.role.count({ where: { businessId: null } }),
    prisma.subscriptionPlan.count(),
    prisma.user.count(),
  ]);
  console.log(`BOOTSTRAP_OK permissions=${permissions} systemRoles=${roles} plans=${plans} users=${users}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
