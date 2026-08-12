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
import { RealtimeRooms } from '../constants/rooms';
import { RealtimeSubscribe } from '../constants/socket-events';
import {
  type AuthenticatedSocket,
  SocketAuthService,
} from '../services/socket-auth.service';
import { QueueRealtimeEmitterService } from '../services/queue-realtime-emitter.service';
import { RealtimeSubscriptionAuthorizer } from '../services/realtime-subscription-authorizer.service';
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
    private readonly subscriptionAuth: RealtimeSubscriptionAuthorizer,
    private readonly emitter: QueueRealtimeEmitterService,
  ) {}

  afterInit(server: Server): void {
    this.emitter.bindServer(server);
    this.logger.log('Queue realtime gateway initialized at /realtime');
  }

  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    try {
      await this.socketAuth.authenticateHandshake(socket);
      this.logger.debug(
        `Client connected ${socket.id} staff=${socket.data?.isStaff ?? false}`,
      );
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
    @MessageBody() body: { entryId?: string; trackingToken?: string },
  ): Promise<{ ok: boolean; room?: string; error?: string }> {
    try {
      const entryId = body?.entryId;
      if (!entryId) return { ok: false, error: 'entryId required' };

      await this.subscriptionAuth.authorizeEntrySubscription(
        socket,
        entryId,
        body?.trackingToken,
      );

      const room = RealtimeRooms.entry(entryId);
      await socket.join(room);
      return { ok: true, room };
    } catch (err) {
      return this.subscriptionError(err);
    }
  }

  @SubscribeMessage(RealtimeSubscribe.Queue)
  async subscribeQueue(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { queueId?: string },
  ): Promise<{ ok: boolean; room?: string; error?: string }> {
    try {
      const queueId = body?.queueId;
      if (!queueId) return { ok: false, error: 'queueId required' };

      await this.subscriptionAuth.authorizeQueueSubscription(socket, queueId);

      const room = RealtimeRooms.queue(queueId);
      await socket.join(room);
      return { ok: true, room };
    } catch (err) {
      return this.subscriptionError(err);
    }
  }

  @SubscribeMessage(RealtimeSubscribe.QueueDisplay)
  async subscribeQueueDisplay(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { queueId?: string; displayToken?: string },
  ): Promise<{ ok: boolean; room?: string; error?: string }> {
    try {
      const queueId = body?.queueId;
      if (!queueId) return { ok: false, error: 'queueId required' };

      await this.subscriptionAuth.authorizeQueueDisplaySubscription(
        socket,
        queueId,
        body?.displayToken,
      );

      const room = RealtimeRooms.queueDisplay(queueId);
      await socket.join(room);
      return { ok: true, room };
    } catch (err) {
      return this.subscriptionError(err);
    }
  }

  @SubscribeMessage(RealtimeSubscribe.BusinessDashboard)
  async subscribeBusinessDashboard(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { businessId?: string },
  ): Promise<{ ok: boolean; room?: string; error?: string }> {
    try {
      const businessId = body?.businessId;
      if (!businessId) return { ok: false, error: 'businessId required' };
      await this.subscriptionAuth.validateStaffSession(socket);
      this.socketAuth.assertBusinessAccess(socket, businessId);
      const room = RealtimeRooms.businessDashboard(businessId);
      await socket.join(room);
      return { ok: true, room };
    } catch (err) {
      return this.subscriptionError(err);
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
      await this.subscriptionAuth.validateStaffSession(socket);
      this.socketAuth.assertBusinessAccess(socket, businessId);
      const room = RealtimeRooms.businessQueues(businessId);
      await socket.join(room);
      return { ok: true, room };
    } catch (err) {
      return this.subscriptionError(err);
    }
  }

  @SubscribeMessage(RealtimeSubscribe.QueueDetail)
  async subscribeQueueDetail(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { queueId?: string; businessId?: string },
  ): Promise<{ ok: boolean; room?: string; error?: string }> {
    try {
      const queueId = body?.queueId;
      if (!queueId) {
        return { ok: false, error: 'queueId required' };
      }

      await this.subscriptionAuth.authorizeQueueSubscription(socket, queueId);

      const room = RealtimeRooms.queueDetail(queueId);
      await socket.join(room);
      return { ok: true, room };
    } catch (err) {
      return this.subscriptionError(err);
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

  private subscriptionError(err: unknown): { ok: false; error: string } {
    if (err instanceof UnauthorizedException) {
      return { ok: false, error: err.message };
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Forbidden' };
  }
}
