// YAiPlay Radio — service worker: быстрый запуск и работа оболочки без сети.
// Радиопотоки, каталог станций и внешние сервисы НЕ кэшируются.
const CACHE = 'YAi-shell-v4';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'logo.png', 'manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Сеть с ограничением по времени: на iPhone после сна сеть может «висеть» без ошибки — тогда отдаём копию из кэша
function fetchWithTimeout(req, opts, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req, opts).then((r) => { clearTimeout(t); resolve(r); }, (err) => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // content.json и страница — сначала сеть (чтобы правки из админки сразу были видны)
  // Данные (content.json, catalog.json) и страницы — всегда сначала сеть, чтобы обновления сразу были видны
  if (url.pathname.endsWith('.json') && !url.pathname.endsWith('manifest.webmanifest')) {
    e.respondWith(
      fetchWithTimeout(req, { cache: 'no-store' }, 8000)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || fetch(req)))
    );
    return;
  }
  const networkFirst = req.mode === 'navigate' || !url.pathname.includes('/assets/');
  if (networkFirst) {
    e.respondWith(
      fetchWithTimeout(req, { cache: 'no-cache' }, req.mode === 'navigate' ? 3500 : 6000)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : null))
            .then((r) => r || fetch(req)) // в кэше нет — ждём сеть дальше, без таймаута
        )
    );
    return;
  }

  // Файлы сборки (с хэшем в имени) — из кэша, иначе из сети
  e.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
