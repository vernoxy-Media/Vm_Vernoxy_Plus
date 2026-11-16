/* Vernoxy Pulse service worker: shows desktop notifications when the app is not open. */
/* eslint-disable no-restricted-globals */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Vernoxy Pulse', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Vernoxy Pulse';
  const options = {
    body: data.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    // When the app is open and in front, it already shows its own in-app notification
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      if (windows.some((w) => w.visibilityState === 'visible' && w.focused)) return undefined;
      return self.registration.showNotification(title, options);
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus();
          if ('navigate' in w) {
            try {
              await w.navigate(target);
            } catch {
              /* a page that cannot be navigated stays where it is */
            }
          }
          return undefined;
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
