import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import type { Server } from 'socket.io';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RealtimeRooms } from '../constants/rooms';
import { RealtimeSubscribe } from '../constants/socket-events';
import {
  type AuthenticatedSocket,
  SocketAuthService,
} from '../services/socket-auth.service';
import { QueueRealtimeEmitterService } from '../services/queue-realtime-emitter.service';
import { socketCorsOrigins } from '../../../common/http/cors.util';

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: socketCorsOrigins(), credentials: true },
})
export class QueueRealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(QueueRealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly socketAuth: SocketAuthService,
    private readonly emitter: QueueRealtimeEmitterService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server): void {
    this.emitter.bindServer(server);
    this.logger.log('Queue realtime gateway initialized at /realtime');
  }

  handleConnection(socket: AuthenticatedSocket): void {
    try {
      this.socketAuth.authenticateHandshake(socket);
      this.logger.debug(`Client connected ${socket.id} staff=${socket.data?.isStaff ?? false}`);
    } catch (err) {
      this.logger.warn(`Rejected socket ${socket.id}: ${String(err)}`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: AuthenticatedSocket): void {
    this.logger.debug(`Client disconnected ${socket.id}`);
  }

  @SubscribeMessage(RealtimeSubscribe.Entry)
  async subscribeEntry(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { entryId?: string },
  ): Promise<{ ok: boolean; room?: string; error?: string }> {
    const entryId = body?.entryId;
    if (!entryId) return { ok: false, error: 'entryId required' };

    const entry = await this.prisma.queueEntry.findFirst({
      where: { id: entryId, deletedAt: null },
      select: { id: true },
    });
    if (!entry) return { ok: false, error: 'Entry not found' };

    const room = RealtimeRooms.entry(entryId);
    await socket.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage(RealtimeSubscribe.Queue)
  async subscribeQueue(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { queueId?: string },
  ): Promise<{ ok: boolean; room?: string; error?: string }> {
    const queueId = body?.queueId;
    if (!queueId) return { ok: false, error: 'queueId required' };

    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, deletedAt: null },
      select: { id: true },
    });
    if (!queue) return { ok: false, error: 'Queue not found' };

    const room = RealtimeRooms.queue(queueId);
    await socket.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage(RealtimeSubscribe.QueueDisplay)
  async subscribeQueueDisplay(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { queueId?: string },
  ): Promise<{ ok: boolean; room?: string; error?: string }> {
    const queueId = body?.queueId;
    if (!queueId) return { ok: false, error: 'queueId required' };

    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, deletedAt: null },
      select: { id: true },
    });
    if (!queue) return { ok: false, error: 'Queue not found' };

    const room = RealtimeRooms.queueDisplay(queueId);
    await socket.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage(RealtimeSubscribe.BusinessDashboard)
  async subscribeBusinessDashboard(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { businessId?: string },
  ): Promise<{ ok: boolean; room?: string; error?: string }> {
    try {
      const businessId = body?.businessId;
      if (!businessId) return { ok: false, error: 'businessId required' };
      this.socketAuth.assertBusinessAccess(socket, businessId);
      const room = RealtimeRooms.businessDashboard(businessId);
      await socket.join(room);
      return { ok: true, room };
    } catch (err) {
      return { ok: false, error: err instanceof UnauthorizedException ? err.message : 'Forbidden' };
    }
  }

  @SubscribeMessage(RealtimeSubscribe.BusinessQueues)
  async subscribeBusinessQueues(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { businessId?: string },
  ): Promise<{ ok: boolean; room?: string; error?: string }> {
    try {
      const businessId = body?.businessId;
      if (!businessId) return { ok: false, error: 'businessId required' };
      this.socketAuth.assertBusinessAccess(socket, businessId);
      const room = RealtimeRooms.businessQueues(businessId);
      await socket.join(room);
      return { ok: true, room };
    } catch (err) {
      return { ok: false, error: err instanceof UnauthorizedException ? err.message : 'Forbidden' };
    }
  }

  @SubscribeMessage(RealtimeSubscribe.QueueDetail)
  async subscribeQueueDetail(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { queueId?: string; businessId?: string },
  ): Promise<{ ok: boolean; room?: string; error?: string }> {
    try {
      const { queueId, businessId } = body ?? {};
      if (!queueId || !businessId) {
        return { ok: false, error: 'queueId and businessId required' };
      }
      this.socketAuth.assertQueuePermission(socket, businessId);

      const queue = await this.prisma.queue.findFirst({
        where: { id: queueId, businessId, deletedAt: null },
        select: { id: true },
      });
      if (!queue) return { ok: false, error: 'Queue not found' };

      const room = RealtimeRooms.queueDetail(queueId);
      await socket.join(room);
      return { ok: true, room };
    } catch (err) {
      return { ok: false, error: err instanceof UnauthorizedException ? err.message : 'Forbidden' };
    }
  }

  @SubscribeMessage(RealtimeSubscribe.Unsubscribe)
  async unsubscribe(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { room?: string },
  ): Promise<{ ok: boolean }> {
    if (body?.room) {
      await socket.leave(body.room);
    }
    return { ok: true };
  }
}
