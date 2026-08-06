import type { NotificationChannel } from '@prisma/client';
import type { ProviderSendRequest, ProviderSendResult } from './notification.types';

export interface NotificationProviderAdapter {
  readonly name: string;
  supports(channel: NotificationChannel): boolean;
  send(request: ProviderSendRequest): Promise<ProviderSendResult>;
}
