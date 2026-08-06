/**
 * Bella Vista Restaurant — client presentation demo tenant.
 * Uses existing Prisma models only; no queue-engine changes.
 */
import { faker } from '@faker-js/faker';
import {
  BillingCycle,
  BusinessType,
  NotificationChannel,
  NotificationLogStatus,
  NotificationPreference,
  NotificationProvider,
  NotificationStatus,
  NotificationType,
  PrismaClient,
  QRCodePurpose,
  QueueEntrySource,
  QueueEntryStatus,
  QueueStatus,
  QueueTokenStatus,
  ServiceMode,
  SubscriptionStatus,
  UserStatus,
  Weekday,
} from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface RestaurantDemoManifest {
  business: { id: string; name: string; slug: string };
  branch: { id: string; name: string };
  owner: { email: string };
  portalBaseUrl: string;
  mainQueue: {
    id: string;
    name: string;
    joinUrl: string;
    qrCodes: Array<{ label: string; code: string; url: string }>;
  };
  serviceModes: Record<
    'DINE_IN' | 'TAKEAWAY' | 'DRIVE_IN',
    { queueId: string; name: string; joinUrl: string; branchLandingUrl?: string }
  >;
  queues: Array<{ id: string; name: string; joinUrl: string; serviceMode: ServiceMode }>;
  stats: {
    totalEntries: number;
    waiting: number;
    completed: number;
    vip: number;
    cancelled: number;
  };
}

const BELLA_VISTA_LOGO =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop';
const BELLA_VISTA_HERO =
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&h=600&fit=crop';

const QR_PLACEMENTS = [
  { label: 'Restaurant Entrance', code: 'BV-ENTRANCE' },
  { label: 'Reception Desk', code: 'BV-RECEPTION' },
  { label: 'Window', code: 'BV-WINDOW' },
  { label: 'Outdoor Banner', code: 'BV-OUTDOOR' },
  { label: 'Parking Area', code: 'BV-PARKING' },
] as const;

const DEMO_CUSTOMER_NAMES = [
  'Emma Johnson',
  'James Wilson',
  'Sophia Brown',
  'Oliver Smith',
  'Noah Williams',
  'Mia Davis',
  'Lucas Miller',
  'Ava Wilson',
  'Ethan Moore',
  'Isabella Taylor',
];

const TAKEAWAY_ORDERS = ['4821', '4822', '4823', '4824', '4825', '4826', '4827'];

const DRIVE_IN_VEHICLES = [
  { desc: 'Black Toyota Camry', plate: 'BV-1042' },
  { desc: 'Silver Honda CR-V', plate: 'DT-8831' },
  { desc: 'White Tesla Model 3', plate: 'EV-2209' },
];

function timeOfDay(hour: number, minute = 0): Date {
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
}

