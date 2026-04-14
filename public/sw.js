// Service Worker محسن للعمل بدون إنترنت
const CACHE_VERSION = 'khat-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// الملفات الأساسية للتخزين المؤقت
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API routes للتخزين المؤقت
const API_ROUTES = [
  '/api/dashboard/overview',
  '/api/shipments',
  '/api/farmers',
  '/api/agents',
  '/api/khat-types',
  '/api/delivery-persons',
  '/api/reminders',
  '/api/timers',
  '/api/notifications',
  '/api/settings',
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[SW] Static assets cached');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('[SW] Failed to cache static assets:', error);
    })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.startsWith(CACHE_VERSION))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Service Worker activated');
      return self.clients.claim();
    })
  );
});

// استراتيجية التخزين المؤقت
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل طلبات غير GET
  if (request.method !== 'GET') {
    return;
  }

  // تجاهل طلبات externals
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // استراتيجية للصور: Cache First
  if (request.destination === 'image' || url.pathname.includes('/icons/')) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // استراتيجية للـ API: Network First مع Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // استراتيجية للصفحات: Network First مع Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // استراتيجية للملفات الثابتة: Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

// Network First مع Cache Fallback
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // تخزين نسخة من الرد
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // رد افتراضي للـ API
    return new Response(JSON.stringify({
      error: 'غير متصل بالإنترنت',
      offline: true,
      cached: false
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Network First مع صفحة Offline
async function networkFirstWithOffline(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // صفحة Offline
    const offlineResponse = await cache.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response('غير متصل بالإنترنت', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// Cache First
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch:', request.url);
    return new Response('', { status: 404 });
  }
}

// Stale While Revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// استقبال الرسائل من الصفحة
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }

  if (event.data && event.data.type === 'CACHE_API_DATA') {
    const { routes } = event.data;
    event.waitUntil(
      caches.open(API_CACHE).then((cache) => {
        return Promise.all(
          routes.map((route) =>
            fetch(route)
              .then((response) => {
                if (response.ok) {
                  cache.put(route, response);
                }
              })
              .catch(() => console.log('[SW] Failed to cache:', route))
          )
        );
      })
    );
  }
});

// تزامن البيانات في الخلفية
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-shipments') {
    event.waitUntil(syncShipments());
  }

  if (event.tag === 'sync-payments') {
    event.waitUntil(syncPayments());
  }
});

// مزامنة الشحنات
async function syncShipments() {
  try {
    const pendingShipments = await getPendingData('pending_shipments');

    for (const shipment of pendingShipments) {
      try {
        const response = await fetch('/api/shipments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shipment),
        });

        if (response.ok) {
          await removePendingData('pending_shipments', shipment.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync shipment:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// مزامنة المدفوعات
async function syncPayments() {
  try {
    const pendingPayments = await getPendingData('pending_payments');

    for (const payment of pendingPayments) {
      try {
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payment),
        });

        if (response.ok) {
          await removePendingData('pending_payments', payment.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync payment:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// دوال مساعدة للتخزين المحلي
async function getPendingData(storeName) {
  const cache = await caches.open('pending-data');
  const response = await cache.match(`/${storeName}`);
  if (!response) return [];
  return response.json();
}

async function removePendingData(storeName, id) {
  const data = await getPendingData(storeName);
  const filtered = data.filter((item) => item.id !== id);
  const cache = await caches.open('pending-data');
  await cache.put(`/${storeName}`, new Response(JSON.stringify(filtered)));
}

console.log('[SW] Service Worker loaded');
