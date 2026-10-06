const CACHE = 'queueflow-v3';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', OFFLINE_URL, '/manifest.webmanifest'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => response)
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }),
  );
});

self.addEventListener('push', (event) => {
  let data = {
    title: "It's your turn!",
    body: 'Please come to the counter',
    tag: 'queueflow',
    url: '/',
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      if (event.data) {
        const text = event.data.text();
        if (text) data.body = text;
      }
    } catch {
      // keep defaults
    }
  }

  // Always show a notification for push events (browsers may drop silent pushes).
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      data: { url: data.url, entryId: data.entryId },
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 80, 200, 80, 400],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            const clientUrl = new URL(client.url);
            const targetUrl = new URL(url, self.location.origin);
            if (
              clientUrl.origin === targetUrl.origin &&
              (clientUrl.pathname === targetUrl.pathname ||
                clientUrl.pathname.startsWith('/track/') ||
                clientUrl.pathname.startsWith('/menu/'))
            ) {
              return client.focus().then(() => {
                if ('navigate' in client && typeof client.navigate === 'function') {
                  return client.navigate(targetUrl.href);
                }
                return client;
              });
            }
          } catch {
            // continue
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    }),
  );
});
