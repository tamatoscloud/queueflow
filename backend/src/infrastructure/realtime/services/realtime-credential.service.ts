import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const RealtimeCredentialType = {
  EntryTracking: 'entry_tracking',
  QueueDisplay: 'queue_display',
} as const;

type RealtimeCredentialPayload = {
  type: (typeof RealtimeCredentialType)[keyof typeof RealtimeCredentialType];
  sub: string;
};

@Injectable()
export class RealtimeCredentialService {
  private readonly entryTrackingTtlSeconds: number;
  private readonly displayTtlSeconds: number;

  constructor(private readonly jwt: JwtService) {
    this.entryTrackingTtlSeconds = Number(
      process.env.ENTRY_TRACKING_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 7,
    );
    this.displayTtlSeconds = Number(
      process.env.QUEUE_DISPLAY_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 365,
    );
  }

  issueEntryTrackingToken(entryId: string): string {
    return this.jwt.sign(
      { type: RealtimeCredentialType.EntryTracking, sub: entryId },
      { expiresIn: this.entryTrackingTtlSeconds },
    );
  }

  issueQueueDisplayToken(queueId: string): string {
    return this.jwt.sign(
      { type: RealtimeCredentialType.QueueDisplay, sub: queueId },
      { expiresIn: this.displayTtlSeconds },
    );
  }

  verifyEntryTrackingToken(token: string, entryId: string): boolean {
    return this.verify(token, RealtimeCredentialType.EntryTracking, entryId);
  }

  verifyQueueDisplayToken(token: string, queueId: string): boolean {
    return this.verify(token, RealtimeCredentialType.QueueDisplay, queueId);
  }

  private verify(
    token: string,
    expectedType: RealtimeCredentialPayload['type'],
    expectedSub: string,
  ): boolean {
    try {
      const payload = this.jwt.verify<RealtimeCredentialPayload>(token);
      return payload.type === expectedType && payload.sub === expectedSub;
    } catch {
      return false;
    }
  }
}
