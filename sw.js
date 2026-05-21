const CACHE_NAME = 'tracker-assets-final-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './app.js',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Bypass cache completely for API endpoints regardless of the user's custom IP
    if (url.pathname.endsWith('/ping') || url.pathname.endsWith('/push') || url.pathname.endsWith('/check_date')) {
        event.respondWith(
            fetch(event.request).catch(() => new Response(JSON.stringify({ status: "offline" }), { status: 503 }))
        );
        return;
    }

    // Strict Offline Fallback for iOS navigation
    if (event.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
        event.respondWith(
            caches.match('./index.html', { ignoreSearch: true }).then(cachedResponse => {
                if (cachedResponse) {
                    return new Response(cachedResponse.body, {
                        status: 200,
                        headers: new Headers({ 'Content-Type': 'text/html' })
                    });
                }
                return fetch(event.request).catch(() => {
                    return caches.match('./index.html', { ignoreSearch: true }).then(fallback => {
                        return new Response(fallback.body, {
                            status: 200,
                            headers: new Headers({ 'Content-Type': 'text/html' })
                        });
                    });
                });
            })
        );
        return;
    }

    // Standard Assets
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});