const CACHE_NAME = 'studio-deck-cache-v1';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Никогда не кэшируем стриминг аудио и API-запросы скачивания/меток
    if (e.request.url.includes('/stream/') || e.request.url.includes('/api/')) {
        return;
    }
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});