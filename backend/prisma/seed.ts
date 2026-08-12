/**
 * QueueFlow — seed data.
 *
 * Populates enough realistic, cross-referenced data to exercise every
 * model and every QueueEntry/Notification/Subscription status. Run with
 * `npm run db:seed` (wraps `prisma db seed`).
 *
 * Deliberately NOT idempotent by upsert-everything — it's a fresh-database
 * seed for local development, and clears its own data first (see
 * `resetDemoData`) so it can be re-run against a dev database repeatedly.
 *
 * NOTE: passwordHash / refreshTokenHash values below are inert placeholder
 * strings, not real bcrypt/argon2 hashes — no hashing library is a
 * dependency of this package yet, since there is no auth implementation
 * to hash for (see backend/README.md). Never treat these as real
 * credentials.
 */
import { faker } from '@faker-js/faker';
import {
  BillingCycle,
  DevicePlatform,
  FeedbackStatus,
  NotificationChannel,
  NotificationLogStatus,
  NotificationPreference,
  NotificationProvider,
  NotificationStatus,
  NotificationType,
  PrismaClient,
  QueueEntrySource,
  QueueEntryStatus,
  QueueStatus,
  QueueTokenStatus,
  StaffInvitationStatus,
  SubscriptionStatus,
  UserStatus,
  Weekday,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedBellaVistaRestaurant, writeRestaurantDemoManifest } from './seed-restaurant-demo';

const prisma = new PrismaClient();

faker.seed(20260717);

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD;
if (!DEMO_PASSWORD) {
  throw new Error(
    'SEED_DEMO_PASSWORD is required to run db:seed. ' +
      'Set a strong password in your shell — never commit it. ' +
      'Example: SEED_DEMO_PASSWORD="your-local-only-password" npm run db:seed',
  );
}
const demoPassword: string = DEMO_PASSWORD;
let passwordHashPromise: Promise<string> | null = null;
async function demoPasswordHash(): Promise<string> {
  passwordHashPromise ??= bcrypt.hash(demoPassword, 12);
  return passwordHashPromise;
}

const SYSTEM_ROLE_NAMES = ['OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF', 'VIEWER'] as const;
const PLATFORM_ROLE_NAME = 'PLATFORM_ADMIN';

