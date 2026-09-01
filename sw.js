const CACHE = 'guitar-practice-v70';
const ASSETS = ['./', './index.html', './styles.css', './override.css', './visual.css', './visual.css?v=2', './vendor/vexflow.js', './vendor/vexflow.js?v=5.0.0', './app.js', './app.js?v=68', './manifest.webmanifest', './icons/icon.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => event.respondWith(fetch(event.request).catch(() => caches.match(event.request))));
