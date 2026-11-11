// Service Worker for DocConvert AI (PWA 100% Offline Support)
const CACHE_NAME = 'docconvert-ai-v2.5';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './favicon.svg',
  './manifest.json'
];

const CDN_LIBRARIES = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
  'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Asosiy lokal fayllarni yuklash
      await cache.addAll(LOCAL_ASSETS);
      // 2. Tashqi CDN kutubxonalarni xavfsiz (settled) tarzda keshga olish
      await Promise.allSettled(CDN_LIBRARIES.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Faqat GET so'rovlarni boshqarish
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Mahalliy fayllar va CDN kutubxonalarni dinamik keshga saqlash
        if (
          networkResponse &&
          (networkResponse.status === 200 || networkResponse.type === 'opaque') &&
          (
            event.request.url.startsWith(self.location.origin) ||
            event.request.url.includes('cdnjs.cloudflare.com') ||
            event.request.url.includes('cdn.jsdelivr.net') ||
            event.request.url.includes('unpkg.com') ||
            event.request.url.includes('fonts.googleapis.com') ||
            event.request.url.includes('fonts.gstatic.com')
          )
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Internet yo'q bo'lganda navigatsiya uchun index.html qaytarish
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
