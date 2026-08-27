import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { DomainEvent } from '../../../queue-engine';
import { QueueEngineService } from '../../../queue-engine';
import { EVENT_BUS } from '../../../common/di/tokens';
import { NestEventBus } from '../../events/nest-event-bus';
import {
  DOMAIN_TO_REALTIME,
  WAIT_AFFECTING_DOMAIN_EVENTS,
} from '../constants/domain-mapping';
import type { EstimatedWaitPayload, RealtimeEnvelope } from '../constants/socket-events';
import { QueueRealtimeEmitterService } from './queue-realtime-emitter.service';

const ESTIMATED_WAIT_DEBOUNCE_MS = 350;

@Injectable()
export class QueueRealtimeBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueRealtimeBridgeService.name);
  private unsubscribe: (() => void) | null = null;
  private readonly estimatedWaitTimers = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; businessId: string }
  >();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: NestEventBus,
    private readonly emitter: QueueRealtimeEmitterService,
    private readonly engine: QueueEngineService,
  ) {}

  onModuleInit(): void {
    const sub = this.eventBus.subscribe('*', (event) => this.handleDomainEvent(event));
    this.unsubscribe = sub.unsubscribe;
    this.logger.log('Subscribed to Queue Engine domain events');
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
    for (const pending of this.estimatedWaitTimers.values()) {
      clearTimeout(pending.timer);
    }
    this.estimatedWaitTimers.clear();
  }

  async handleDomainEvent(event: DomainEvent): Promise<void> {
    const wireEvent = DOMAIN_TO_REALTIME[event.type];
    if (wireEvent) {
      const envelope = this.toEnvelope(event, wireEvent);
      const queueId = event.aggregateId;
      this.emitter.emitToQueue(queueId, wireEvent, envelope);
      this.emitter.emitToBusiness(event.businessId, wireEvent, envelope);

      const entryId = event.payload.entryId;
      if (typeof entryId === 'string') {
        this.emitter.emitToEntry(entryId, wireEvent, envelope);
      }
    }

    if (WAIT_AFFECTING_DOMAIN_EVENTS.has(event.type)) {
      this.scheduleEstimatedWait(event.aggregateId, event.businessId);
    }
  }

  private scheduleEstimatedWait(queueId: string, businessId: string): void {
    const existing = this.estimatedWaitTimers.get(queueId);
    if (existing) {
      clearTimeout(existing.timer);
    }
    const timer = setTimeout(() => {
      this.estimatedWaitTimers.delete(queueId);
      void this.emitEstimatedWait(queueId, businessId);
    }, ESTIMATED_WAIT_DEBOUNCE_MS);
    this.estimatedWaitTimers.set(queueId, { timer, businessId });
  }

  private toEnvelope(
    event: DomainEvent,
    wireEvent: RealtimeEnvelope['event'],
  ): RealtimeEnvelope {
    return {
      event: wireEvent,
      occurredAt: event.occurredAt.toISOString(),
      businessId: event.businessId,
      queueId: event.aggregateId,
      payload: { ...event.payload },
    };
  }

  private async emitEstimatedWait(queueId: string, businessId: string): Promise<void> {
    try {
      const snapshot = await this.engine.getLiveQueueSnapshot(queueId);
      const waitingOrdered = snapshot.entries
        .filter((e) => e.status === 'WAITING' || e.status === 'HOLDING' || e.status === 'SKIPPED')
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

      // Derive ETA from the snapshot — avoid N× estimateWaitTime DB round-trips.
      const entries = waitingOrdered.map((entry) => {
        const position = entry.position ?? 0;
        const customersAhead =
          entry.status === 'WAITING' ? Math.max(0, position - 1) : 0;
        return {
          entryId: entry.id,
          position,
          estimatedWaitMinutes: entry.estimatedWaitMinutes ?? 0,
          customersAhead,
        };
      });

      const payload: EstimatedWaitPayload = {
        queueId,
        businessId,
        generatedAt: snapshot.generatedAt.toISOString(),
        waitingCount: snapshot.metrics.waitingCount,
        averageServiceTimeMinutes: snapshot.averageServiceTimeMinutes,
        entries,
      };

      this.emitter.emitEstimatedWait(queueId, businessId, payload);
    } catch (err) {
      this.logger.warn(`Failed to emit EstimatedWaitChanged for queue ${queueId}: ${String(err)}`);
    }
  }
}
