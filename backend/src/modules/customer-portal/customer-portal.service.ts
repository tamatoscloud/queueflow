import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FeedbackStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueueEngineService } from '../../queue-engine';
import {
  estimateWaitMinutesForCustomersAhead,
  SERVICE_SLOT_MINUTES,
} from '../../queue-engine/domain/services/wait-estimate-bounds';
import { RealtimeCredentialService } from '../../infrastructure/realtime/services/realtime-credential.service';
import { WebPushService } from '../../infrastructure/notifications/services/web-push.service';
import type {
  SubmitFeedbackDto,
  SubscribeWebPushDto,
  UpdateEntryContactDto,
} from './dto/customer-portal.dto';
import { PhoneNumber } from '../../queue-engine/domain/value-objects';
import { normalizeGuestMenu } from '../business/guest-menu';
import { normalizeEntryMetadata } from '../queue-operations/utils/entry-metadata.util';

const LANDING_CACHE_TTL_MS = 20_000;
const landingCache = new Map<string, { expiresAt: number; payload: unknown }>();

@Injectable()
export class CustomerPortalService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QueueEngineService) private readonly engine: QueueEngineService,
    private readonly realtimeCredentials: RealtimeCredentialService,
    private readonly webPush: WebPushService,
  ) {}

  async getQueueLanding(queueId: string) {
    const cached = landingCache.get(queueId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    // Avoid full live snapshot here — that path loads every active entry and
    // was ~10s+ under Railway↔Supabase latency. Landing only needs counts.
    const [queue, waitingCount] = await Promise.all([
      this.prisma.queue.findFirst({
        where: { id: queueId, deletedAt: null },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              timezone: true,
              businessType: true,
              settings: { select: { enabledModes: true } },
            },
          },
          branch: { select: { id: true, name: true, city: true } },
        },
      }),
      this.prisma.queueEntry.count({
        where: {
          queueId,
          deletedAt: null,
          status: 'WAITING',
        },
      }),
    ]);
    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    // If you join now you become position waitingCount+1 → (n+1)×2.5 min.
    const estimatedWaitMinutes =
      estimateWaitMinutesForCustomersAhead(waitingCount);

    const payload = {
      business: {
        id: queue.business.id,
        name: queue.business.name,
        logoUrl: queue.business.logoUrl,
        timezone: queue.business.timezone,
        businessType: queue.business.businessType,
        enabledModes: queue.business.settings?.enabledModes ?? ['DINE_IN'],
      },
      branch: queue.branch,
      queue: {
        id: queue.id,
        name: queue.name,
        description: queue.description,
        status: queue.status,
        isAcceptingEntries: queue.isAcceptingEntries,
        prefix: queue.prefix,
        serviceMode: queue.serviceMode,
      },
      live: {
        waitingCount,
        estimatedWaitMinutes,
        averageServiceTimeMinutes: SERVICE_SLOT_MINUTES,
        isOpen: queue.status === 'ACTIVE' && queue.isAcceptingEntries,
        generatedAt: new Date(),
      },
    };

    landingCache.set(queueId, {
      expiresAt: Date.now() + LANDING_CACHE_TTL_MS,
      payload,
    });
    return payload;
  }

  async getEntryTracking(entryId: string) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id: entryId, deletedAt: null },
      include: {
        queueToken: true,
        queue: {
          select: {
            id: true,
            name: true,
            status: true,
            isAcceptingEntries: true,
            serviceMode: true,
            priorityEnabled: true,
            business: { select: { id: true, name: true, logoUrl: true } },
            branch: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }

    // Lightweight position: only waiting ids/order fields — never hydrate the
    // full live snapshot (that path was multi-second under Railway↔Supabase).
    let position = 0;
    let customersAhead = 0;
    let estimatedWaitMinutes = entry.estimatedWaitMinutes ?? 0;

    if (entry.status === 'WAITING') {
      const waiting = await this.prisma.queueEntry.findMany({
        where: {
          queueId: entry.queueId,
          deletedAt: null,
          status: 'WAITING',
        },
        select: {
          id: true,
          sortOrder: true,
          joinedAt: true,
          isVip: true,
          priority: true,
        },
      });
      const priorityEnabled = entry.queue.priorityEnabled;
      waiting.sort((a, b) => {
        if (priorityEnabled) {
          if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
          if (a.priority !== b.priority) return b.priority - a.priority;
        }
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      });
      const idx = waiting.findIndex((row) => row.id === entryId);
      position = idx >= 0 ? idx + 1 : waiting.length;
      customersAhead = Math.max(0, position - 1);
      estimatedWaitMinutes = estimateWaitMinutesForCustomersAhead(customersAhead);
    }

    return {
      entry: {
        id: entry.id,
        status: entry.status,
        displayCode: entry.queueToken.displayCode,
        partySize: entry.partySize,
        joinedAt: entry.joinedAt,
        calledAt: entry.calledAt,
        notes: entry.notes,
        metadata: normalizeEntryMetadata(
          entry.metadata,
          entry.notes,
          entry.queue.serviceMode,
        ),
      },
      queue: {
        id: entry.queue.id,
        name: entry.queue.name,
        status: entry.queue.status,
        isAcceptingEntries: entry.queue.isAcceptingEntries,
        serviceMode: entry.queue.serviceMode,
      },
      business: entry.queue.business,
      branch: entry.queue.branch,
      position,
      customersAhead,
      estimatedWaitMinutes,
      averageServiceTimeMinutes: SERVICE_SLOT_MINUTES,
      snapshotGeneratedAt: new Date(),
      trackingToken: this.realtimeCredentials.issueEntryTrackingToken(entry.id),
    };
  }

  async updateEntryContact(entryId: string, dto: UpdateEntryContactDto) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id: entryId, deletedAt: null },
      include: {
        customer: { select: { id: true, businessId: true, phone: true } },
      },
    });
    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }

    const editable = ['WAITING', 'CALLED', 'HOLDING', 'SKIPPED'].includes(
      entry.status,
    );
    if (!editable) {
      throw new BadRequestException(
        'Phone can only be updated while you are still in the queue',
      );
    }

    if (dto.trackingToken) {
      const ok = this.realtimeCredentials.verifyEntryTrackingToken(
        dto.trackingToken,
        entryId,
      );
      if (!ok) {
        throw new BadRequestException('Invalid tracking token');
      }
    }

    let phone: string;
    try {
      phone = PhoneNumber.create(dto.phone).value;
    } catch {
      throw new BadRequestException('Invalid phone number');
    }

    const conflict = await this.prisma.customer.findFirst({
      where: {
        businessId: entry.customer.businessId,
        phone,
        deletedAt: null,
        NOT: { id: entry.customerId },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new BadRequestException(
        'That phone number is already used by another guest at this venue',
      );
    }

    await this.prisma.customer.update({
      where: { id: entry.customerId },
      data: {
        phone,
        // Prefer WhatsApp when the guest edits the number from WhatsApp Updates.
        // Entry-level preference drives outbound templates.
      },
    });

    await this.prisma.queueEntry.update({
      where: { id: entry.id },
      data: { notificationPreference: 'WHATSAPP' },
    });

    const digits = phone.replace(/\D/g, '');
    const last3 = digits.slice(-3);
    const masked =
      digits.length >= 10
        ? `+${digits.slice(0, 2)} *** *** *${last3}`
        : `*** *** *${last3 || '***'}`;

    return {
      entryId: entry.id,
      phone,
      phoneMasked: masked,
      notificationPreference: 'WHATSAPP' as const,
    };
  }

  async submitFeedback(dto: SubmitFeedbackDto) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id: dto.queueEntryId, deletedAt: null },
      include: { feedback: true },
    });
    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }
    if (entry.status !== 'COMPLETED') {
      throw new BadRequestException('Feedback is only available after service is completed');
    }

    if (entry.feedback) {
      return this.prisma.feedback.update({
        where: { id: entry.feedback.id },
        data: {
          rating: dto.rating,
          comment: dto.comment,
          status: FeedbackStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });
    }

    return this.prisma.feedback.create({
      data: {
        businessId: entry.businessId,
        branchId: entry.branchId,
        customerId: entry.customerId,
        queueEntryId: entry.id,
        rating: dto.rating,
        comment: dto.comment,
        status: FeedbackStatus.SUBMITTED,
        submittedAt: new Date(),
        createdBy: entry.customerId,
      },
    });
  }

  async getBusinessMenu(businessId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: {
        id: true,
        name: true,
        settings: { select: { guestMenu: true } },
      },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    const menu = normalizeGuestMenu(business.settings?.guestMenu ?? null);
    return {
      businessId: business.id,
      businessName: business.name,
      menu,
      isDefault: business.settings?.guestMenu == null,
    };
  }

  getWebPushPublicKey() {
    const publicKey = this.webPush.getPublicKey();
    if (!publicKey) {
      throw new ServiceUnavailableException('Web push is not configured');
    }
    return { publicKey, enabled: true };
  }

  async subscribeWebPush(dto: SubscribeWebPushDto, userAgent?: string) {
    if (!this.webPush.isEnabled()) {
      throw new ServiceUnavailableException('Web push is not configured');
    }
    if (dto.trackingToken) {
      const ok = this.realtimeCredentials.verifyEntryTrackingToken(
        dto.trackingToken,
        dto.entryId,
      );
      if (!ok) {
        throw new BadRequestException('Invalid tracking token');
      }
    }
    try {
      return await this.webPush.upsertSubscription({
        entryId: dto.entryId,
        endpoint: dto.endpoint,
        keys: dto.keys,
        userAgent,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'ENTRY_NOT_FOUND') {
        throw new NotFoundException('Queue entry not found');
      }
      throw err;
    }
  }
}