function displayCode(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

function joinUrl(portalBase: string, queueId: string): string {
  return `${portalBase.replace(/\/$/, '')}/q/${queueId}`;
}

function branchModeUrl(
  portalBase: string,
  mode: 'takeaway' | 'drive',
  branchId: string,
  queueId: string,
): string {
  const base = portalBase.replace(/\/$/, '');
  return `${base}/${mode}/${branchId}?queue=${queueId}`;
}

export async function seedBellaVistaRestaurant(opts: {
  prisma: PrismaClient;
  passwordHash: string;
  roleByName: Map<string, { id: string }>;
  planId: string;
  portalBaseUrl?: string;
}): Promise<RestaurantDemoManifest> {
  const { prisma, passwordHash, roleByName, planId } = opts;
  const portalBaseUrl = opts.portalBaseUrl ?? process.env.CUSTOMER_PORTAL_URL ?? 'http://localhost:3001';

  faker.seed(20260724);

  const business = await prisma.business.create({
    data: {
      name: 'Bella Vista',
      slug: 'bella-vista',
      email: 'reservations@bellavista.example.com',
      phone: '+923001234567',
      logoUrl: BELLA_VISTA_LOGO,
      status: 'ACTIVE',
      timezone: 'Asia/Karachi',
      businessType: BusinessType.RESTAURANT,
    },
  });

  await prisma.businessSettings.create({
    data: {
      businessId: business.id,
      defaultNotificationChannel: NotificationPreference.BOTH,
      brandColor: '#6366F1',
      maxGuestsPerEntry: 8,
      enabledModes: [ServiceMode.DINE_IN, ServiceMode.TAKEAWAY, ServiceMode.DRIVE_IN],
    },
  });

  await prisma.subscription.create({
    data: {
      businessId: business.id,
      planId,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const owner = await prisma.user.create({
    data: {
      businessId: business.id,
      email: 'owner@bellavista.example.com',
      fullName: 'Marco Bellini',
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: owner.id, roleId: roleByName.get('OWNER')!.id, businessId: business.id },
  });

  const branch = await prisma.branch.create({
    data: {
      businessId: business.id,
      name: 'Bella Vista Downtown',
      code: 'DT',
      city: 'Downtown',
      country: 'Pakistan',
      address: '42 Main Street, Downtown',
      phone: '+923001234567',
      email: 'downtown@bellavista.example.com',
    },
  });

  await prisma.branchSettings.create({ data: { branchId: branch.id } });

  for (const day of Object.values(Weekday)) {
    await prisma.workingHours.create({
      data: {
        branchId: branch.id,
        dayOfWeek: day,
        openTime: timeOfDay(12),
        closeTime: timeOfDay(23),
      },
    });
  }

  const managerRoleId = roleByName.get('MANAGER')!.id;
  const staffRoleId = roleByName.get('STAFF')!.id;

  const manager = await prisma.user.create({
    data: {
      businessId: business.id,
      email: 'manager.dt@bellavista.example.com',
      fullName: 'Sofia Ricci',
      passwordHash,
      status: UserStatus.ACTIVE,
    },
  });
  await prisma.userRole.create({ data: { userId: manager.id, roleId: managerRoleId, businessId: business.id } });
  await prisma.userBranch.create({ data: { userId: manager.id, branchId: branch.id, isPrimary: true } });

  const staffUsers = await Promise.all(
    ['Host', 'Server'].map(async (role, i) => {
      const staff = await prisma.user.create({
        data: {
          businessId: business.id,
          email: `staff${i + 1}.dt@bellavista.example.com`,
          fullName: `Demo ${role}`,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });
      await prisma.userRole.create({ data: { userId: staff.id, roleId: staffRoleId, businessId: business.id } });
      await prisma.userBranch.create({ data: { userId: staff.id, branchId: branch.id, isPrimary: true } });
      return staff;
    }),
  );

  type QueueSeedProfile = 'dine_in_full' | 'takeaway' | 'drive_in' | 'light';

  const queueDefs: Array<{
    name: string;
    prefix: string;
    description: string;
    maxCapacity: number;
    isMain: boolean;
    serviceMode: ServiceMode;
    profile: QueueSeedProfile;
  }> = [
    {
      name: 'Dine-In Waiting List',
      prefix: 'A',
      description:
        'Join our waiting list for dine-in. Average dining time 45 minutes. Tables for 2, 4, 6, and 8 guests.',
      maxCapacity: 80,
      isMain: true,
      serviceMode: ServiceMode.DINE_IN,
      profile: 'dine_in_full',
    },
    {
      name: 'Takeaway Pickup',
      prefix: 'T',
      description: 'Track your takeaway order. Scan the QR on your receipt after placing your order.',
      maxCapacity: 50,
      isMain: false,
      serviceMode: ServiceMode.TAKEAWAY,
      profile: 'takeaway',
    },
    {
      name: 'Drive-In Lane',
      prefix: 'D',
      description: 'Join the drive-in queue. Stay in your vehicle — we will bring your order to you.',
      maxCapacity: 30,
      isMain: false,
      serviceMode: ServiceMode.DRIVE_IN,
      profile: 'drive_in',
    },
    {
      name: 'Reservation Waitlist',
      prefix: 'R',
      description: 'Arrived for your reservation? Check in here and we will seat you shortly.',
      maxCapacity: 40,
      isMain: false,
      serviceMode: ServiceMode.DINE_IN,
      profile: 'light',
    },
    {
      name: 'VIP Guests',
      prefix: 'V',
      description: 'Priority seating for VIP guests and special occasions.',
      maxCapacity: 20,
      isMain: false,
      serviceMode: ServiceMode.DINE_IN,
      profile: 'light',
    },
  ];

  const queues: RestaurantDemoManifest['queues'] = [];
  const serviceModes: RestaurantDemoManifest['serviceModes'] = {
    DINE_IN: { queueId: '', name: '', joinUrl: '' },
    TAKEAWAY: { queueId: '', name: '', joinUrl: '' },
    DRIVE_IN: { queueId: '', name: '', joinUrl: '' },
  };
  let mainQueueId = '';
  let mainQueueJoinUrl = '';
  const qrCodes: RestaurantDemoManifest['mainQueue']['qrCodes'] = [];

  let totalEntries = 0;
  let waitingCount = 0;
  let completedCount = 0;
  let vipCount = 0;
  let cancelledCount = 0;

  for (const def of queueDefs) {
    const queue = await prisma.queue.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        name: def.name,
        description: def.description,
        prefix: def.prefix,
        status: QueueStatus.ACTIVE,
        maxCapacity: def.maxCapacity,
        averageServiceTimeMinutes:
          def.serviceMode === ServiceMode.TAKEAWAY
            ? 12
            : def.serviceMode === ServiceMode.DRIVE_IN
              ? 18
              : 45,
        isAcceptingEntries: true,
        serviceMode: def.serviceMode,
      },
    });

    const url = joinUrl(portalBaseUrl, queue.id);
    queues.push({ id: queue.id, name: def.name, joinUrl: url, serviceMode: def.serviceMode });

    if (def.serviceMode === ServiceMode.DINE_IN && !serviceModes.DINE_IN.queueId) {
      serviceModes.DINE_IN = { queueId: queue.id, name: def.name, joinUrl: url };
    }
    if (def.serviceMode === ServiceMode.TAKEAWAY) {
      serviceModes.TAKEAWAY = {
        queueId: queue.id,
        name: def.name,
        joinUrl: url,
        branchLandingUrl: branchModeUrl(portalBaseUrl, 'takeaway', branch.id, queue.id),
      };
    }
    if (def.serviceMode === ServiceMode.DRIVE_IN) {
      serviceModes.DRIVE_IN = {
        queueId: queue.id,
        name: def.name,
        joinUrl: url,
        branchLandingUrl: branchModeUrl(portalBaseUrl, 'drive', branch.id, queue.id),
      };
    }

    if (def.isMain) {
      mainQueueId = queue.id;
      mainQueueJoinUrl = url;

      for (const placement of QR_PLACEMENTS) {
        await prisma.qRCode.create({
          data: {
            businessId: business.id,
            branchId: branch.id,
            queueId: queue.id,
            code: placement.code,
            purpose: QRCodePurpose.ENTRANCE,
            targetUrl: url,
            isActive: true,
            scansCount: faker.number.int({ min: 12, max: 340 }),
            lastScannedAt: faker.date.recent({ days: 1 }),
          },
        });
        qrCodes.push({ label: placement.label, code: placement.code, url });
      }
    }

    const issuedDate = new Date();
    issuedDate.setUTCHours(0, 0, 0, 0);
    let tokenNumber = 0;

    if (def.profile === 'dine_in_full') {
      const batches: Array<{ status: QueueEntryStatus; count: number; isVip?: boolean }> = [
        { status: QueueEntryStatus.COMPLETED, count: 48 },
        { status: QueueEntryStatus.WAITING, count: 12 },
        { status: QueueEntryStatus.WAITING, count: 5, isVip: true },
        { status: QueueEntryStatus.HOLDING, count: 3 },
        { status: QueueEntryStatus.CALLED, count: 1 },
        { status: QueueEntryStatus.CANCELLED, count: 5 },
        { status: QueueEntryStatus.NO_SHOW, count: 3 },
        { status: QueueEntryStatus.SKIPPED, count: 2 },
      ];

      for (const batch of batches) {
        for (let i = 0; i < batch.count; i++) {
          tokenNumber += 1;
          totalEntries += 1;

          const name = faker.helpers.arrayElement(DEMO_CUSTOMER_NAMES);
          const phone = `+92300${faker.string.numeric(7)}`;
          const customer = await prisma.customer.create({
            data: {
              businessId: business.id,
              fullName: name,
              phone,
              totalVisits: faker.number.int({ min: 1, max: 24 }),
              lastVisitAt: faker.date.recent({ days: 30 }),
            },
          });

          const token = await prisma.queueToken.create({
            data: {
              queueId: queue.id,
              tokenNumber,
              displayCode: displayCode(def.prefix, tokenNumber),
              issuedDate,
              status:
                batch.status === QueueEntryStatus.CANCELLED
                  ? QueueTokenStatus.VOID
                  : QueueTokenStatus.ISSUED,
            },
          });

          const joinedAt = faker.date.recent({ days: 0.5 });
          const isVip = batch.isVip ?? false;
          if (isVip) vipCount += 1;
          if (batch.status === QueueEntryStatus.WAITING) waitingCount += 1;
          if (batch.status === QueueEntryStatus.COMPLETED) completedCount += 1;
          if (batch.status === QueueEntryStatus.CANCELLED) cancelledCount += 1;

          const partySize = faker.helpers.arrayElement([2, 2, 4, 4, 4, 6, 8]);
          const occasions = ['Birthday', 'Anniversary', 'Business', 'Regular', 'VIP'];
          const seating = ['Indoor', 'Outdoor', 'Non Smoking', 'Smoking'];

          await prisma.queueEntry.create({
            data: {
              businessId: business.id,
              branchId: branch.id,
              queueId: queue.id,
              customerId: customer.id,
              queueTokenId: token.id,
              status: batch.status,
              source: QueueEntrySource.QR_LANDING,
              partySize,
              notes: `Occasion: ${faker.helpers.arrayElement(occasions)} · Seating: ${faker.helpers.arrayElement(seating)}`,
              notificationPreference: NotificationPreference.BOTH,
              isVip,
              priority: isVip ? 10 : 0,
              joinedAt,
              calledAt:
                batch.status === QueueEntryStatus.WAITING
                  ? null
                  : faker.date.between({ from: joinedAt, to: new Date() }),
              holdingStartedAt:
                batch.status === QueueEntryStatus.HOLDING ? faker.date.recent({ days: 0.1 }) : null,
              servedAt:
                batch.status === QueueEntryStatus.COMPLETED
                  ? faker.date.between({ from: joinedAt, to: new Date() })
                  : null,
              cancelledAt:
                batch.status === QueueEntryStatus.CANCELLED
                  ? faker.date.between({ from: joinedAt, to: new Date() })
                  : null,
              estimatedWaitMinutes: faker.number.int({ min: 10, max: 55 }),
              actualWaitMinutes:
                batch.status === QueueEntryStatus.COMPLETED
                  ? faker.number.int({ min: 20, max: 60 })
                  : null,
              calledByUserId:
                batch.status === QueueEntryStatus.WAITING
                  ? null
                  : faker.helpers.arrayElement(staffUsers).id,
              servedByUserId:
                batch.status === QueueEntryStatus.COMPLETED ? manager.id : null,
            },
          });
        }
      }
    } else if (def.profile === 'takeaway') {
      const takeawayStatuses: QueueEntryStatus[] = [
        ...Array(7).fill(QueueEntryStatus.WAITING),
        QueueEntryStatus.CALLED,
        QueueEntryStatus.COMPLETED,
        QueueEntryStatus.COMPLETED,
      ];

      for (let i = 0; i < takeawayStatuses.length; i++) {
        const status = takeawayStatuses[i]!;
        tokenNumber += 1;
        totalEntries += 1;

        const name = DEMO_CUSTOMER_NAMES[i % DEMO_CUSTOMER_NAMES.length]!;
        const orderNum = TAKEAWAY_ORDERS[i % TAKEAWAY_ORDERS.length]!;
        const customer = await prisma.customer.create({
          data: {
            businessId: business.id,
            fullName: name,
            phone: `+92300${faker.string.numeric(7)}`,
          },
        });
        const token = await prisma.queueToken.create({
          data: {
            queueId: queue.id,
            tokenNumber,
            displayCode: displayCode(def.prefix, tokenNumber),
            issuedDate,
          },
        });
        const joinedAt = faker.date.recent({ days: 0.2 });
        if (status === QueueEntryStatus.WAITING) waitingCount += 1;
        if (status === QueueEntryStatus.COMPLETED) completedCount += 1;

        await prisma.queueEntry.create({
          data: {
            businessId: business.id,
            branchId: branch.id,
            queueId: queue.id,
            customerId: customer.id,
            queueTokenId: token.id,
            status,
            source: QueueEntrySource.QR_LANDING,
            partySize: 1,
            notes: `Order #${orderNum}`,
            notificationPreference: NotificationPreference.WHATSAPP,
            joinedAt,
            calledAt: status === QueueEntryStatus.WAITING ? null : faker.date.recent({ days: 0.1 }),
            servedAt: status === QueueEntryStatus.COMPLETED ? faker.date.recent({ days: 0.1 }) : null,
            estimatedWaitMinutes: faker.number.int({ min: 5, max: 20 }),
            actualWaitMinutes:
              status === QueueEntryStatus.COMPLETED ? faker.number.int({ min: 8, max: 18 }) : null,
          },
        });
      }

      await prisma.qRCode.create({
        data: {
          businessId: business.id,
          branchId: branch.id,
          queueId: queue.id,
          code: 'BV-TAKEAWAY',
          purpose: QRCodePurpose.TAKEAWAY_RECEIPT,
          targetUrl: serviceModes.TAKEAWAY.branchLandingUrl!,
          isActive: true,
          scansCount: faker.number.int({ min: 40, max: 220 }),
        },
      });
    } else if (def.profile === 'drive_in') {
      const driveStatuses: QueueEntryStatus[] = [
        QueueEntryStatus.WAITING,
        QueueEntryStatus.WAITING,
        QueueEntryStatus.WAITING,
        QueueEntryStatus.CALLED,
        QueueEntryStatus.COMPLETED,
      ];

      for (let i = 0; i < driveStatuses.length; i++) {
        const status = driveStatuses[i]!;
        tokenNumber += 1;
        totalEntries += 1;

        const name = DEMO_CUSTOMER_NAMES[i % DEMO_CUSTOMER_NAMES.length]!;
        const vehicle = DRIVE_IN_VEHICLES[i % DRIVE_IN_VEHICLES.length]!;
        const customer = await prisma.customer.create({
          data: {
            businessId: business.id,
            fullName: name,
            phone: `+92300${faker.string.numeric(7)}`,
          },
        });
        const token = await prisma.queueToken.create({
          data: {
            queueId: queue.id,
            tokenNumber,
            displayCode: displayCode(def.prefix, tokenNumber),
            issuedDate,
          },
        });
        const joinedAt = faker.date.recent({ days: 0.15 });
        if (status === QueueEntryStatus.WAITING) waitingCount += 1;
        if (status === QueueEntryStatus.COMPLETED) completedCount += 1;

        await prisma.queueEntry.create({
          data: {
            businessId: business.id,
            branchId: branch.id,
            queueId: queue.id,
            customerId: customer.id,
            queueTokenId: token.id,
            status,
            source: QueueEntrySource.QR_LANDING,
            partySize: faker.helpers.arrayElement([1, 2, 2, 4]),
            notes: `Vehicle: ${vehicle.desc} · Plate: ${vehicle.plate}`,
            notificationPreference: NotificationPreference.BOTH,
            joinedAt,
            calledAt: status === QueueEntryStatus.WAITING ? null : faker.date.recent({ days: 0.1 }),
            servedAt: status === QueueEntryStatus.COMPLETED ? faker.date.recent({ days: 0.1 }) : null,
            estimatedWaitMinutes: faker.number.int({ min: 10, max: 25 }),
            actualWaitMinutes:
              status === QueueEntryStatus.COMPLETED ? faker.number.int({ min: 12, max: 22 }) : null,
          },
        });
      }

      await prisma.qRCode.create({
        data: {
          businessId: business.id,
          branchId: branch.id,
          queueId: queue.id,
          code: 'BV-DRIVE',
          purpose: QRCodePurpose.DRIVE_IN_ENTRANCE,
          targetUrl: serviceModes.DRIVE_IN.branchLandingUrl!,
          isActive: true,
          scansCount: faker.number.int({ min: 20, max: 120 }),
        },
      });
    } else {
      const lightStatuses = [QueueEntryStatus.WAITING, QueueEntryStatus.WAITING, QueueEntryStatus.COMPLETED];

      for (const status of lightStatuses) {
        tokenNumber += 1;
        totalEntries += 1;
        const customer = await prisma.customer.create({
          data: {
            businessId: business.id,
            fullName: faker.helpers.arrayElement(DEMO_CUSTOMER_NAMES),
            phone: `+92300${faker.string.numeric(7)}`,
          },
        });
        const token = await prisma.queueToken.create({
          data: {
            queueId: queue.id,
            tokenNumber,
            displayCode: displayCode(def.prefix, tokenNumber),
            issuedDate,
          },
        });
        await prisma.queueEntry.create({
          data: {
            businessId: business.id,
            branchId: branch.id,
            queueId: queue.id,
            customerId: customer.id,
            queueTokenId: token.id,
            status,
            source: QueueEntrySource.QR_LANDING,
            partySize: faker.number.int({ min: 2, max: 6 }),
            notificationPreference: NotificationPreference.WHATSAPP,
            isVip: def.prefix === 'V',
            joinedAt: faker.date.recent({ days: 0.3 }),
            estimatedWaitMinutes: faker.number.int({ min: 5, max: 30 }),
          },
        });
        if (status === QueueEntryStatus.WAITING) waitingCount += 1;
        if (status === QueueEntryStatus.COMPLETED) completedCount += 1;
      }

      await prisma.qRCode.create({
        data: {
          businessId: business.id,
          branchId: branch.id,
          queueId: queue.id,
          code: `BV-${def.prefix}`,
          targetUrl: url,
          isActive: true,
          scansCount: faker.number.int({ min: 5, max: 80 }),
        },
      });
    }

    await prisma.queue.update({
      where: { id: queue.id },
      data: { lastTokenNumber: tokenNumber, lastTokenResetAt: issuedDate },
    });
  }

  await prisma.auditLog.create({
    data: {
      businessId: business.id,
      actorUserId: owner.id,
      action: 'demo.restaurant_seeded',
      entityType: 'Business',
      entityId: business.id,
      afterData: { name: business.name, heroImage: BELLA_VISTA_HERO },
    },
  });

  const manifest: RestaurantDemoManifest = {
    business: { id: business.id, name: business.name, slug: business.slug },
    branch: { id: branch.id, name: branch.name },
    owner: { email: owner.email },
    portalBaseUrl,
    mainQueue: {
      id: mainQueueId,
      name: 'Dine-In Waiting List',
      joinUrl: mainQueueJoinUrl,
      qrCodes,
    },
    serviceModes,
    queues,
    stats: {
      totalEntries,
      waiting: waitingCount,
      completed: completedCount,
      vip: vipCount,
      cancelled: cancelledCount,
    },
  };

  return manifest;
}

const BELLA_VISTA_SLUG = 'bella-vista';

/** Removes Bella Vista tenant and all cascaded data. Does not touch other businesses. */
export async function deleteBellaVistaBusiness(prisma: PrismaClient): Promise<boolean> {
  const existing = await prisma.business.findFirst({
    where: { slug: BELLA_VISTA_SLUG },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.business.delete({ where: { id: existing.id } });
  return true;
}

/**
 * Clears active queue state for Bella Vista without re-seeding users or queues.
 * Use between live demos to remove stale waiting customers.
 */
export async function clearBellaVistaActiveEntries(prisma: PrismaClient): Promise<number> {
  const business = await prisma.business.findFirst({
    where: { slug: BELLA_VISTA_SLUG },
    select: { id: true },
  });
  if (!business) {
    throw new Error(
      'Bella Vista demo not found. Run `npm run db:seed` first, or `npm run demo:reset`.',
    );
  }

  const deleted = await prisma.queueEntry.deleteMany({ where: { businessId: business.id } });
  await prisma.queueToken.deleteMany({ where: { businessId: business.id } });
  await prisma.notification.deleteMany({ where: { businessId: business.id } });
  await prisma.feedback.deleteMany({ where: { businessId: business.id } });

  await prisma.queue.updateMany({
    where: { businessId: business.id },
    data: { lastTokenNumber: 0, lastTokenResetAt: new Date() },
  });

  return deleted.count;
}

/** Re-seeds Bella Vista only. Requires catalog roles/plans from a prior `db:seed`. */
export async function resetBellaVistaDemo(opts: {
  prisma: PrismaClient;
  passwordHash: string;
  portalBaseUrl?: string;
}): Promise<RestaurantDemoManifest> {
  const { prisma, passwordHash } = opts;

  const roles = await prisma.role.findMany({
    where: { isSystem: true, businessId: null },
    select: { id: true, name: true },
  });
  const roleByName = new Map(roles.map((r) => [r.name, r]));
  for (const name of ['OWNER', 'MANAGER', 'STAFF']) {
    if (!roleByName.has(name)) {
      throw new Error(
        `System role "${name}" missing. Run \`npm run db:seed\` once to create the catalog.`,
      );
    }
  }

  const plan = await prisma.subscriptionPlan.findFirst({ where: { slug: 'scale' } });
  if (!plan) {
    throw new Error('Subscription plan "scale" missing. Run `npm run db:seed` first.');
  }

  await deleteBellaVistaBusiness(prisma);

  const manifest = await seedBellaVistaRestaurant({
    prisma,
    passwordHash,
    roleByName,
    planId: plan.id,
    portalBaseUrl: opts.portalBaseUrl,
  });
  writeRestaurantDemoManifest(manifest);
  return manifest;
}

export function writeRestaurantDemoManifest(manifest: RestaurantDemoManifest): void {
  const payload = { ...manifest, heroImage: BELLA_VISTA_HERO };
  const outDir = path.resolve(__dirname, '../../docs/demo');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, 'bella-vista-manifest.json');
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  console.log(`Restaurant demo manifest written to ${filePath}`);

  const portalDemoDir = path.resolve(__dirname, '../../apps/customer-portal/public/demo');
  fs.mkdirSync(portalDemoDir, { recursive: true });
  const portalPath = path.join(portalDemoDir, 'bella-vista.json');
  fs.writeFileSync(portalPath, JSON.stringify(payload, null, 2));
  console.log(`Customer portal demo manifest written to ${portalPath}`);
}
