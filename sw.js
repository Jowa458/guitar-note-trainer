const CACHE = 'guitar-practice-v74';
const SAMPLE_CACHE = 'guitar-samples-v1';
const ASSETS = ['./', './index.html', './styles.css', './override.css', './visual.css', './visual.css?v=2', './vendor/vexflow.js', './vendor/vexflow.js?v=5.0.0', './app.js', './app.js?v=72', './manifest.webmanifest', './icons/icon.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('guitar-practice-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', event => {
  const request=event.request,url=new URL(request.url);
  if(request.method==='GET'&&url.origin===self.location.origin&&url.pathname.endsWith('.mp3')){
    event.respondWith(caches.open(SAMPLE_CACHE).then(async cache=>(await cache.match(request))||fetch(request).then(async response=>{if(response.ok)await cache.put(request,response.clone());return response})));
    return;
  }
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
