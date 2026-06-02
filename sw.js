const CACHE = 'dikcia-v13';
const ASSETS = ['/', '/index.html', '/manifest.json'];

// Установка — кешируем файлы и сразу активируемся
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Активация — удаляем старые кеши и сразу берём управление
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch — network first для HTML, cache first для остального
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Шрифты — cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(e.request).then(r => r || fetch(e.request).then(resp => {
          c.put(e.request, resp.clone()); return resp;
        }))
      )
    );
    return;
  }

  // Наши файлы — network first, fallback на кеш
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
  }
});

// Сообщение от страницы — принудительное обновление
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});