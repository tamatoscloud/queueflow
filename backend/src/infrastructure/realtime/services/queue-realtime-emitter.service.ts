import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { RealtimeRooms } from '../constants/rooms';
import type { EstimatedWaitPayload, RealtimeEnvelope, RealtimeEventName } from '../constants/socket-events';

@Injectable()
export class QueueRealtimeEmitterService {
  private server: Server | null = null;

  bindServer(server: Server): void {
    this.server = server;
  }

  emitToQueue(queueId: string, event: RealtimeEventName, envelope: RealtimeEnvelope): void {
    this.emit(RealtimeRooms.queue(queueId), event, envelope);
    this.emit(RealtimeRooms.queueDetail(queueId), event, envelope);
    this.emit(RealtimeRooms.queueDisplay(queueId), event, envelope);
  }

  emitToEntry(entryId: string, event: RealtimeEventName, envelope: RealtimeEnvelope): void {
    this.emit(RealtimeRooms.entry(entryId), event, envelope);
  }

  emitToBusiness(businessId: string, event: RealtimeEventName, envelope: RealtimeEnvelope): void {
    this.emit(RealtimeRooms.businessDashboard(businessId), event, envelope);
    this.emit(RealtimeRooms.businessQueues(businessId), event, envelope);
  }

  emitEstimatedWait(queueId: string, businessId: string, payload: EstimatedWaitPayload): void {
    const envelope: RealtimeEnvelope<EstimatedWaitPayload> = {
      event: 'EstimatedWaitChanged',
      occurredAt: payload.generatedAt,
      businessId,
      queueId,
      payload,
    };
    this.emitToQueue(queueId, 'EstimatedWaitChanged', envelope);
    this.emitToBusiness(businessId, 'EstimatedWaitChanged', envelope);

    for (const entry of payload.entries) {
      this.emitToEntry(entry.entryId, 'EstimatedWaitChanged', {
        ...envelope,
        payload: { ...payload, entries: [entry] },
      });
    }
  }

  private emit(room: string, event: RealtimeEventName, envelope: RealtimeEnvelope): void {
    if (!this.server) return;
    this.server.to(room).emit(event, envelope);
  }
}
