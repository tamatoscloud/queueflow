import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../../../common/prisma/prisma.service';

export type WebPushSubscribeInput = {
  entryId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
};

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private enabled = false;
  private publicKey: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
    const subject =
      process.env.WEB_PUSH_VAPID_SUBJECT?.trim() || 'mailto:ops@queueflow.app';

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'WEB_PUSH_VAPID_PUBLIC_KEY / WEB_PUSH_VAPID_PRIVATE_KEY not set — browser push disabled',
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.publicKey = publicKey;
    this.enabled = true;
    this.logger.log('Web Push (VAPID) configured');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  async upsertSubscription(input: WebPushSubscribeInput): Promise<{ ok: true }> {
    const entry = await this.prisma.queueEntry.findFirst({
      where: { id: input.entryId, deletedAt: null },
      select: { id: true, businessId: true, customerId: true },
    });
    if (!entry) {
      throw new Error('ENTRY_NOT_FOUND');
    }

    await this.prisma.webPushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        businessId: entry.businessId,
        customerId: entry.customerId,
        queueEntryId: entry.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
      },
      update: {
        businessId: entry.businessId,
        customerId: entry.customerId,
        queueEntryId: entry.id,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent ?? null,
      },
    });
    return { ok: true };
  }

  async removeByEndpoint(endpoint: string): Promise<void> {
    await this.prisma.webPushSubscription.deleteMany({ where: { endpoint } });
  }

  async sendToEntry(
    entryId: string,
    notification: { title: string; body: string; tag?: string; url?: string },
  ): Promise<{ attempted: number; delivered: number }> {
    if (!this.enabled) {
      return { attempted: 0, delivered: 0 };
    }

    const subs = await this.prisma.webPushSubscription.findMany({
      where: { queueEntryId: entryId },
    });
    if (subs.length === 0) {
      this.logger.debug(`No web-push subscriptions for entry ${entryId}`);
      return { attempted: 0, delivered: 0 };
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      tag: notification.tag ?? `queueflow-${entryId}`,
      url: notification.url ?? `/track/${entryId}`,
      entryId,
    });

    // High urgency + short TTL so "you're called" reaches lock screens promptly.
    const options: webpush.RequestOptions = {
      TTL: 120,
      urgency: 'high',
      topic: `qf-call-${entryId}`.slice(0, 32),
    };

    let delivered = 0;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            options,
          );
          delivered += 1;
        } catch (err) {
          const statusCode =
            err && typeof err === 'object' && 'statusCode' in err
              ? Number((err as { statusCode: number }).statusCode)
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.webPushSubscription.deleteMany({
              where: { id: sub.id },
            });
            this.logger.warn(
              `Removed stale web-push subscription for entry ${entryId} (${statusCode})`,
            );
            return;
          }
          this.logger.warn(
            `Web push failed for entry ${entryId}: ${String(err)}`,
          );
        }
      }),
    );

    this.logger.log(
      `Web push entry=${entryId} attempted=${subs.length} delivered=${delivered}`,
    );
    return { attempted: subs.length, delivered };
  }
}
