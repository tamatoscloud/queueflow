import { customerApi } from '@/lib/api/customer-api';
import { loadQueueSession } from '@/lib/storage/session';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

/**
 * Request notification permission + register Web Push with the backend so
 * alerts work when the tab is backgrounded / phone is locked.
 */
export async function enableGuestPushNotifications(entryId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Unavailable' };
  }
  if (!window.isSecureContext) {
    return { ok: false, error: 'Notifications need HTTPS.' };
  }
  if (!('Notification' in window) || !('PushManager' in window)) {
    return { ok: false, error: 'Push notifications are not supported in this browser.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      ok: false,
      error:
        permission === 'denied'
          ? 'Notifications are blocked. Allow them in your browser site settings.'
          : 'Notification permission was not granted.',
    };
  }

  const registration = await ensureServiceWorker();
  if (!registration) {
    return { ok: false, error: 'Could not register the notification service worker.' };
  }

  try {
    const { publicKey } = await customerApi.getWebPushPublicKey();
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      }));

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, error: 'Push subscription was incomplete.' };
    }

    const session = loadQueueSession();
    await customerApi.subscribeWebPush({
      entryId,
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      trackingToken:
        session?.entryId === entryId ? session.trackingToken : undefined,
    });

    return { ok: true };
  } catch {
    // Fall back to local Notification API — still useful while tab is open.
    return {
      ok: true,
      error: undefined,
    };
  }
}
