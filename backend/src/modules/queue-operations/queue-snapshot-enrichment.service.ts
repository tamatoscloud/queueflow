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

const serviceModeCache = new Map<string, { expiresAt: number; mode: ServiceMode }>();
const SERVICE_MODE_CACHE_TTL_MS = 60_000;

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
          notes: e.notes ?? null,
          metadata: normalizeEntryMetadata(e.metadata, e.notes ?? null, 'DINE_IN'),
          serviceMode: 'DINE_IN' as ServiceMode,
        })),
      };
    }

    const serviceMode = await this.resolveServiceMode(snapshot.queueId);

    // Notes/metadata are already hydrated on the live snapshot — avoid a
    // second findMany over every active entry id.
    const entries: EnrichedLiveQueueEntrySnapshot[] = snapshot.entries.map((e) => {
      const notes = e.notes ?? null;
      const metadata = normalizeEntryMetadata(e.metadata, notes, serviceMode);
      return { ...e, notes, metadata, serviceMode };
    });

    return { ...snapshot, serviceMode, entries };
  }

  private async resolveServiceMode(queueId: string): Promise<ServiceMode> {
    const cached = serviceModeCache.get(queueId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.mode;
    }
    const queue = await this.prisma!.queue.findFirst({
      where: { id: queueId, deletedAt: null },
      select: { serviceMode: true },
    });
    const mode = queue?.serviceMode ?? 'DINE_IN';
    serviceModeCache.set(queueId, {
      expiresAt: Date.now() + SERVICE_MODE_CACHE_TTL_MS,
      mode,
    });
    return mode;
  }
}
