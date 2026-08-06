import type { DailySummaryFilters } from './reports.repository';

export interface DailySummaryResponse {
  businessId: string;
  queueId: string | null;
  date: string;
  period: { start: string; end: string };
  totals: {
    joined: number;
    completed: number;
    cancelled: number;
    noShows: number;
    stillActive: number;
  };
  waitTime: {
    averageMinutes: number | null;
    minMinutes: number | null;
    maxMinutes: number | null;
  };
  bySource: Array<{ source: string; count: number }>;
}

export function toDailySummaryResponse(
  filters: DailySummaryFilters & { dateLabel: string },
  agg: Awaited<
    ReturnType<
      import('./reports.repository').ReportsRepository['aggregateDailySummary']
    >
  >,
): DailySummaryResponse {
  return {
    businessId: filters.businessId,
    queueId: filters.queueId ?? null,
    date: filters.dateLabel,
    period: {
      start: filters.start.toISOString(),
      end: filters.end.toISOString(),
    },
    totals: {
      joined: agg.totalJoined,
      completed: agg.completed,
      cancelled: agg.cancelled,
      noShows: agg.noShows,
      stillActive: agg.stillWaiting,
    },
    waitTime: {
      averageMinutes: agg.averageActualWaitMinutes,
      minMinutes: agg.minActualWaitMinutes,
      maxMinutes: agg.maxActualWaitMinutes,
    },
    bySource: agg.bySource,
  };
}
