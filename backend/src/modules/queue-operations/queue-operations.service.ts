import { Inject, Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  QueueEngineService,
  QueueEntrySource,
} from '../../queue-engine';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  JoinQueueDto,
  MarkNoShowDto,
  MoveCustomerDto,
  PromotePriorityDto,
  TransferCustomerDto,
  WalkInCustomerDto,
} from './dto/queue-operations.dto';
import { QueueSnapshotEnrichmentService } from './queue-snapshot-enrichment.service';

@Injectable()
export class QueueOperationsService {
  constructor(
    @Inject(QueueEngineService) private readonly engine: QueueEngineService,
    private readonly snapshotEnrichment: QueueSnapshotEnrichmentService,
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
      isVip: dto.isVip,
      priority: dto.priority,
      bypassOperatingHours: dto.bypassOperatingHours,
    });

    if (dto.metadata && this.prisma) {
      await this.prisma.queueEntry.update({
        where: { id: result.entryId },
        data: { metadata: dto.metadata as Prisma.InputJsonValue },
      });
    }

    return result;
  }

  walkIn(queueId: string, dto: WalkInCustomerDto) {
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

  callNext(queueId: string) {
    return this.engine.callNextCustomer(queueId).then((e) => e.toProps());
  }

  hold(entryId: string) {
    return this.engine.holdCustomer(entryId).then((e) => e.toProps());
  }

  resumeHeld(entryId: string) {
    return this.engine.resumeHeldCustomer(entryId).then((e) => e.toProps());
  }

  skip(entryId: string) {
    return this.engine.skipCustomer(entryId).then((e) => e.toProps());
  }

  recall(entryId: string) {
    return this.engine.recallCustomer(entryId).then((e) => e.toProps());
  }

  complete(entryId: string) {
    return this.engine.completeCustomer(entryId).then((e) => e.toProps());
  }

  cancel(entryId: string) {
    return this.engine.cancelQueueEntry(entryId).then((e) => e.toProps());
  }

  markNoShow(entryId: string, dto: MarkNoShowDto) {
    return this.engine
      .markNoShow(entryId, { force: dto.force })
      .then((e) => e.toProps());
  }

  move(entryId: string, dto: MoveCustomerDto) {
    return this.engine
      .moveCustomer(entryId, {
        beforeEntryId: dto.beforeEntryId,
        afterEntryId: dto.afterEntryId,
      })
      .then((e) => e.toProps());
  }

  transfer(entryId: string, dto: TransferCustomerDto) {
    return this.engine
      .transferCustomer(entryId, dto.targetQueueId)
      .then((e) => e.toProps());
  }

  promote(entryId: string, dto: PromotePriorityDto) {
    return this.engine
      .priorityCustomer(entryId, {
        priority: dto.priority,
        isVip: dto.isVip,
      })
      .then((e) => e.toProps());
  }

  snapshot(queueId: string) {
    return this.engine
      .getLiveQueueSnapshot(queueId)
      .then((s) => this.snapshotEnrichment.enrich(s));
  }

  metrics(queueId: string) {
    return this.engine.calculateQueueMetrics(queueId);
  }

  estimateWait(entryId: string) {
    return this.engine.estimateWaitTime(entryId);
  }
}
