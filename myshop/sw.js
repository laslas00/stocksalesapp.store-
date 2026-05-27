// ========================================
// SERVICE WORKER VERSION CONTROL
// ========================================
const APP_VERSION = '2.0.3'; // ← CHANGE THIS EVERY TIME YOU UPDATE
const CACHE_NAME = `stockapp-v${APP_VERSION}`;

console.log(`🚀 Service Worker v${APP_VERSION} loading...`);

const ASSETS_TO_CACHE = [
  'shop.html',
  'manifest.webmanifest',
  'image/icon.ico',
  'image/200.png',
  'image/logo.jpg',
  'styles/style.css',
  'styles/recipt.css',
  'styles/print.css',
  'styles/adptive.css',
  'styles/output.css',
  'css/fontawesome-simple.css',
  'styles/navbar.css',
  'libs/fonts/inter.css',
  'libs/jspdf.umd.min.js',
  'libs/html2canvas.min.js',
  'libs/d3.v7.min.js',
  'libs/chart.js',
  'libs/chartjs-chart-financial.js',
  'libs/xlsx.full.min.js',
  'libs/JsBarcode.all.min.js',
  'libs/qrcode.min.js',
  'libs/qrious.min.js',
  'libs/zxing.min.js',
  'libs/jszip.min.js',
  'js/env.js',
  'js/01.js',
  'js/auth-check.js',
  'js/lan.js',
  'translations.js',
  'js/curency.js',
  'js/hideme.js',
  'js/track.js',
  'js/loading.js',
  'js/open.js',
  'js/admin.js',
  'js/businessLogic.js',
  'js/bussinesetinglogic.js',
  'js/calutor.js',
  'js/customrecipt.js',
  'js/data.js',
  'js/drawcharts.js',
  'js/ui.js',
  'js/aditemsectino.js',
  'js/edititem.js',
  'js/zoom.js',
  'js/events.js',
  'js/expense.js',
  'js/export.js',
  'js/loaderrs.js',
  'js/loan.js',
  'js/note.js',
  'js/EmailSchedulee.js',
  'js/notifcation.js',
  'js/pdfgenrtor.js',
  'js/personalloan.js',
  'js/print.js',
  'js/QRCODEDONALOADER.JS',
  'js/qrcodescanner.js',
  'js/profitandloss.js',
  'js/recipt.js',
  'js/refund.js',
  'js/reminder.js',
  'js/restockitem.js',
  'js/sales.js',
  'js/salesassocitea.js',
  'js/showWeeklySalesSection.js',
  'js/howMonthlySalesSection.js',
  'js/creditsale.js',
  'js/script2.js',
  'js/stock.js',
  'js/stockhistry.js',
  'js/subcat.js',
  'js/itemmoreinfo.js',
  'js/task.js',
  'js/sharerecpit.js',
  'js/mailing.js',
  'js/intor.js',
  'js/cutromfinfder.js',
  'js/onclick.JS',
  'js/upadte.js',
  'js/daily-dashboard.js',
  'js/navbar.js'
];

// Helper function to check if response is cacheable
function isCacheableResponse(response) {
  if (!response || !response.ok) return false;
  if (response.status === 206) return false;
  if (response.status !== 200) return false;
  return true;
}

// Install event
self.addEventListener('install', event => {
  console.log(`Service Worker v${APP_VERSION} installing...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        const failed = [];
        const skipped = [];
        
        for (const asset of ASSETS_TO_CACHE) {
          try {
            const response = await fetch(asset, {
              headers: { 'Range': 'bytes=0-' }
            });
            
            if (response && isCacheableResponse(response)) {
              await cache.put(asset, response);
              console.log(`✅ Cached: ${asset}`);
            } else if (response && response.status === 206) {
              console.warn(`⚠️ Partial response for ${asset}, retrying...`);
              const fullResponse = await fetch(asset, {
                headers: { 'Range': undefined }
              });
              if (fullResponse && fullResponse.status === 200) {
                await cache.put(asset, fullResponse);
                console.log(`✅ Cached (full): ${asset}`);
              } else {
                console.warn(`⚠️ Skipped (206 partial): ${asset}`);
                skipped.push(asset);
              }
            } else {
              console.warn(`⚠️ Failed (${response?.status}): ${asset}`);
              failed.push(asset);
            }
          } catch (error) {
            console.warn(`⚠️ Error caching ${asset}:`, error.message);
            failed.push(asset);
          }
        }
        
        if (failed.length > 0) {
          console.warn('Failed to cache:', failed);
        }
        if (skipped.length > 0) {
          console.warn('Skipped (206 partial):', skipped);
        }
        console.log(`Service Worker v${APP_VERSION} install complete!`);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log(`Service Worker v${APP_VERSION} activating...`);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log(`Deleting old cache: ${key}`);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  const url = event.request.url;
  if (url.includes('supabase.co') || url.includes('api/')) {
    return;
  }
  
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('shop.html'))
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        
        const newRequest = new Request(event.request, {
          headers: new Headers(event.request.headers)
        });
        
        if (newRequest.headers.has('Range')) {
          newRequest.headers.delete('Range');
        }
        
        return fetch(newRequest)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  try {
                    cache.put(event.request, responseToCache);
                  } catch (e) {
                    console.warn('Cache put failed:', e);
                  }
                });
            }
            return networkResponse;
          })
          .catch(error => {
            console.warn('Fetch failed:', error);
            if (event.request.destination === 'image') {
              return caches.match('image/logo.jpg');
            }
            if (event.request.destination === 'document') {
              return caches.match('shop.html');
            }
            return new Response('Offline - content not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ========================================
// FIXED: Message handler (NO PROMISES in postMessage)
// ========================================

self.addEventListener('message', async function(event) {
    if (event.data && event.data.type === 'CHECK_INSTALL_STATUS') {
        const clients = await self.clients.matchAll();
        let isInstalled = false;
        
        for (const client of clients) {
            if (client.url && (client.url.includes('/myshop/') || client.url.includes('stocksalesapp'))) {
                isInstalled = true;
                break;
            }
        }
        
        event.source.postMessage({
            type: 'INSTALL_STATUS',
            installed: isInstalled
        });
    }
});

// Background sync
self.addEventListener('sync', event => {
  console.log('Background sync:', event.tag);
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncOfflineSales());
  }
});

// Push notifications
self.addEventListener('push', event => {
  console.log('Push notification received');
  const data = event.data ? event.data.json() : { title: 'StockAlert', body: 'Update available' };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'StockApp', {
      body: data.body || 'Check your inventory!',
      icon: 'image/logo.jpg',
      badge: 'image/200.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || 'shop.html' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || 'shop.html')
  );
});

async function syncOfflineSales() {
  console.log('Syncing offline sales...');
  return Promise.resolve();
}