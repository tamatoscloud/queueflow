import {
  NotificationPreference,
  QueueEntrySource,
} from '../enums';
import { PartySize, PhoneNumber } from '../value-objects';
import { ValidationError } from '../exceptions/domain-errors';

export interface JoinQueueCommand {
  queueId: string;
  fullName: string;
  phone: string;
  partySize: number;
  notes?: string | null;
  notificationPreference: NotificationPreference;
  source?: QueueEntrySource;
  isVip?: boolean;
  priority?: number;
  /** Skip operating-hours check (staff override / tests). */
  bypassOperatingHours?: boolean;
  actorUserId?: string | null;
}

export class JoinQueueValidator {
  static validate(command: JoinQueueCommand): {
    phone: PhoneNumber;
    partySize: PartySize;
    fullName: string;
    preference: NotificationPreference;
    source: QueueEntrySource;
  } {
    const fullName = command.fullName.trim();
    if (!fullName) {
      throw new ValidationError('fullName is required');
    }
    const phone = PhoneNumber.create(command.phone);
    const partySize = PartySize.create(command.partySize);
    const preference = command.notificationPreference;
    if (!Object.values(NotificationPreference).includes(preference)) {
      throw new ValidationError('Invalid notification preference');
    }
    const source = command.source ?? QueueEntrySource.QR_LANDING;
    return { phone, partySize, fullName, preference, source };
  }
}
