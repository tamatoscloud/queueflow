import { Inject, Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { NOTIFICATION_PROVIDER_REGISTRY } from '../../../common/di/tokens';
import type { NotificationProviderAdapter } from '../domain/notification-provider.interface';

@Injectable()
export class NotificationProviderRegistry {
  constructor(
    @Inject(NOTIFICATION_PROVIDER_REGISTRY)
    private readonly providers: NotificationProviderAdapter[],
  ) {}

  resolve(channel: NotificationChannel): NotificationProviderAdapter {
    const useMock = process.env.NOTIFICATION_USE_MOCK === 'true';
    if (useMock) {
      return this.providers.find((p) => p.name === 'mock')!;
    }
    const match = this.providers.find((p) => p.supports(channel) && p.name !== 'mock');
    if (match) return match;
    return this.providers.find((p) => p.name === 'mock')!;
  }
}
