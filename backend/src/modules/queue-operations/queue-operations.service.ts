import { ForbiddenException, Inject, Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  QueueEngineService,
  QueueEntrySource,
} from '../../queue-engine';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantScopeService } from '../../common/tenant/tenant-scope.service';
import { RealtimeCredentialService } from '../../infrastructure/realtime/services/realtime-credential.service';
import type {
  JoinQueueDto,
  MarkNoShowDto,
  MoveCustomerDto,
  PromotePriorityDto,
  TransferCustomerDto,
  WalkInCustomerDto,
} from './dto/queue-operations.dto';
import { QueueSnapshotEnrichmentService } from './queue-snapshot-enrichment.service';
import { Permission } from '../auth/constants/roles-permissions';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interfaces';

const PRIVATE_SNAPSHOT_PERMISSIONS = new Set<string>([
  Permission.QUEUE_OPERATE,
  Permission.QUEUE_MANAGE,
  Permission.REPORTS_VIEW,
]);

export function toPublicQueueSnapshot<T extends { entries: readonly unknown[] }>(snapshot: T) {
  return {
    ...snapshot,
    entries: snapshot.entries.map((raw) => {
      const entry = raw as {
        displayCode?: unknown;
        status?: unknown;
        partySize?: unknown;
        estimatedWaitMinutes?: unknown;
        serviceMode?: unknown;
      };
      return {
        displayCode: entry.displayCode,
        status: entry.status,
        partySize: entry.partySize,
        estimatedWaitMinutes: entry.estimatedWaitMinutes,
        serviceMode: entry.serviceMode,
      };
    }),
  };
}

function canSeePrivateSnapshot(actor?: Pick<AuthenticatedUser, 'permissions' | 'isPlatformAdmin'>) {
  if (!actor) return false;
  if (actor.isPlatformAdmin) return true;
  return actor.permissions.some((p) => PRIVATE_SNAPSHOT_PERMISSIONS.has(p));
}

@Injectable()
export class QueueOperationsService {
  constructor(
    @Inject(QueueEngineService) private readonly engine: QueueEngineService,
    private readonly snapshotEnrichment: QueueSnapshotEnrichmentService,
    private readonly tenantScope: TenantScopeService,
    private readonly realtimeCredentials: RealtimeCredentialService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async join(queueId: string, dto: JoinQueueDto) {
    const result = await this.engine.joinQueue({
      queueId,
      fullName: dto.fullName,
      phone: dto.phone,
      partySize: dto.partySize,
      notes: dto.notes,
      notificationPreference: dto.notificationPreference,
      source: QueueEntrySource.QR_LANDING,
      isVip: false,
      bypassOperatingHours: false,
    });

    if (dto.metadata && this.prisma) {
      await this.prisma.queueEntry.update({
        where: { id: result.entryId },
        data: { metadata: dto.metadata as Prisma.InputJsonValue },
      });
    }

    return {
      ...result,
      trackingToken: this.realtimeCredentials.issueEntryTrackingToken(result.entryId),
    };
  }

  async walkIn(queueId: string, dto: WalkInCustomerDto) {
    await this.tenantScope.requireQueue(queueId);
    return this.engine.walkInCustomer({
      queueId,
      fullName: dto.fullName,
      phone: dto.phone,
      partySize: dto.partySize,
      notes: dto.notes,
      notificationPreference: dto.notificationPreference,
      isVip: dto.isVip,
      priority: dto.priority,
      bypassOperatingHours: dto.bypassOperatingHours ?? true,
    });
  }

  async callNext(queueId: string) {
    await this.tenantScope.requireQueue(queueId);
    return this.engine.callNextCustomer(queueId).then((e) => e.toProps());
  }

  async hold(entryId: string) {
    await this.tenantScope.requireQueueEntry(entryId);
    return this.engine.holdCustomer(entryId).then((e) => e.toProps());
  }

  async resumeHeld(entryId: string) {
    await this.tenantScope.requireQueueEntry(entryId);
    return this.engine.resumeHeldCustomer(entryId).then((e) => e.toProps());
  }

  async skip(entryId: string) {
    await this.tenantScope.requireQueueEntry(entryId);
    return this.engine.skipCustomer(entryId).then((e) => e.toProps());
  }

  async recall(entryId: string) {
    await this.tenantScope.requireQueueEntry(entryId);
    // Manual staff "Call again" must work immediately (cooldown is for automation).
    return this.engine
      .recallCustomer(entryId, { force: true })
      .then((e) => e.toProps());
  }

  async complete(entryId: string) {
    await this.tenantScope.requireQueueEntry(entryId);
    return this.engine.completeCustomer(entryId).then((e) => e.toProps());
  }

  async cancel(entryId: string) {
    await this.tenantScope.requireQueueEntry(entryId);
    return this.engine.cancelQueueEntry(entryId).then((e) => e.toProps());
  }

  async markNoShow(entryId: string, dto: MarkNoShowDto) {
    await this.tenantScope.requireQueueEntry(entryId);
    return this.engine
      .markNoShow(entryId, { force: dto.force })
      .then((e) => e.toProps());
  }

  async move(entryId: string, dto: MoveCustomerDto) {
    await this.tenantScope.requireQueueEntry(entryId);
    return this.engine
      .moveCustomer(entryId, {
        beforeEntryId: dto.beforeEntryId,
        afterEntryId: dto.afterEntryId,
      })
      .then((e) => e.toProps());
  }

  async transfer(entryId: string, dto: TransferCustomerDto) {
    const entry = await this.tenantScope.requireQueueEntry(entryId);
    const targetQueue = await this.tenantScope.requireQueue(dto.targetQueueId);
    if (targetQueue.businessId !== entry.businessId) {
      throw new ForbiddenException('TENANT_ACCESS_DENIED');
    }
    return this.engine
      .transferCustomer(entryId, dto.targetQueueId)
      .then((e) => e.toProps());
  }

  async promote(entryId: string, dto: PromotePriorityDto) {
    await this.tenantScope.requireQueueEntry(entryId);
    return this.engine
      .priorityCustomer(entryId, {
        priority: dto.priority,
        isVip: dto.isVip,
      })
      .then((e) => e.toProps());
  }

  async snapshot(
    queueId: string,
    actor?: Pick<AuthenticatedUser, 'permissions' | 'isPlatformAdmin'>,
  ) {
    if (canSeePrivateSnapshot(actor)) {
      await this.tenantScope.requireQueue(queueId);
    }
    const snapshot = await this.engine
      .getLiveQueueSnapshot(queueId)
      .then((s) => this.snapshotEnrichment.enrich(s));
    return canSeePrivateSnapshot(actor) ? snapshot : toPublicQueueSnapshot(snapshot);
  }

  async metrics(queueId: string) {
    await this.tenantScope.requireQueue(queueId);
    return this.engine.calculateQueueMetrics(queueId);
  }

  estimateWait(entryId: string) {
    return this.engine.estimateWaitTime(entryId);
  }
}
