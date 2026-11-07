/**
 * Service worker.
 *
 * Cache-first for the app shell: everything is local, the app has no API, and a
 * player on a phone at a music stand should never see a spinner. A new version
 * is picked up on the next launch (bump VERSION when shipping).
 */

const VERSION = 'bdm-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/main.js',
  'js/util/dom.js',
  'js/util/storage.js',
  'js/music/theory.js',
  'js/music/tab.js',
  'js/music/track.js',
  'js/music/scoring.js',
  'js/content/library.js',
  'js/audio/pitch.js',
  'js/audio/engine.js',
  'js/audio/band.js',
  'js/game/session.js',
  'js/ui/router.js',
  'js/ui/components.js',
  'js/ui/highway.js',
  'js/ui/screens/home.js',
  'js/ui/screens/learn.js',
  'js/ui/screens/library.js',
  'js/ui/screens/practice.js',
  'js/ui/screens/tools.js',
  'js/ui/screens/you.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => {
        // A single missing file must not block installation forever.
        console.warn('SW precache incomplete', err);
        return self.skipWaiting();
      }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations always resolve to the shell so deep links work offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then((cached) => cached || fetch(req)).catch(() => caches.match('index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    }),
  );
});
