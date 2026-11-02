/**
 * Production setup for a fresh database — no demo data.
 *
 * Reads newline-delimited JSON records on stdin (written by
 * scripts/setup-production.sh, which prompts for every value; passwords are
 * typed hidden and never printed or passed on the command line):
 *   {"type":"admin","email","password"}                       (optional)
 *   {"type":"business","name","slug","email","phone","timezone","plan",
 *    "branchName","branchCode","city","country","openTime","closeTime"}
 *   {"type":"owner","fullName","email","password"}
 *   {"type":"staff","fullName","email","password","role":"STAFF"|"MANAGER"}  (0..n)
 *
 * Always ensures the role/permission/plan catalog. Everything else is created
 * in one transaction, so a failure leaves the database unchanged.
 */
import {
  BillingCycle,
  PrismaClient,
  SubscriptionStatus,
  UserStatus,
  Weekday,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { ensureCatalog, PLATFORM_ROLE_NAME } from './catalog';

type Rec = Record<string, string | undefined> & { type: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BRANCH_CODE = /^[A-Z0-9_-]{2,20}$/;
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TIMEZONES = ['Asia/Karachi', 'Asia/Dubai', 'Europe/London', 'America/New_York'];

const prisma = new PrismaClient();

function fail(message: string): never {
  throw new Error(message);
}

function req(r: Rec, key: string): string {
  const v = r[key]?.trim();
  if (!v) fail(`Missing ${key} for ${r.type}.`);
  return v;
}

function email(r: Rec): string {
  const v = req(r, 'email').toLowerCase();
  if (!EMAIL.test(v)) fail(`Invalid email for ${r.type}: ${v}`);
  return v;
}

function password(r: Rec): string {
  const v = r.password ?? '';
  if (v.length < 12) fail(`Password for ${r.type} must be at least 12 characters.`);
  return v;
}

function time(v: string): Date {
  const m = HHMM.exec(v) ?? fail(`Invalid time ${v}; use HH:MM (24h).`);
  return new Date(Date.UTC(1970, 0, 1, Number(m[1]), Number(m[2]), 0));
}

async function readStdin(): Promise<Rec[]> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks)
    .toString('utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Rec);
}

async function main(): Promise<void> {
  const records = await readStdin();
  const admin = records.find((r) => r.type === 'admin');
  const biz = records.find((r) => r.type === 'business') ?? fail('No business record.');
  const owner = records.find((r) => r.type === 'owner') ?? fail('No owner record.');
  const staff = records.filter((r) => r.type === 'staff');

  // ---- Validate everything before writing anything ------------------------
  const slug = req(biz, 'slug');
  if (!SLUG.test(slug)) fail(`Invalid slug "${slug}" (lowercase letters, numbers, dashes).`);
  const branchCode = req(biz, 'branchCode').toUpperCase();
  if (!BRANCH_CODE.test(branchCode)) fail(`Invalid location code "${branchCode}" (2-20 of A-Z 0-9 _ -).`);
  const timezone = req(biz, 'timezone');
  if (!TIMEZONES.includes(timezone)) fail(`Timezone must be one of: ${TIMEZONES.join(', ')}`);
  const openTime = time(req(biz, 'openTime'));
  const closeTime = time(req(biz, 'closeTime'));
  if (closeTime <= openTime) fail('Closing time must be after opening time.');
  const plan = (biz.plan?.trim() || 'scale').toLowerCase();
  const businessEmail = email(biz);

  const people = [
    ...(admin ? [{ rec: admin, label: 'admin' }] : []),
    { rec: owner, label: 'owner' },
    ...staff.map((s, i) => ({ rec: s, label: `staff #${i + 1}` })),
  ].map(({ rec, label }) => ({
    label,
    email: email(rec),
    password: password(rec),
    fullName: rec.type === 'admin' ? 'Quyk Platform Admin' : req(rec, 'fullName'),
    role: rec.type === 'staff' ? (rec.role?.toUpperCase() === 'MANAGER' ? 'MANAGER' : 'STAFF') : rec.type,
  }));
  const emails = people.map((p) => p.email);
  const dup = emails.find((e, i) => emails.indexOf(e) !== i);
  if (dup) fail(`The email ${dup} is used twice; every login needs its own email.`);

  // ---- Catalog (idempotent) ----------------------------------------------
  const { roleIdByName, planIdBySlug } = await ensureCatalog(prisma);
  const planId = planIdBySlug.get(plan) ?? fail(`Unknown plan "${plan}" (starter, growth, scale).`);

  const taken = await prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true, businessId: true } });
  const adminTaken = admin && taken.some((t) => t.email === emails[0] && t.businessId === null);
  const clash = taken.filter((t) => !(adminTaken && t.email === emails[0] && t.businessId === null));
  if (clash.length) fail(`Already in use: ${clash.map((t) => t.email).join(', ')}. Nothing was changed.`);
  if (await prisma.business.findFirst({ where: { OR: [{ slug }, { email: businessEmail }] } })) {
    fail(`A business with slug "${slug}" or email ${businessEmail} already exists. Nothing was changed.`);
  }

  const hashed = await Promise.all(people.map((p) => bcrypt.hash(p.password, 12)));
  const now = new Date();
  const yearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    for (const [i, p] of people.entries()) {
      if (p.role !== 'admin') continue;
      if (adminTaken) {
        console.log('Admin login already exists — kept as is (password unchanged).');
        continue;
      }
      const u = await tx.user.create({
        data: {
          businessId: null,
          email: p.email,
          fullName: p.fullName,
          passwordHash: hashed[i]!,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: now,
        },
      });
      await tx.userRole.create({
        data: { userId: u.id, roleId: roleIdByName.get(PLATFORM_ROLE_NAME)!, businessId: null },
      });
    }

    const business = await tx.business.create({
      data: {
        name: req(biz, 'name'),
        slug,
        email: businessEmail,
        phone: biz.phone?.trim() || null,
        status: 'ACTIVE',
        timezone,
      },
    });
    await tx.businessSettings.create({ data: { businessId: business.id } });
    await tx.subscription.create({
      data: {
        businessId: business.id,
        planId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.YEARLY,
        currentPeriodStart: now,
        currentPeriodEnd: yearLater,
      },
    });

    const branch = await tx.branch.create({
      data: {
        businessId: business.id,
        name: req(biz, 'branchName'),
        code: branchCode,
        city: biz.city?.trim() || null,
        country: biz.country?.trim() || null,
        timezone,
      },
    });
    await tx.branchSettings.create({ data: { branchId: branch.id } });
    await tx.workingHours.createMany({
      data: Object.values(Weekday).map((dayOfWeek) => ({ branchId: branch.id, dayOfWeek, openTime, closeTime })),
    });

    for (const [i, p] of people.entries()) {
      if (p.role === 'admin') continue;
      const u = await tx.user.create({
        data: {
          businessId: business.id,
          email: p.email,
          fullName: p.fullName,
          passwordHash: hashed[i]!,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: now,
        },
      });
      const roleName = p.role === 'owner' ? 'OWNER' : p.role;
      await tx.userRole.create({
        data: { userId: u.id, roleId: roleIdByName.get(roleName)!, businessId: business.id },
      });
      await tx.userBranch.create({ data: { userId: u.id, branchId: branch.id, isPrimary: true } });
    }
  });

  console.log('');
  console.log('SETUP_OK — logins created (passwords are the ones you typed):');
  for (const p of people) {
    const where =
      p.role === 'admin' ? 'https://admin.quyk.io' : p.role === 'owner' ? 'https://business.quyk.io' : 'https://staff.quyk.io';
    const role = p.role === 'admin' ? 'Platform admin' : p.role === 'owner' ? 'Owner' : p.role === 'MANAGER' ? 'Manager' : 'Staff';
    console.log(`  ${role.padEnd(15)} ${p.email.padEnd(36)} ${where}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(`SETUP_FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
