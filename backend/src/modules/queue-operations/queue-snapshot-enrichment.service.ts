import { Injectable, Optional } from '@nestjs/common';
import type { ServiceMode } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  LiveQueueEntrySnapshot,
  LiveQueueSnapshot,
} from '../../queue-engine';
import { normalizeEntryMetadata } from './utils/entry-metadata.util';

export type EnrichedLiveQueueEntrySnapshot = LiveQueueEntrySnapshot & {
  notes: string | null;
  metadata: ReturnType<typeof normalizeEntryMetadata>;
  serviceMode: ServiceMode;
};

export type EnrichedLiveQueueSnapshot = LiveQueueSnapshot & {
  serviceMode: ServiceMode;
  entries: EnrichedLiveQueueEntrySnapshot[];
};

@Injectable()
export class QueueSnapshotEnrichmentService {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async enrich(snapshot: LiveQueueSnapshot): Promise<EnrichedLiveQueueSnapshot> {
    if (!this.prisma) {
      return {
        ...snapshot,
        serviceMode: 'DINE_IN',
        entries: snapshot.entries.map((e) => ({
          ...e,
          notes: null,
          metadata: {},
          serviceMode: 'DINE_IN' as ServiceMode,
        })),
      };
    }

    const queue = await this.prisma.queue.findFirst({
      where: { id: snapshot.queueId, deletedAt: null },
      select: { serviceMode: true },
    });
    const serviceMode = queue?.serviceMode ?? 'DINE_IN';

    const entryIds = snapshot.entries.map((e) => e.id);
    const rows =
      entryIds.length === 0
        ? []
        : await this.prisma.queueEntry.findMany({
            where: { id: { in: entryIds }, deletedAt: null },
            select: { id: true, notes: true, metadata: true },
          });
    const byId = new Map(rows.map((r) => [r.id, r]));

    const entries: EnrichedLiveQueueEntrySnapshot[] = snapshot.entries.map((e) => {
      const row = byId.get(e.id);
      const notes = row?.notes ?? null;
      const metadata = normalizeEntryMetadata(row?.metadata, notes, serviceMode);
      return { ...e, notes, metadata, serviceMode };
    });

    return { ...snapshot, serviceMode, entries };
  }
}
