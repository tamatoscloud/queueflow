/**
 * Public, non-secret flags for guest UI. Never include tokens or keys.
 */
export type GuestNotificationChannels = {
  whatsapp: boolean;
  sms: boolean;
  webPush: boolean;
};

function isUsableSecret(value: string | undefined): boolean {
  const v = value?.trim();
  if (!v) return false;
  return !/CHANGE_ME|YOUR_|placeholder/i.test(v);
}

export function resolveGuestNotificationChannels(opts?: {
  webPushEnabled?: boolean;
}): GuestNotificationChannels {
  const whatsapp =
    isUsableSecret(process.env.WHATSAPP_ACCESS_TOKEN) &&
    isUsableSecret(process.env.WHATSAPP_PHONE_NUMBER_ID);

  const smsProvider = (process.env.SMS_PROVIDER ?? 'mock').toLowerCase();
  const sms =
    smsProvider !== 'mock' && isUsableSecret(process.env.SMS_HTTP_GATEWAY_URL);

  return {
    whatsapp,
    sms,
    webPush: Boolean(opts?.webPushEnabled),
  };
}
