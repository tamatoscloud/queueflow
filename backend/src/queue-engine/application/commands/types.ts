import type { QueueEntryStatus, QueueStatus } from '../../domain/enums';
import type { QueueMetrics, WaitEstimate } from '../../domain/value-objects';

export interface LiveQueueEntrySnapshot {
  id: string;
  displayCode: string;
  status: QueueEntryStatus;
  customerName: string;
  customerPhone: string;
  partySize: number;
  position: number | null;
  estimatedWaitMinutes: number | null;
  priority: number;
  isVip: boolean;
  sortOrder: number;
  source: string;
  joinedAt: Date;
  calledAt: Date | null;
  /** Inline enrichment — avoids a second Prisma round-trip on staff snapshot. */
  notes?: string | null;
  metadata?: unknown;
}

export interface LiveQueueSnapshot {
  queueId: string;
  businessId: string;
  branchId: string;
  name: string;
  status: QueueStatus;
  isAcceptingEntries: boolean;
  priorityEnabled: boolean;
  averageServiceTimeMinutes: number;
  maxCapacity: number | null;
  metrics: QueueMetrics;
  entries: LiveQueueEntrySnapshot[];
  generatedAt: Date;
}

export interface JoinResult {
  entryId: string;
  customerId: string;
  displayCode: string;
  tokenNumber: number;
  estimate: WaitEstimate;
}
