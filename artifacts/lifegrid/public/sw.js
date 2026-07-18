/* LifeGrid legacy service-worker retirement worker. Intentionally has no fetch handler. */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const prefixes = ['workbox-', 'vite-pwa-', 'lifegrid-', 'precache-', 'runtime-'];
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => prefixes.some(prefix => key.toLowerCase().startsWith(prefix))).map(key => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) await client.navigate(client.url);
  })());
});
