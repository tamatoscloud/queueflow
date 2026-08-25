import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueueEngineService } from '../../queue-engine';
import {
  estimateWaitMinutesForCustomersAhead,
  SERVICE_SLOT_MINUTES,
} from '../../queue-engine/domain/services/wait-estimate-bounds';
import { RealtimeCredentialService } from '../../infrastructure/realtime/services/realtime-credential.service';
import type { SubmitFeedbackDto } from './dto/customer-portal.dto';
import { normalizeGuestMenu } from '../business/guest-menu';
import { normalizeEntryMetadata } from '../queue-operations/utils/entry-metadata.util';

const LANDING_CACHE_TTL_MS = 12_000;
const landingCache = new Map<string, { expiresAt: number; payload: unknown }>();

@Injectable()
export class CustomerPortalService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QueueEngineService) private readonly engine: QueueEngineService,
    private readonly realtimeCredentials: RealtimeCredentialService,
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
          include: {
            business: { select: { id: true, name: true, logoUrl: true } },
            branch: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }

    const snapshot = await this.engine.getLiveQueueSnapshot(entry.queueId);
    const self = snapshot.entries.find((e) => e.id === entryId);
    const waitingOrdered = snapshot.entries
      .filter((e) => e.status === 'WAITING')
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    const position =
      self?.position ??
      (entry.status === 'WAITING'
        ? (() => {
            const idx = waitingOrdered.findIndex((e) => e.id === entryId);
            return idx >= 0 ? idx + 1 : null;
          })()
        : null);
    const customersAhead =
      typeof position === 'number' && entry.status === 'WAITING'
        ? Math.max(0, position - 1)
        : 0;
    const estimatedWaitMinutes =
      entry.status === 'WAITING'
        ? (self?.estimatedWaitMinutes ??
          estimateWaitMinutesForCustomersAhead(customersAhead))
        : (self?.estimatedWaitMinutes ?? entry.estimatedWaitMinutes ?? 0);

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
      position: position ?? 0,
      customersAhead,
      estimatedWaitMinutes,
      averageServiceTimeMinutes: SERVICE_SLOT_MINUTES,
      snapshotGeneratedAt: snapshot.generatedAt,
      trackingToken: this.realtimeCredentials.issueEntryTrackingToken(entry.id),
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
}
