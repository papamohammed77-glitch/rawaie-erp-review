// sw.js – إصدار 2.0 محسَّن (إدارة ذكية للكاش)
// متوافق مع دستور الروائع: Network Only لـ HTML و API، Cache First مع حد أقصى للموارد الثابتة

var STATIC_CACHE = 'rw-static-v1';
var STATIC_EXTENSIONS = ['.css', '.woff', '.woff2', '.ttf', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp', '.js'];
var MAX_STATIC_ITEMS = 200; // الحد الأقصى لعدد الملفات المخزنة في الكاش

// ==================== حدث التثبيت ====================
self.addEventListener('install', function(event) {
    // تفعيل الـ SW فوراً دون انتظار إغلاق النوافذ القديمة
    self.skipWaiting();
});

// ==================== حدث التفعيل ====================
self.addEventListener('activate', function(event) {
    event.waitUntil(
        Promise.all([
            // 1. تنظيف الكاشات القديمة (يحذف أي كاش لا يحمل اسم STATIC_CACHE)
            caches.keys().then(function(keys) {
                return Promise.all(keys.map(function(key) {
                    if (key !== STATIC_CACHE) {
                        console.log('[SW] حذف الكاش القديم:', key);
                        return caches.delete(key);
                    }
                }));
            }),
            // 2. السيطرة على جميع النوافذ المفتوحة فوراً
            self.clients.claim()
        ]).then(function() {
            // إشعار النوافذ بوجود تحديث
            return self.clients.matchAll({ type: 'window' });
        }).then(function(clientsList) {
            for (var i = 0; i < clientsList.length; i++) {
                clientsList[i].postMessage({ type: 'RW_SW_UPDATED', at: Date.now() });
            }
        })
    );
});

// ==================== دوال مساعدة ====================
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
    var lowerPath = pathname.toLowerCase();
    for (var i = 0; i < STATIC_EXTENSIONS.length; i++) {
        if (lowerPath.indexOf(STATIC_EXTENSIONS[i]) !== -1) return true;
    }
    return false;
}

// دالة مساعدة للتحقق من حجم الكاش وتنظيف أقدم الملفات إذا تجاوز الحد
function trimCache(cache) {
    return cache.keys().then(function(keys) {
        if (keys.length >= MAX_STATIC_ITEMS) {
            // حذف أقدم ملف (أول ملف في القائمة)
            console.warn('[SW] الكاش ممتلئ، جاري حذف أقدم ملف...');
            return cache.delete(keys[0]).then(function() {
                return cache;
            });
        }
        return cache;
    });
}

// ==================== حدث الطلب ====================
self.addEventListener('fetch', function(event) {
    var request = event.request;
    var url = new URL(request.url);

    // تجاهل الطلبات غير GET
    if (request.method !== 'GET') return;

    // 1. طلبات API و Supabase: Network Only (لا تخزين)
    if (isAPIRequest(url)) {
        event.respondWith(fetch(request));
        return;
    }

    // 2. ملفات HTML: Network Only (لا تخزين، لضمان وصول التحديثات)
    if (isHTMLRequest(request)) {
        event.respondWith(fetch(request));
        return;
    }

// 3. الموارد الثابتة: Cache First مع حماية من تجاوز الحصة
    if (isStaticAsset(url.pathname)) {
        event.respondWith(
            caches.open(STATIC_CACHE).then(function(cache) {
                return cache.match(request).then(function(cached) {
                    if (cached) {
                        // موجود في الكاش، استخدمه
                        return cached;
                    }
                    // غير موجود، اجلبه من الشبكة وحاول تخزينه
                    return fetch(request).then(function(networkResponse) {
                        // تأكد من أن الاستجابة صالحة
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        // حاول التخزين مع حماية من تجاوز الحصة
                        var copy = networkResponse.clone();
                        trimCache(cache).then(function() {
                            try {
                                cache.put(request, copy);
                            } catch (e) {
                                // إذا فشل التخزين (مثلاً QuotaExceeded)، نتجاهل بهدوء
                                console.warn('[SW] تعذر تخزين الملف (تجاوز الحصة):', url.pathname);
                            }
                        });
                        return networkResponse;
                    }).catch(function() {
                        // إذا فشل الاتصال بالشبكة وكان الملف غير موجود في الكاش، لا نستطيع فعل شيء
                        return new Response('غير متصل', { status: 503, statusText: 'Service Unavailable' });
                    });
                });
            })
        );
        return;
    }

    // 4. أي موارد أخرى: Network First مع fallback للكاش
    event.respondWith(
        fetch(request).then(function(networkResponse) {
            var copy = networkResponse.clone();
            caches.open(STATIC_CACHE).then(function(cache) {
                trimCache(cache).then(function() {
                    try {
                        cache.put(request, copy);
                    } catch (e) {
                        console.warn('[SW] تعذر تخزين الملف:', url.pathname);
                    }
                });
            });
            return networkResponse;
        }).catch(function() {
            return caches.match(request);
        })
    );
});
