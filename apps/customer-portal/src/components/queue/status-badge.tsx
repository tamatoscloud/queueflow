import { Badge } from '@/components/ui/badge';
import type { EntryStatus, QueueStatus } from '@/lib/api/types';

const ENTRY_LABELS: Record<EntryStatus, string> = {
  WAITING: 'Waiting',
  CALLED: "It's your turn!",
  HOLDING: 'On hold',
  SKIPPED: 'Skipped',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
};

export function StatusBadge({
  entryStatus,
  queueStatus,
  isOpen,
}: {
  entryStatus?: EntryStatus;
  queueStatus?: QueueStatus;
  isOpen?: boolean;
}) {
  const label = entryStatus
    ? ENTRY_LABELS[entryStatus]
    : isOpen
      ? 'Queue open'
      : queueStatus === 'PAUSED'
        ? 'Paused'
        : 'Closed';

  const variant =
    entryStatus === 'CALLED'
      ? 'success'
      : entryStatus === 'WAITING'
        ? 'info'
        : isOpen
          ? 'success'
          : 'neutral';

  return (
    <Badge variant={variant} pulse={entryStatus === 'CALLED' || entryStatus === 'WAITING'}>
      {label}
    </Badge>
  );
}
