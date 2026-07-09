// Minimal service worker — offline-tolerant app shell cache.
// A full Workbox implementation (precache manifest, runtime cache strategies)
// replaces this in C4 when vite-plugin-pwa is wired; for now this provides a
// registrable SW so the browser treats the site as installable.

const CACHE_NAME = 'zoomez-shell-v1'
const SHELL_URLS = ['/', '/index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Network-first for API calls; cache-first for the shell.
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  )
})

// ---- Web push -------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = { title: 'Zoomez', body: '', url: '/', tag: undefined }
  try {
    data = { ...data, ...event.data.json() }
  } catch {
    data.body = event.data ? event.data.text() : ''
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if ('focus' in win) return win.focus()
      }
      return clients.openWindow(url)
    }),
  )
})
