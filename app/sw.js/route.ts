import { NextResponse } from "next/server"

export async function GET() {
  const cleanEnv = (val?: string) => val ? val.replace(/^["']|["']$/g, '').trim() : ""

  const apiKey = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
  const authDomain = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
  const projectId = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  const storageBucket = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
  const messagingSenderId = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)
  const appId = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID)
  const measurementId = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID)

  const swCode = `
    // Combined Service Worker
    const CACHE_NAME = 'grotrack-cache-v5';
    const STATIC_ASSETS = [
      '/',
      '/manifest.json',
      '/icons/icon-72x72.png',
      '/icons/icon-96x96.png',
      '/icons/icon-128x128.png',
      '/icons/icon-144x144.png',
      '/icons/icon-152x152.png',
      '/icons/icon-180x180.png',
      '/icons/icon-192x192.png',
      '/icons/icon-384x384.png',
      '/icons/icon-512x512.png',
    ];

    // 1. Install Event: cache static shell assets gracefully
    self.addEventListener('install', (event) => {
      event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
          console.log('[SW] Caching static shell assets');
          // Cache each asset individually to prevent one failure from crashing the entire SW installation
          for (const url of STATIC_ASSETS) {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
              } else {
                console.warn('[SW] Failed to cache asset (non-200):', url);
              }
            } catch (err) {
              console.warn('[SW] Failed to cache asset (network error):', url, err);
            }
          }
        }).then(() => self.skipWaiting())
      );
    });

    // 2. Activate Event: clean up old caches
    self.addEventListener('activate', (event) => {
      event.waitUntil(
        caches.keys().then((keys) => {
          return Promise.all(
            keys.map((key) => {
              if (key !== CACHE_NAME) {
                console.log('[SW] Clearing old cache:', key);
                return caches.delete(key);
              }
            })
          );
        }).then(() => self.clients.claim())
      );
    });

    // 3. Fetch Event: apply custom caching strategies
    self.addEventListener('fetch', (event) => {
      const { request } = event;
      const url = new URL(request.url);

      // Bypass caching in development mode to allow Next.js Fast Refresh to work
      if (self.location.hostname === "localhost") {
        return;
      }

      // Only handle GET requests and local requests
      if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
        return;
      }

      // Bypass supabase API calls, login action, and Next.js hot-reloading (webpack/HM)
      if (
        url.pathname.includes('/api/') || 
        url.pathname.includes('/auth/') || 
        url.pathname.includes('/_next/webpack-hmr') ||
        url.pathname.startsWith('/__next')
      ) {
        return;
      }

      // Strategy 1: Cache-First for static resources (CSS, JS, Fonts, Images)
      if (
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.startsWith('/icons/') ||
        url.pathname.startsWith('/splash/') ||
        url.pathname.startsWith('/images/') ||
        url.pathname.endsWith('.woff2') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js')
      ) {
        event.respondWith(
          caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return networkResponse;
            });
          })
        );
        return;
      }

      // Strategy 2: Network-First for main page navigation / HTML pages (e.g. dashboard routes)
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.headers.get('content-type')?.includes('text/html')) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            return caches.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return caches.match('/');
            });
          })
      );
    });

    // 4. Firebase Messaging Setup (Compat API)
    importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

    const firebaseConfig = {
      apiKey: "${apiKey}",
      authDomain: "${authDomain}",
      projectId: "${projectId}",
      storageBucket: "${storageBucket}",
      messagingSenderId: "${messagingSenderId}",
      appId: "${appId}",
      measurementId: "${measurementId}"
    };

    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      try {
        console.log('[SW] Initializing firebase app compatibility...');
        firebase.initializeApp(firebaseConfig);
        console.log('[SW] Firebase compat initialized successfully.');
        const messaging = firebase.messaging();

        messaging.onBackgroundMessage((payload) => {
          console.log('[SW Background] onBackgroundMessage triggered! Payload:', JSON.stringify(payload));
          console.log('[SW Background] Notification permission status:', Notification.permission);
          
          // Broadcast to active clients via BroadcastChannel
          try {
            console.log('[SW Background] Posting to BroadcastChannel...');
            const channel = new BroadcastChannel('grotrack_notifications');
            channel.postMessage({ type: 'BACKGROUND_RECEIVED', payload });
            console.log('[SW Background] BroadcastChannel post successful.');
          } catch(e) {
            console.warn('[SW Background] BroadcastChannel post failed:', e.message);
          }

          const notificationTitle = payload.data?.title || payload.notification?.title || 'GroTrack Alert';
          const notificationOptions = {
            body: payload.data?.body || payload.notification?.body || '',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            requireInteraction: true,
            data: {
              url: payload.data?.link || '/dashboard/notifications'
            }
          };

          console.log('[SW Background] Triggering self.registration.showNotification...');
          console.log('[SW Background] Title:', notificationTitle);
          console.log('[SW Background] Options:', JSON.stringify(notificationOptions));

          self.registration.showNotification(notificationTitle, notificationOptions)
            .then(() => {
              console.log('[SW Background] showNotification successfully resolved!');
            })
            .catch((err) => {
              console.error('[SW Background] showNotification failed to render:', err.message);
            });
        });
      } catch (e) {
        console.error("Failed to initialize background messaging:", e.message);
      }
    }

    // 5. Notification Click Handler with Tab Focusing
    self.addEventListener('notificationclick', (event) => {
      const notification = event.notification;
      const urlToOpen = notification.data?.url || '/dashboard/overview';
      notification.close();

      // Broadcast click event
      try {
        const channel = new BroadcastChannel('grotrack_notifications');
        channel.postMessage({ type: 'NOTIFICATION_CLICKED', url: urlToOpen });
      } catch(e) {}

      const absoluteUrl = new URL(urlToOpen, self.location.origin).href;

      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
          for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url === absoluteUrl && 'focus' in client) {
              return client.focus();
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow(absoluteUrl);
          }
        })
      );
    });
  `

  return new Response(swCode, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
