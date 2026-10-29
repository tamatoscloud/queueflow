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
  /** Backend-reported delivery channels (no secrets). */
  notificationChannels?: {
    whatsapp: boolean;
    sms: boolean;
    webPush: boolean;
  };
}

/** Public customer join — no operational privilege fields. */
export interface JoinQueuePayload {
  fullName: string;
  phone: string;
  partySize: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  notificationPreference: NotificationPreference;
}

export interface JoinQueueResult {
  entryId: string;
  customerId: string;
  displayCode: string;
  tokenNumber: number;
  /** Entry-scoped Socket.IO credential (Wave 1B). */
  trackingToken?: string;
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
  /** Fresh entry-scoped Socket.IO credential for recovery/reconnect. */
  trackingToken?: string;
  notificationChannels?: {
    whatsapp: boolean;
    sms: boolean;
    webPush: boolean;
  };
}

export interface SubmitFeedbackPayload {
  queueEntryId: string;
  rating: number;
  comment?: string;
  /** Defaults to the tab's token for this entry (session or `#t=` link). */
  trackingToken?: string;
}

export interface GuestMenuItem {
  id: string;
  name: string;
  description?: string;
  price: string;
  tags?: string[];
  available?: boolean;
  imageUrl?: string;
}

export interface GuestMenuCategory {
  id: string;
  name: string;
  items: GuestMenuItem[];
}

export interface GuestMenuResponse {
  businessId: string;
  businessName: string;
  menu: { categories: GuestMenuCategory[] };
  isDefault: boolean;
}
