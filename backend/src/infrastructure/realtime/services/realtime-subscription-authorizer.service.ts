import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthService } from '../../../modules/auth/auth.service';
import { Permission } from '../../../modules/auth/constants/roles-permissions';
import { RealtimeCredentialService } from './realtime-credential.service';
import type { AuthenticatedSocket } from './socket-auth.service';
import { SocketAuthService } from './socket-auth.service';

@Injectable()
export class RealtimeSubscriptionAuthorizer {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketAuth: SocketAuthService,
    private readonly credentials: RealtimeCredentialService,
    private readonly authService: AuthService,
  ) {}

  async validateStaffSession(socket: AuthenticatedSocket): Promise<void> {
    const user = this.socketAuth.assertStaff(socket);
    await this.authService.validateSession(user.sessionId);
  }

  async authorizeEntrySubscription(
    socket: AuthenticatedSocket,
    entryId: string,
    trackingToken?: string,
  ) {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id: entryId, deletedAt: null },
      select: { id: true, businessId: true, queueId: true },
    });
    if (!entry) {
      throw new NotFoundException('Entry not found');
    }

    if (socket.data?.isStaff && socket.data.user) {
      await this.validateStaffSession(socket);
      this.socketAuth.assertEntryBusinessAccess(socket, entry.businessId);
      return entry;
    }

    if (
      !trackingToken ||
      !this.credentials.verifyEntryTrackingToken(trackingToken, entryId)
    ) {
      throw new UnauthorizedException('Valid entry tracking credential required');
    }

    return entry;
  }

  async authorizeQueueSubscription(socket: AuthenticatedSocket, queueId: string) {
    await this.validateStaffSession(socket);
    const user = this.socketAuth.assertStaff(socket);

    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, deletedAt: null },
      select: { id: true, businessId: true },
    });
    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    this.socketAuth.assertQueuePermission(socket, queue.businessId);

    if (!user.isPlatformAdmin && user.businessId !== queue.businessId) {
      throw new UnauthorizedException('Business access denied');
    }

    return queue;
  }

  async authorizeQueueDisplaySubscription(
    socket: AuthenticatedSocket,
    queueId: string,
    displayToken?: string,
  ) {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, deletedAt: null },
      select: { id: true, businessId: true },
    });
    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    if (socket.data?.isStaff && socket.data.user) {
      await this.validateStaffSession(socket);
      this.socketAuth.assertQueuePermission(socket, queue.businessId);
      if (
        !socket.data.user.isPlatformAdmin &&
        socket.data.user.businessId !== queue.businessId
      ) {
        throw new UnauthorizedException('Business access denied');
      }
      return queue;
    }

    if (
      !displayToken ||
      !this.credentials.verifyQueueDisplayToken(displayToken, queueId)
    ) {
      throw new UnauthorizedException('Valid queue display credential required');
    }

    return queue;
  }
}
