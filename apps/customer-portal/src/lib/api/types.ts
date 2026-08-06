export type NotificationPreference = 'SMS' | 'WHATSAPP' | 'BOTH';

export type ServiceMode = 'DINE_IN' | 'TAKEAWAY' | 'DRIVE_IN';
export type BusinessType =
  | 'RESTAURANT'
  | 'CAFE'
  | 'FOOD_COURT'
  | 'CLOUD_KITCHEN'
  | 'GENERIC';

export type QueueStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
export type EntryStatus =
  | 'WAITING'
  | 'CALLED'
  | 'HOLDING'
  | 'SKIPPED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
  requestId: string;
}

export interface QueueLanding {
  business: {
    id: string;
    name: string;
    logoUrl: string | null;
    timezone: string;
    businessType?: BusinessType;
    enabledModes?: ServiceMode[];
  };
  branch: { id: string; name: string; city: string | null };
  queue: {
    id: string;
    name: string;
    description: string | null;
    status: QueueStatus;
    isAcceptingEntries: boolean;
    prefix: string;
    serviceMode?: ServiceMode;
  };
  live: {
    waitingCount: number;
    estimatedWaitMinutes: number;
    averageServiceTimeMinutes: number;
    isOpen: boolean;
    generatedAt: string;
  };
}

export interface JoinQueuePayload {
  fullName: string;
  phone: string;
  partySize: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  notificationPreference: NotificationPreference;
  isVip?: boolean;
  bypassOperatingHours?: boolean;
}

export interface JoinQueueResult {
  entryId: string;
  customerId: string;
  displayCode: string;
  tokenNumber: number;
  estimate: {
    position: number;
    customersAhead: number;
    estimatedWaitMinutes: number;
    averageServiceTimeMinutes: number;
  };
}

export interface EntryTracking {
  entry: {
    id: string;
    status: EntryStatus;
    displayCode: string;
    partySize: number;
    joinedAt: string;
    calledAt: string | null;
    notes?: string | null;
    metadata?: {
      orderNumber?: string;
      vehicleMake?: string;
      vehicleColor?: string;
      vehiclePlate?: string;
      note?: string;
    };
  };
  queue: {
    id: string;
    name: string;
    status: QueueStatus;
    isAcceptingEntries: boolean;
    serviceMode?: ServiceMode;
  };
  business: { id: string; name: string; logoUrl: string | null };
  branch: { id: string; name: string };
  position: number;
  customersAhead: number;
  estimatedWaitMinutes: number;
  averageServiceTimeMinutes: number;
  snapshotGeneratedAt: string;
}

export interface SubmitFeedbackPayload {
  queueEntryId: string;
  rating: number;
  comment?: string;
}