const PERMISSIONS: Array<{ key: string; category: string; description: string }> = [
  { key: 'business:manage', category: 'BUSINESS', description: 'Manage business profile and branding' },
  { key: 'branch:manage', category: 'BRANCH', description: 'Create, edit, and archive branches' },
  { key: 'staff:invite', category: 'STAFF', description: 'Invite and manage staff accounts' },
  { key: 'staff:manage_roles', category: 'STAFF', description: 'Assign roles and branch access to staff' },
  { key: 'queue:manage', category: 'QUEUE', description: 'Create, edit, pause, and close queues' },
  { key: 'queue:operate', category: 'QUEUE', description: 'Call, hold, skip, and complete queue entries' },
  { key: 'customer:view', category: 'CUSTOMER', description: 'View customer records and history' },
  { key: 'reports:view', category: 'REPORTS', description: 'View analytics and reporting dashboards' },
  { key: 'billing:manage', category: 'BILLING', description: 'Manage subscription and billing' },
  { key: 'settings:manage', category: 'SETTINGS', description: 'Manage business and branch settings' },
  { key: 'notifications:view', category: 'NOTIFICATIONS', description: 'View notifications and delivery logs' },
  { key: 'platform:manage_tenants', category: 'PLATFORM', description: 'Manage any business tenant (platform admin only)' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: PERMISSIONS.filter((p) => p.category !== 'PLATFORM').map((p) => p.key),
  MANAGER: ['branch:manage', 'staff:invite', 'staff:manage_roles', 'queue:manage', 'queue:operate', 'customer:view', 'reports:view', 'settings:manage', 'notifications:view'],
  RECEPTIONIST: ['queue:operate', 'customer:view', 'notifications:view'],
  STAFF: ['queue:operate', 'customer:view'],
  VIEWER: ['reports:view', 'customer:view', 'notifications:view'],
  PLATFORM_ADMIN: ['platform:manage_tenants'],
};

const SUBSCRIPTION_PLANS = [
  {
    name: 'Starter',
    slug: 'starter',
    priceMonthly: '0.00',
    priceYearly: '0.00',
    maxBranches: 1,
    maxStaff: 3,
    maxQueuesPerBranch: 2,
    maxActiveEntriesPerQueue: 50,
    featureFlags: { customBranding: false, whatsappNotifications: false },
    sortOrder: 0,
  },
  {
    name: 'Growth',
    slug: 'growth',
    priceMonthly: '29.00',
    priceYearly: '290.00',
    maxBranches: 5,
    maxStaff: 25,
    maxQueuesPerBranch: 10,
    maxActiveEntriesPerQueue: 300,
    featureFlags: { customBranding: true, whatsappNotifications: true },
    sortOrder: 1,
  },
  {
    name: 'Scale',
    slug: 'scale',
    priceMonthly: '99.00',
    priceYearly: '990.00',
    maxBranches: null,
    maxStaff: null,
    maxQueuesPerBranch: null,
    maxActiveEntriesPerQueue: null,
    featureFlags: { customBranding: true, whatsappNotifications: true, prioritySupport: true },
    sortOrder: 2,
  },
];

/** Minute-of-day helper so working-hours rows use a plain DATE-agnostic time. */
function timeOfDay(hour: number, minute = 0): Date {
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
}

function displayCode(prefix: string, tokenNumber: number): string {
  return `${prefix}-${String(tokenNumber).padStart(3, '0')}`;
}

/** Clears every table this seed owns, in FK-safe (child-first) order. */
async function resetDemoData(): Promise<void> {
  await prisma.notificationLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.queueToken.deleteMany();
  await prisma.qRCode.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.staffInvitation.deleteMany();
  await prisma.deviceSession.deleteMany();
  await prisma.authToken.deleteMany();
  await prisma.userBranch.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.branchSettings.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.businessSettings.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
}

async function seedCatalog() {
  const permissions = await Promise.all(
    PERMISSIONS.map((p) => prisma.permission.create({ data: p })),
  );
  const permissionByKey = new Map(permissions.map((p) => [p.key, p]));

  const systemRoles = await Promise.all(
    SYSTEM_ROLE_NAMES.map((name) =>
      prisma.role.create({
        data: { name, isSystem: true, description: `Built-in ${name} role` },
      }),
    ),
  );
  const platformRole = await prisma.role.create({
    data: { name: PLATFORM_ROLE_NAME, isSystem: true, description: 'QueueFlow platform operations' },
  });

  const allRoles = [...systemRoles, platformRole];
  for (const role of allRoles) {
    const keys = ROLE_PERMISSIONS[role.name] ?? [];
    await Promise.all(
      keys.map((key) => {
        const permission = permissionByKey.get(key);
        if (!permission) return Promise.resolve();
        return prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: permission.id },
        });
      }),
    );
  }

  const plans = await Promise.all(
    SUBSCRIPTION_PLANS.map((plan) => prisma.subscriptionPlan.create({ data: plan })),
  );

  return {
    roleByName: new Map(allRoles.map((r) => [r.name, r])),
    planBySlug: new Map(plans.map((p) => [p.slug, p])),
  };
}

