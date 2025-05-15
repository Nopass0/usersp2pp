// Service Worker for UserSP2P Application
// Handles background notifications and offline functionality

const CACHE_NAME = 'usersp2p-cache-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use
const urlsToCache = [
  '/',
  '/offline.html',
  '/favicon.ico',
  '/sounds/notification.mp3',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Claim clients to ensure the service worker controls all clients
  event.waitUntil(self.clients.claim());
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // For API requests, try network first, then fall back to offline page if needed
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }
  
  // For other requests, try cache first, fall back to network, then offline page
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // Cache important resources that aren't in the initial cache
            if (
              !event.request.url.includes('/api/') && 
              event.request.method === 'GET' &&
              (event.request.url.endsWith('.js') || 
               event.request.url.endsWith('.css') || 
               event.request.url.endsWith('.ico') ||
               event.request.url.endsWith('.png') ||
               event.request.url.endsWith('.jpg') ||
               event.request.url.endsWith('.svg'))
            ) {
              const responseToCache = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return fetchResponse;
          })
          .catch(() => {
            // If both cache and network fail, show offline page
            return caches.match(OFFLINE_URL);
          });
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);
  
  let notification = {};
  
  // Try to parse the notification data
  try {
    notification = event.data.json();
  } catch (e) {
    notification = {
      title: 'Новое уведомление',
      body: event.data ? event.data.text() : 'Получено новое уведомление',
      icon: '/favicon.ico',
      url: '/'
    };
  }
  
  // Ensure we have a title
  const title = notification.title || 'Новое уведомление';
  
  // Configure notification options
  const options = {
    body: notification.body || 'Получено новое уведомление',
    icon: notification.icon || '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      url: notification.url || '/'
    },
    requireInteraction: true,
    renotify: true,
    actions: [
      {
        action: 'open',
        title: 'Открыть'
      }
    ]
  };
  
  // Show the notification
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received:', event);
  
  // Close the notification
  event.notification.close();
  
  // Get the notification URL or use default
  const url = event.notification.data?.url || '/';
  
  // Handle action clicks
  if (event.action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // If there's an open window, focus it
          for (const client of clientList) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          // Otherwise open a new window
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Sync event - handle background sync
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync event:', event);
  
  if (event.tag === 'fetch-notifications') {
    event.waitUntil(
      fetch('/api/proxy/messages/recent?hours=3', {
        headers: {
          'accept': 'application/json',
          'X-API-Key': self.TELEGRAM_API_KEY || '', // Set via postMessage
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          // Show notification for each message (limit to 3)
          const messages = data.messages.slice(0, 3);
          return Promise.all(
            messages.map(msg => {
              const title = `${msg.cabinet_name} (${msg.chat_name})`;
              const body = msg.message.replace(/\[.*?\] Автоматическое оповещение: /g, '');
              return self.registration.showNotification(title, {
                body: body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                vibrate: [200, 100, 200],
                requireInteraction: true
              });
            })
          );
        }
      })
      .catch(error => {
        console.error('[Service Worker] Failed to fetch notifications:', error);
      })
    );
  }
  
  if (event.tag === 'fetch-cancellations') {
    event.waitUntil(
      fetch('/api/proxy/cancellations/recent?hours=24', {
        headers: {
          'accept': 'application/json',
          'X-API-Key': self.TELEGRAM_API_KEY || '', // Set via postMessage
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          // Filter for cancellation messages
          const cancellations = data.messages.filter(
            msg => typeof msg.message === 'string' && msg.message.includes('невозможно обработать')
          );
          
          if (cancellations.length > 0) {
            // Show notification for each cancellation (limit to 3)
            const toShow = cancellations.slice(0, 3);
            return Promise.all(
              toShow.map(msg => {
                const title = `Отмена: ${msg.chat_name}`;
                const body = msg.message;
                return self.registration.showNotification(title, {
                  body: body,
                  icon: '/favicon.ico',
                  badge: '/favicon.ico',
                  vibrate: [200, 100, 200],
                  requireInteraction: true
                });
              })
            );
          }
        }
      })
      .catch(error => {
        console.error('[Service Worker] Failed to fetch cancellations:', error);
      })
    );
  }
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  // Handle API key message
  if (event.data && event.data.type === 'SET_API_KEY') {
    self.TELEGRAM_API_KEY = event.data.apiKey;
    console.log('[Service Worker] API key set');
  }
  
  // Handle manual sync request
  if (event.data && event.data.type === 'CHECK_NOTIFICATIONS') {
    self.registration.sync.register('fetch-notifications');
    self.registration.sync.register('fetch-cancellations');
  }
});