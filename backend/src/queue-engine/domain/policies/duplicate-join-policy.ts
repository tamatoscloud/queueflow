import type { PhoneNumber } from '../value-objects';
import { DuplicateActiveJoinError } from '../exceptions/domain-errors';
import { ACTIVE_ENTRY_STATUSES, type QueueEntryStatus } from '../enums';

export interface ActivePhoneProbe {
  entryId: string;
  phone: string;
  status: QueueEntryStatus;
}

export class DuplicateJoinPolicy {
  static assertPhoneNotActive(
    phone: PhoneNumber,
    activeInQueue: readonly ActivePhoneProbe[],
  ): void {
    const hit = activeInQueue.find(
      (e) =>
        e.phone === phone.value &&
        (ACTIVE_ENTRY_STATUSES as readonly QueueEntryStatus[]).includes(e.status),
    );
    if (hit) {
      throw new DuplicateActiveJoinError(phone.value, hit.entryId);
    }
  }
}
