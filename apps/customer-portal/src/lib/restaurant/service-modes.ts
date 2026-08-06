export type ServiceMode = 'DINE_IN' | 'TAKEAWAY' | 'DRIVE_IN';

export type BusinessType =
  | 'RESTAURANT'
  | 'CAFE'
  | 'FOOD_COURT'
  | 'CLOUD_KITCHEN'
  | 'GENERIC';

export type QRCodePurpose =
  | 'ENTRANCE'
  | 'TAKEAWAY_RECEIPT'
  | 'DRIVE_IN_ENTRANCE'
  | 'WAITER_PERSONAL'
  | 'KITCHEN'
  | 'RECEPTION'
  | 'QUEUE';

export const SERVICE_MODE_LABELS: Record<ServiceMode, string> = {
  DINE_IN: 'Dine In',
  TAKEAWAY: 'Takeaway',
  DRIVE_IN: 'Drive In',
};

export function primaryServiceMode(
  queueMode: ServiceMode,
  enabled: ServiceMode[] = ['DINE_IN'],
): ServiceMode {
  if (enabled.includes(queueMode)) return queueMode;
  return enabled[0] ?? 'DINE_IN';
}
