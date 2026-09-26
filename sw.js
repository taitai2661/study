const REVIEW_CACHE = 'purinto-offline-review-v8'
const REVIEW_ASSETS = ['./web/review.html','./assets/pages/review.js','./assets/shared/core.js','./assets/shared/presentation.js','./assets/styles/base.css','./assets/styles/web-learn.css']

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== REVIEW_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  // Do not retain every page and workbook ever visited.  The explicitly
  // requested review shell remains the only offline experience.
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request,{ignoreSearch:true})))
})

self.addEventListener('message', event => {
  if (event.data?.type === 'cache-offline-review') event.waitUntil(caches.open(REVIEW_CACHE).then(cache => cache.addAll(REVIEW_ASSETS)))
  if (event.data?.type === 'clear-offline-review-cache') event.waitUntil(caches.delete(REVIEW_CACHE))
})
