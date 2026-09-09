const CACHE_NAME = 'nzm-drosk-offline-v1';

const APP_FILES = [
    './',
    './index.html',
    './manifest.json',
    './manifest.webmanifest',
    './icon-192.png',
    './icon-512.png'
];

// تثبيت Service Worker وحفظ ملفات التطبيق الأساسية
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(APP_FILES);
            })
            .then(function () {
                return self.skipWaiting();
            })
    );
});

// حذف الإصدارات القديمة من الكاش
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (cacheNames) {
                return Promise.all(
                    cacheNames.map(function (cacheName) {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

// تشغيل Online أولاً، وإذا لم يوجد إنترنت يتم استخدام النسخة المحفوظة
self.addEventListener('fetch', function (event) {

    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(function (response) {

                // حفظ الملفات المحلية القادمة من نفس الموقع
                if (
                    response &&
                    response.ok &&
                    new URL(event.request.url).origin === self.location.origin
                ) {
                    var responseClone = response.clone();

                    caches.open(CACHE_NAME)
                        .then(function (cache) {
                            cache.put(event.request, responseClone);
                        })
                        .catch(function () {});
                }

                return response;
            })
            .catch(function () {
                // في حالة عدم وجود الإنترنت
                return caches.match(event.request)
                    .then(function (cachedResponse) {

                        if (cachedResponse) {
                            return cachedResponse;
                        }

                        // إذا كان الطلب صفحة ولم توجد في الكاش
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }

                        return new Response('', {
                            status: 503,
                            statusText: 'Offline'
                        });
                    });
            })
    );
});
