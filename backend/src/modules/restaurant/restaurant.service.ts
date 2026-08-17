import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessType,
  KitchenOrderStage,
  QRCodePurpose,
  ServiceMode,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { UpdateRestaurantConfigDto } from './dto/restaurant-config.dto';
import type { CreateQrCodeDto, UpdateQrCodeDto } from './dto/qr-code.dto';
import type { AssignEntryToTableDto, CreateTableDto, UpdateTableDto } from './dto/table.dto';
import type { CreateWaiterProfileDto, UpdateWaiterStatusDto } from './dto/waiter.dto';
import type { CreateKitchenOrderDto, UpdateKitchenOrderDto } from './dto/kitchen.dto';

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------

  async getConfig(businessId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      include: { settings: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    return {
      businessType: business.businessType,
      enabledModes: business.settings?.enabledModes ?? [ServiceMode.DINE_IN],
    };
  }

  async updateConfig(businessId: string, dto: UpdateRestaurantConfigDto) {
    await this.requireBusiness(businessId);
    if (dto.businessType) {
      await this.prisma.business.update({
        where: { id: businessId },
        data: { businessType: dto.businessType },
      });
    }
    if (dto.enabledModes?.length) {
      await this.prisma.businessSettings.upsert({
        where: { businessId },
        create: {
          businessId,
          enabledModes: dto.enabledModes,
        },
        update: { enabledModes: dto.enabledModes },
      });
    }
    return this.getConfig(businessId);
  }

  // ---------------------------------------------------------------------------
  // QR Codes
  // ---------------------------------------------------------------------------

  async listQrCodes(businessId: string, branchId?: string) {
    if (branchId) {
      await this.requireBranch(businessId, branchId);
    }
    return this.prisma.qRCode.findMany({
      where: {
        businessId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQrCode(businessId: string, dto: CreateQrCodeDto) {
    await this.requireBranch(businessId, dto.branchId);
    if (dto.queueId) {
      await this.requireQueueForBusiness(businessId, dto.queueId);
    }
    const portalBase = process.env.CUSTOMER_PORTAL_URL ?? 'http://localhost:3001';
    const code = randomBytes(6).toString('base64url').slice(0, 8);
    let targetUrl = `${portalBase}/q/${dto.branchId}`;

    if (dto.queueId) {
      targetUrl = `${portalBase}/q/${dto.queueId}`;
    } else if (dto.purpose === QRCodePurpose.DRIVE_IN_ENTRANCE) {
      targetUrl = `${portalBase}/drive/${dto.branchId}`;
    } else if (dto.purpose === QRCodePurpose.TAKEAWAY_RECEIPT) {
      targetUrl = `${portalBase}/takeaway/${dto.branchId}`;
    } else if (dto.purpose === QRCodePurpose.WAITER_PERSONAL && dto.assignedUserId) {
      targetUrl = `${portalBase}/waiter/${dto.assignedUserId}`;
    }

    return this.prisma.qRCode.create({
      data: {
        businessId,
        branchId: dto.branchId,
        queueId: dto.queueId,
        code,
        purpose: dto.purpose,
        label: dto.label,
        targetUrl,
        assignedUserId: dto.assignedUserId,
      },
    });
  }

  async updateQrCode(businessId: string, id: string, dto: UpdateQrCodeDto) {
    await this.requireQr(businessId, id);
    return this.prisma.qRCode.update({
      where: { id },
      data: dto,
    });
  }

  async resolveQrCode(code: string) {
    const qr = await this.prisma.qRCode.findFirst({
      where: { code, isActive: true, deletedAt: null },
    });
    if (!qr) throw new NotFoundException('QR code not found');
    await this.prisma.qRCode.update({
      where: { id: qr.id },
      data: {
        scansCount: { increment: 1 },
        lastScannedAt: new Date(),
      },
    });
    return {
      code: qr.code,
      targetUrl: qr.targetUrl,
      purpose: qr.purpose,
      queueId: qr.queueId,
      branchId: qr.branchId,
    };
  }

  // ---------------------------------------------------------------------------
  // Tables
  // ---------------------------------------------------------------------------

  async listTables(businessId: string, branchId: string) {
    await this.requireBranch(businessId, branchId);
    return this.prisma.restaurantTable.findMany({
      where: { businessId, branchId, deletedAt: null },
      include: {
        currentEntry: {
          include: { queueToken: true, customer: true },
        },
        assignedWaiter: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTable(businessId: string, dto: CreateTableDto) {
    await this.requireBranch(businessId, dto.branchId);
    return this.prisma.restaurantTable.create({
      data: {
        businessId,
        branchId: dto.branchId,
        name: dto.name,
        capacity: dto.capacity ?? 4,
        section: dto.section,
        posX: dto.posX ?? 0,
        posY: dto.posY ?? 0,
      },
    });
  }

  async updateTable(businessId: string, id: string, dto: UpdateTableDto) {
    await this.requireTable(businessId, id);
    return this.prisma.restaurantTable.update({
      where: { id },
      data: dto,
    });
  }

  async assignEntryToTable(businessId: string, tableId: string, dto: AssignEntryToTableDto) {
    const table = await this.requireTable(businessId, tableId);
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id: dto.entryId, businessId, deletedAt: null },
    });
    if (!entry) throw new NotFoundException('Entry not found');

    const [updatedTable] = await this.prisma.$transaction([
      this.prisma.restaurantTable.update({
        where: { id: tableId },
        data: {
          currentEntryId: entry.id,
          status: 'OCCUPIED',
        },
        include: { currentEntry: { include: { queueToken: true, customer: true } } },
      }),
      this.prisma.queueEntry.update({
        where: { id: entry.id },
        data: {
          metadata: {
            ...(typeof entry.metadata === 'object' && entry.metadata !== null
              ? (entry.metadata as Record<string, unknown>)
              : {}),
            seatedAt: new Date().toISOString(),
            tableId: table.id,
            tableName: table.name,
          },
        },
      }),
    ]);
    return updatedTable;
  }

  // ---------------------------------------------------------------------------
  // Waiters
  // ---------------------------------------------------------------------------

  async listWaiters(businessId: string, branchId: string) {
    await this.requireBranch(businessId, branchId);
    return this.prisma.waiterProfile.findMany({
      where: { businessId, branchId },
      include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
      orderBy: { displayName: 'asc' },
    });
  }

  async createWaiter(businessId: string, dto: CreateWaiterProfileDto) {
    await this.requireBranch(businessId, dto.branchId);
    return this.prisma.waiterProfile.create({
      data: {
        businessId,
        branchId: dto.branchId,
        userId: dto.userId,
        displayName: dto.displayName,
        status: 'OFFLINE',
      },
    });
  }

  async updateWaiterStatus(businessId: string, id: string, dto: UpdateWaiterStatusDto) {
    await this.requireWaiter(businessId, id);
    return this.prisma.waiterProfile.update({
      where: { id },
      data: dto,
    });
  }

  // ---------------------------------------------------------------------------
  // Kitchen
  // ---------------------------------------------------------------------------

  async getKitchenBoard(businessId: string, branchId: string) {
    await this.requireBranch(businessId, branchId);
    const orders = await this.prisma.kitchenOrder.findMany({
      where: { businessId, branchId },
      include: {
        entry: {
          include: {
            queueToken: true,
            customer: true,
            queue: { select: { id: true, name: true, serviceMode: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return {
      incoming: orders.filter((o) => o.stage === KitchenOrderStage.INCOMING),
      preparing: orders.filter((o) => o.stage === KitchenOrderStage.PREPARING),
      ready: orders.filter((o) => o.stage === KitchenOrderStage.READY),
      delayed: orders.filter((o) => o.stage === KitchenOrderStage.DELAYED),
      collected: orders.filter((o) => o.stage === KitchenOrderStage.COLLECTED),
    };
  }

  async createKitchenOrder(businessId: string, dto: CreateKitchenOrderDto) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id: dto.entryId, businessId, deletedAt: null },
      include: { queue: true },
    });
    if (!entry) throw new NotFoundException('Entry not found');
    if (entry.queue.serviceMode === ServiceMode.DINE_IN) {
      throw new BadRequestException('Kitchen orders apply to takeaway and drive-in modes');
    }
    return this.prisma.kitchenOrder.create({
      data: {
        businessId: entry.businessId,
        branchId: entry.branchId,
        queueId: entry.queueId,
        entryId: entry.id,
        orderNumber: dto.orderNumber,
        stage: KitchenOrderStage.INCOMING,
      },
    });
  }

  async updateKitchenOrder(businessId: string, id: string, dto: UpdateKitchenOrderDto) {
    const order = await this.prisma.kitchenOrder.findFirst({
      where: { id, businessId },
    });
    if (!order) throw new NotFoundException('Kitchen order not found');

    const timestamps: Record<string, Date | null> = {};
    if (dto.stage === KitchenOrderStage.PREPARING && !order.startedAt) {
      timestamps.startedAt = new Date();
    }
    if (dto.stage === KitchenOrderStage.READY) {
      timestamps.readyAt = new Date();
    }
    if (dto.stage === KitchenOrderStage.COLLECTED) {
      timestamps.collectedAt = new Date();
    }

    return this.prisma.kitchenOrder.update({
      where: { id },
      data: {
        stage: dto.stage,
        assignedWaiterId: dto.assignedWaiterId,
        ...timestamps,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Mode analytics (lightweight aggregation)
  // ---------------------------------------------------------------------------

  async getModeAnalytics(businessId: string, branchId?: string) {
    if (branchId) {
      await this.requireBranch(businessId, branchId);
    }
    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const entries = await this.prisma.queueEntry.findMany({
      where: {
        businessId,
        ...(branchId ? { branchId } : {}),
        createdAt: { gte: since },
        deletedAt: null,
      },
      include: { queue: { select: { serviceMode: true } } },
    });

    const byMode: Record<ServiceMode, { joined: number; completed: number; avgWait: number }> = {
      DINE_IN: { joined: 0, completed: 0, avgWait: 0 },
      TAKEAWAY: { joined: 0, completed: 0, avgWait: 0 },
      DRIVE_IN: { joined: 0, completed: 0, avgWait: 0 },
    };

    for (const mode of Object.keys(byMode) as ServiceMode[]) {
      const modeEntries = entries.filter((e) => e.queue.serviceMode === mode);
      const completed = modeEntries.filter((e) => e.status === 'COMPLETED');
      const waits = completed
        .map((e) => e.actualWaitMinutes)
        .filter((w): w is number => w != null);
      byMode[mode] = {
        joined: modeEntries.length,
        completed: completed.length,
        avgWait: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0,
      };
    }

    const tables = branchId
      ? await this.prisma.restaurantTable.count({
          where: { businessId, branchId, deletedAt: null, status: 'OCCUPIED' },
        })
      : 0;
    const tableTotal = branchId
      ? await this.prisma.restaurantTable.count({
          where: { businessId, branchId, deletedAt: null },
        })
      : 0;

    return {
      date: since.toISOString().slice(0, 10),
      byMode,
      tableUtilization: tableTotal > 0 ? Math.round((tables / tableTotal) * 100) : 0,
    };
  }

  private async requireBusiness(businessId: string) {
    const b = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
    });
    if (!b) throw new NotFoundException('Business not found');
    return b;
  }

  private async requireQr(businessId: string, id: string) {
    const qr = await this.prisma.qRCode.findFirst({
      where: { id, businessId, deletedAt: null },
    });
    if (!qr) throw new NotFoundException('QR code not found');
    return qr;
  }

  private async requireTable(businessId: string, id: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id, businessId, deletedAt: null },
    });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  private async requireWaiter(businessId: string, id: string) {
    const waiter = await this.prisma.waiterProfile.findFirst({
      where: { id, businessId },
    });
    if (!waiter) throw new NotFoundException('Waiter not found');
    return waiter;
  }

  private async requireBranch(businessId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  private async requireQueueForBusiness(businessId: string, queueId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!queue) throw new NotFoundException('Queue not found');
    return queue;
  }
}
