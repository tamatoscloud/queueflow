import { customerApi } from '@/lib/api/customer-api';
import { loadQueueSession } from '@/lib/storage/session';

export type EnableGuestPushResult = {
  ok: boolean;
  /** True only when a PushSubscription was saved to the backend. */
  subscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  error?: string;
};

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

function applicationServerKeysMatch(
  subscription: PushSubscription,
  publicKey: string,
): boolean {
  const key = subscription.options?.applicationServerKey;
  if (!key) return false;
  const expected = urlBase64ToUint8Array(publicKey);
  const actual =
    key instanceof ArrayBuffer ? new Uint8Array(key) : new Uint8Array(key);
  if (actual.byteLength !== expected.byteLength) return false;
  for (let i = 0; i < expected.byteLength; i += 1) {
    if (actual[i] !== expected[i]) return false;
  }
  return true;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) {
      await navigator.serviceWorker.ready;
      return existing;
    }
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

/**
 * Request notification permission + register Web Push with the backend so
 * alerts work when the tab is backgrounded / phone is locked.
 *
 * `ok` / `subscribed` are only true when a subscription was persisted server-side.
 * Permission alone is not enough for lock-screen delivery.
 */
export async function enableGuestPushNotifications(entryId: string): Promise<EnableGuestPushResult> {
  if (typeof window === 'undefined') {
    return { ok: false, subscribed: false, permission: 'unsupported', error: 'Unavailable' };
  }
  if (!window.isSecureContext) {
    return {
      ok: false,
      subscribed: false,
      permission: 'unsupported',
      error: 'Notifications need HTTPS.',
    };
  }

  // iPhone/iPad only expose Web Push after “Add to Home Screen” (iOS 16.4+).
  if (isIosDevice() && !isStandalonePwa()) {
    return {
      ok: false,
      subscribed: false,
      permission: 'Notification' in window ? Notification.permission : 'unsupported',
      error:
        'On iPhone/iPad: tap Share → Add to Home Screen, open Quyk from your home screen, then turn on alerts. Or keep this tab open for live updates.',
    };
  }

  if (!('Notification' in window)) {
    if (isIosDevice()) {
      return {
        ok: false,
        subscribed: false,
        permission: 'unsupported',
        error:
          'Open this page in Safari, Add to Home Screen, then enable alerts from the home-screen app.',
      };
    }
    return {
      ok: false,
      subscribed: false,
      permission: 'unsupported',
      error:
        'Open this page in Chrome or Safari (not an in-app browser). Keep the tab open for live call alerts, or use WhatsApp/SMS updates.',
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      ok: false,
      subscribed: false,
      permission,
      error:
        permission === 'denied'
          ? 'Notifications are blocked. Allow them in your browser site settings.'
          : 'Notification permission was not granted.',
    };
  }

  const registration = await ensureServiceWorker();
  if (!registration?.pushManager) {
    return {
      ok: false,
      subscribed: false,
      permission,
      error:
        'Background push is unavailable in this browser. Keep this tab open for live alerts, or use WhatsApp updates.',
    };
  }

  try {
    const { publicKey } = await customerApi.getWebPushPublicKey();
    if (!publicKey?.trim()) {
      return {
        ok: false,
        subscribed: false,
        permission,
        error: 'Push is not configured on the server yet. Keep this tab open for live alerts.',
      };
    }

    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !applicationServerKeysMatch(subscription, publicKey)) {
      await subscription.unsubscribe().catch(() => undefined);
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return {
        ok: false,
        subscribed: false,
        permission,
        error: 'Could not create a push subscription. Try again.',
      };
    }

    const session = loadQueueSession();
    await customerApi.subscribeWebPush({
      entryId,
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      trackingToken:
        session?.entryId === entryId ? session.trackingToken : undefined,
    });

    return { ok: true, subscribed: true, permission };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : 'Could not enable background alerts. Keep this tab open for live updates.';
    return { ok: false, subscribed: false, permission, error: message };
  }
}

/** Show a notification via the service worker when possible (works better in background). */
export async function showGuestLocalNotification(options: {
  title: string;
  body: string;
  tag: string;
  url?: string;
}): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(options.title, {
        body: options.body,
        tag: options.tag,
        requireInteraction: true,
        data: { url: options.url ?? '/' },
      } as NotificationOptions);
      return;
    }
  } catch {
    // fall through
  }

  try {
    const n = new Notification(options.title, {
      body: options.body,
      tag: options.tag,
    });
    window.setTimeout(() => n.close(), 12_000);
  } catch {
    // ignore
  }
}