async function seedPlatformAdmin(platformRoleId: string) {
  const hash = await demoPasswordHash();
  const admin = await prisma.user.create({
    data: {
      businessId: null,
      email: 'ops@queueflow.app',
      fullName: 'QueueFlow Platform Ops',
      passwordHash: hash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.userRole.create({ data: { userId: admin.id, roleId: platformRoleId, businessId: null } });
  return admin;
}

interface SeedBusinessOptions {
  name: string;
  slug: string;
  email: string;
  branches: Array<{ name: string; code: string; city: string }>;
  planId: string;
  roleByName: Map<string, { id: string }>;
}

/**
 * Builds one fully-populated tenant: business, branches, staff, queues,
 * customers, and a spread of queue entries across every QueueEntryStatus.
 */
async function seedBusiness(opts: SeedBusinessOptions) {
  const hash = await demoPasswordHash();
  const business = await prisma.business.create({
    data: {
      name: opts.name,
      slug: opts.slug,
      email: opts.email,
      phone: faker.phone.number(),
      status: 'ACTIVE',
      timezone: 'Asia/Karachi',
    },
  });

  await prisma.businessSettings.create({
    data: {
      businessId: business.id,
      defaultNotificationChannel: NotificationPreference.BOTH,
      brandColor: faker.internet.color(),
    },
  });

  await prisma.subscription.create({
    data: {
      businessId: business.id,
      planId: opts.planId,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
      currentPeriodStart: faker.date.recent({ days: 15 }),
      currentPeriodEnd: faker.date.soon({ days: 15 }),
    },
  });

  // --- Staff -----------------------------------------------------------
  const owner = await prisma.user.create({
    data: {
      businessId: business.id,
      email: `owner@${opts.slug}.example.com`,
      fullName: faker.person.fullName(),
      passwordHash: hash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      lastLoginAt: faker.date.recent({ days: 2 }),
    },
  });
  await prisma.userRole.create({
    data: { userId: owner.id, roleId: opts.roleByName.get('OWNER')!.id, businessId: business.id },
  });
  await prisma.deviceSession.create({
    data: {
      userId: owner.id,
      deviceId: faker.string.uuid(),
      deviceName: 'Owner iPhone',
      platform: DevicePlatform.IOS,
      pushToken: faker.string.alphanumeric(64),
      refreshTokenHash: hash,
      expiresAt: faker.date.soon({ days: 30 }),
    },
  });

  const managerRoleId = opts.roleByName.get('MANAGER')!.id;
  const staffRoleId = opts.roleByName.get('STAFF')!.id;

  // --- Branches ----------------------------------------------------------
  const branches = [];
  for (const b of opts.branches) {
    const branch = await prisma.branch.create({
      data: {
        businessId: business.id,
        name: b.name,
        code: b.code,
        city: b.city,
        country: 'Pakistan',
        phone: faker.phone.number(),
        email: faker.internet.email().toLowerCase(),
      },
    });

    await prisma.branchSettings.create({ data: { branchId: branch.id } });

    for (const day of Object.values(Weekday)) {
      const isWeekend = day === Weekday.SATURDAY || day === Weekday.SUNDAY;
      await prisma.workingHours.create({
        data: {
          branchId: branch.id,
          dayOfWeek: day,
          openTime: timeOfDay(isWeekend ? 11 : 9),
          closeTime: timeOfDay(isWeekend ? 23 : 21),
        },
      });
    }

    await prisma.holiday.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        date: faker.date.soon({ days: 60 }),
        name: 'Public Holiday',
        isClosed: true,
      },
    });

    const manager = await prisma.user.create({
      data: {
        businessId: business.id,
        email: `manager.${branch.code.toLowerCase()}@${opts.slug}.example.com`,
        fullName: faker.person.fullName(),
        passwordHash: hash,
        status: UserStatus.ACTIVE,
      },
    });
    await prisma.userRole.create({ data: { userId: manager.id, roleId: managerRoleId, businessId: business.id } });
    await prisma.userBranch.create({ data: { userId: manager.id, branchId: branch.id, isPrimary: true } });

    const staffUsers = await Promise.all(
      Array.from({ length: 2 }).map(async (_, i) => {
        const staff = await prisma.user.create({
          data: {
            businessId: business.id,
            email: `staff${i + 1}.${branch.code.toLowerCase()}@${opts.slug}.example.com`,
            fullName: faker.person.fullName(),
            passwordHash: hash,
            status: UserStatus.ACTIVE,
          },
        });
        await prisma.userRole.create({ data: { userId: staff.id, roleId: staffRoleId, businessId: business.id } });
        await prisma.userBranch.create({ data: { userId: staff.id, branchId: branch.id, isPrimary: true } });
        return staff;
      }),
    );

    branches.push({ branch, manager, staffUsers });
  }

  await prisma.staffInvitation.create({
    data: {
      businessId: business.id,
      branchId: branches[0]!.branch.id,
      roleId: staffRoleId,
      email: faker.internet.email().toLowerCase(),
      token: faker.string.alphanumeric(32),
      status: StaffInvitationStatus.PENDING,
      expiresAt: faker.date.soon({ days: 7 }),
      invitedByUserId: owner.id,
    },
  });

  // --- Customers -----------------------------------------------------------
  const customers = await Promise.all(
    Array.from({ length: 10 }).map(() =>
      prisma.customer.create({
        data: {
          businessId: business.id,
          fullName: faker.person.fullName(),
          phone: faker.phone.number(),
          email: faker.datatype.boolean() ? faker.internet.email().toLowerCase() : null,
          totalVisits: faker.number.int({ min: 0, max: 12 }),
          lastVisitAt: faker.date.recent({ days: 30 }),
        },
      }),
    ),
  );

  // --- Queues, tokens, entries ----------------------------------------------
  const entryStatuses: QueueEntryStatus[] = [
    QueueEntryStatus.WAITING,
    QueueEntryStatus.WAITING,
    QueueEntryStatus.CALLED,
    QueueEntryStatus.HOLDING,
    QueueEntryStatus.SKIPPED,
    QueueEntryStatus.COMPLETED,
    QueueEntryStatus.COMPLETED,
    QueueEntryStatus.CANCELLED,
    QueueEntryStatus.NO_SHOW,
  ];

  let customerCursor = 0;
  const nextCustomer = () => customers[customerCursor++ % customers.length]!;

  for (const { branch, manager, staffUsers } of branches) {
    const queueDefs = [
      { name: 'Walk-in Seating', prefix: 'A' },
      { name: 'Takeaway Orders', prefix: 'T' },
    ];

    for (const def of queueDefs) {
      const queue = await prisma.queue.create({
        data: {
          businessId: business.id,
          branchId: branch.id,
          name: def.name,
          prefix: def.prefix,
          averageServiceTimeMinutes: faker.number.int({ min: 5, max: 20 }),
        },
      });

      await prisma.qRCode.create({
        data: {
          businessId: business.id,
          branchId: branch.id,
          queueId: queue.id,
          code: `${def.prefix}-${branch.code}-${faker.string.alphanumeric(6).toUpperCase()}`,
          targetUrl: `${process.env.CUSTOMER_PORTAL_URL ?? 'http://localhost:3001'}/q/${queue.id}`,
          isActive: true,
          scansCount: faker.number.int({ min: 0, max: 200 }),
        },
      });

      const issuedDate = new Date();
      issuedDate.setUTCHours(0, 0, 0, 0);

      let tokenNumber = 0;
      for (const status of entryStatuses) {
        tokenNumber += 1;
        const customer = nextCustomer();

        const token = await prisma.queueToken.create({
          data: {
            queueId: queue.id,
            tokenNumber,
            displayCode: displayCode(def.prefix, tokenNumber),
            issuedDate,
            status: status === QueueEntryStatus.CANCELLED ? QueueTokenStatus.VOID : QueueTokenStatus.ISSUED,
          },
        });

        const joinedAt = faker.date.recent({ days: 1 });
        const terminalStatuses: QueueEntryStatus[] = [
          QueueEntryStatus.COMPLETED,
          QueueEntryStatus.CANCELLED,
          QueueEntryStatus.NO_SHOW,
        ];
        const isTerminal = terminalStatuses.includes(status);

        const entry = await prisma.queueEntry.create({
          data: {
            businessId: business.id,
            branchId: branch.id,
            queueId: queue.id,
            customerId: customer.id,
            queueTokenId: token.id,
            status,
            source: faker.helpers.arrayElement([
              QueueEntrySource.QR_LANDING,
              QueueEntrySource.QR_LANDING,
              QueueEntrySource.STAFF_MANUAL,
              QueueEntrySource.WALK_IN,
            ]),
            partySize: faker.number.int({ min: 1, max: 6 }),
            notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
            notificationPreference: faker.helpers.arrayElement([
              NotificationPreference.WHATSAPP,
              NotificationPreference.SMS,
              NotificationPreference.BOTH,
            ]),
            joinedAt,
            calledAt: status === QueueEntryStatus.WAITING ? null : faker.date.soon({ days: 1, refDate: joinedAt }),
            servedAt: status === QueueEntryStatus.COMPLETED ? faker.date.soon({ days: 1, refDate: joinedAt }) : null,
            cancelledAt: status === QueueEntryStatus.CANCELLED ? faker.date.soon({ days: 1, refDate: joinedAt }) : null,
            noShowAt: status === QueueEntryStatus.NO_SHOW ? faker.date.soon({ days: 1, refDate: joinedAt }) : null,
            estimatedWaitMinutes: faker.number.int({ min: 5, max: 45 }),
            actualWaitMinutes: isTerminal ? faker.number.int({ min: 5, max: 60 }) : null,
            calledByUserId: status === QueueEntryStatus.WAITING ? null : faker.helpers.arrayElement(staffUsers).id,
            servedByUserId: status === QueueEntryStatus.COMPLETED ? manager.id : null,
          },
        });

        const notification = await prisma.notification.create({
          data: {
            businessId: business.id,
            customerId: customer.id,
            queueEntryId: entry.id,
            channel: entry.notificationPreference === NotificationPreference.SMS
              ? NotificationChannel.SMS
              : NotificationChannel.WHATSAPP,
            type: NotificationType.QUEUE_JOINED,
            payload: { displayCode: token.displayCode, position: tokenNumber },
            status: NotificationStatus.DELIVERED,
            idempotencyKey: `seed:${entry.id}:QUEUE_JOINED`,
          },
        });
        await prisma.notificationLog.create({
          data: {
            notificationId: notification.id,
            attemptNumber: 1,
            provider: NotificationProvider.META_CLOUD_API,
            status: NotificationLogStatus.DELIVERED,
            providerMessageId: faker.string.uuid(),
            sentAt: joinedAt,
            deliveredAt: faker.date.soon({ days: 1, refDate: joinedAt }),
          },
        });

        if (status === QueueEntryStatus.COMPLETED) {
          await prisma.feedback.create({
            data: {
              businessId: business.id,
              branchId: branch.id,
              customerId: customer.id,
              queueEntryId: entry.id,
              status: FeedbackStatus.SUBMITTED,
              rating: faker.number.int({ min: 3, max: 5 }),
              comment: faker.lorem.sentence(),
              submittedAt: faker.date.soon({ days: 1, refDate: joinedAt }),
            },
          });
        }
      }

      await prisma.queue.update({
        where: { id: queue.id },
        data: { lastTokenNumber: tokenNumber, lastTokenResetAt: issuedDate },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      businessId: business.id,
      actorUserId: owner.id,
      action: 'business.created',
      entityType: 'Business',
      entityId: business.id,
      afterData: { name: business.name, slug: business.slug },
    },
  });

  return business;
}

async function main() {
  console.log('Resetting demo data...');
  await resetDemoData();

  console.log('Seeding permission/role/plan catalog...');
  const { roleByName, planBySlug } = await seedCatalog();

  console.log('Seeding platform admin user...');
  await seedPlatformAdmin(roleByName.get(PLATFORM_ROLE_NAME)!.id);

  console.log('Seeding Bella Vista Restaurant (client demo)...');
  const bellaManifest = await seedBellaVistaRestaurant({
    prisma,
    passwordHash: await demoPasswordHash(),
    roleByName,
    planId: planBySlug.get('scale')!.id,
    portalBaseUrl: process.env.CUSTOMER_PORTAL_URL,
  });
  writeRestaurantDemoManifest(bellaManifest);

  console.log('Seeding demo business #1 (Cafe Aroma)...');
  await seedBusiness({
    name: 'Cafe Aroma',
    slug: 'cafe-aroma',
    email: 'hello@cafearoma.example.com',
    branches: [
      { name: 'Cafe Aroma — Gulberg', code: 'GUL', city: 'Lahore' },
      { name: 'Cafe Aroma — DHA', code: 'DHA', city: 'Lahore' },
    ],
    planId: planBySlug.get('growth')!.id,
    roleByName,
  });

  console.log('Seeding demo business #2 (Bright Smile Dental Clinic)...');
  await seedBusiness({
    name: 'Bright Smile Dental Clinic',
    slug: 'bright-smile-dental',
    email: 'front-desk@brightsmile.example.com',
    branches: [{ name: 'Bright Smile — Clifton', code: 'CLF', city: 'Karachi' }],
    planId: planBySlug.get('starter')!.id,
    roleByName,
  });

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
