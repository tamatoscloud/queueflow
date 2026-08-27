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

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const iosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(media || iosStandalone);
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
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

  // iPhone/iPad only expose Web Push after “Add to Home Screen” (iOS 16.4+).
  if (isIosDevice() && !isStandalonePwa()) {
    return {
      ok: false,
      error:
        'On iPhone/iPad: tap Share → Add to Home Screen, open QueueFlow from your home screen, then turn on alerts. Or keep this tab open for live updates.',
    };
  }

  // Some Android WebViews (QR / in-app browsers) omit Notification entirely.
  if (!('Notification' in window)) {
    if (isIosDevice()) {
      return {
        ok: false,
        error:
          'Open this page in Safari, Add to Home Screen, then enable alerts from the home-screen app.',
      };
    }
    return {
      ok: false,
      error:
        'Open this page in Chrome or Safari (not an in-app browser). Keep the tab open for live call alerts, or use WhatsApp/SMS updates.',
    };
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

  // Prefer real Web Push when available; otherwise local Notification still helps
  // while the waiting tab is open (socket toasts already cover live updates).
  if (registration?.pushManager) {
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
      if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        const session = loadQueueSession();
        await customerApi.subscribeWebPush({
          entryId,
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          trackingToken:
            session?.entryId === entryId ? session.trackingToken : undefined,
        });
      }
    } catch {
      // Permission granted — in-tab alerts still work via Notification + socket.
    }
  }

  return { ok: true };
}
