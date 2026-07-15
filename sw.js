var STATIC_CACHE = 'rw-static-v1';
var SHELL_CACHE = 'rw-shell';
var STATIC_EXTENSIONS = ['.css', '.woff', '.woff2', '.ttf', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp'];

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        Promise.all([
            caches.keys().then(function(keys) {
                return Promise.all(keys.map(function(key) {
                    if (key !== STATIC_CACHE && key !== SHELL_CACHE) {
                        return caches.delete(key);
                    }
                }));
            }),
            self.clients.claim()
        ]).then(function() {
            return self.clients.matchAll({ type: 'window' });
        }).then(function(clientsList) {
            clientsList.forEach(function(client) {
                client.postMessage({ type: 'RW_SW_UPDATED', at: Date.now() });
            });
        })
    );
});

function isHTMLRequest(request) {
    if (request.mode === 'navigate') return true;
    var accept = request.headers.get('accept') || '';
    return accept.indexOf('text/html') !== -1;
}

function isAPIRequest(url) {
    if (url.hostname.indexOf('supabase.co') !== -1) return true;
    if (url.pathname.indexOf('/functions/v1/') !== -1) return true;
    return false;
}

function isStaticAsset(pathname) {
    for (var i = 0; i < STATIC_EXTENSIONS.length; i++) {
        if (pathname.indexOf(STATIC_EXTENSIONS[i]) !== -1) return true;
    }
    return false;
}

self.addEventListener('fetch', function(event) {
    var request = event.request;
    var url = new URL(request.url);
    if (request.method !== 'GET') return;

    if (isAPIRequest(url)) {
        event.respondWith(fetch(request));
        return;
    }

    if (isHTMLRequest(request)) {
        event.respondWith(fetch(request));
        return;
    }

    if (isStaticAsset(url.pathname)) {
        event.respondWith(
            caches.match(request).then(function(cached) {
                return cached || fetch(request).then(function(response) {
                    var copy = response.clone();
                    caches.open(STATIC_CACHE).then(function(cache) {
                        cache.put(request, copy);
                    });
                    return response;
                });
            })
        );
        return;
    }

    event.respondWith(
        fetch(request).then(function(networkResponse) {
            var copy = networkResponse.clone();
            caches.open(STATIC_CACHE).then(function(cache) {
                cache.put(request, copy);
            });
            return networkResponse;
        }).catch(function() {
            return caches.match(request);
        })
    );
});
