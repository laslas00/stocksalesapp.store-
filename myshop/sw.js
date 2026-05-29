// ========================================
// SERVICE WORKER - CORRECTED VERSION
// ========================================
const APP_VERSION = '3.1.17';
const CACHE_NAME = `stockapp-v${APP_VERSION}`;
const ENGAGEMENT_CHANNEL = new BroadcastChannel('engagement-updates');

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
  'styles/output.css','src/input.css',
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
  'js/qrcodesanner.js',
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
  'js/navbar.js',
  'js/admaker.js',
  'js/buttonLoading.js',
  'js/engagement-builder.js',
  'js/index.js',
  'translations.js',
  
];


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
    caches.open(CACHE_NAME).then(async cache => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          const response = await fetch(asset);
          if (response && response.status === 200) {
            await cache.put(asset, response);
            console.log(`✅ Cached: ${asset}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to cache ${asset}:`, error.message);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log(`Service Worker v${APP_VERSION} activating...`);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
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
  if (url.includes('supabase.co') || url.includes('api/')) return;
  
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('shop.html'))
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.destination === 'image') return caches.match('image/logo.jpg');
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ========================================
// SINGLE NOTIFICATION CLICK HANDLER
// ========================================
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked');
  event.notification.close();

  const notificationData = event.notification.data || {};
  // USE ABSOLUTE PATH
  const urlToOpen = notificationData.url || '/myshop/shop.html?from=notification&skip=main';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname.includes('shop.html') && 'focus' in client) {
            return client.focus();
          }
        } catch (e) {}
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ========================================
// PUSH EVENT HANDLER (REAL PUSH NOTIFICATIONS)
// ========================================
self.addEventListener('push', event => {
  console.log('📨 Push notification received');
  
  let data = { title: 'StockApp', body: 'Update available' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body || 'Check your inventory!',
    icon: '/myshop/image/logo.jpg',
    badge: '/myshop/image/200.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/myshop/shop.html?from=notification&skip=main', type: data.type || 'push' },
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'StockApp', options)
  );
});

// ========================================
// MESSAGE HANDLER (NO localStorage!)
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
    event.source.postMessage({ type: 'INSTALL_STATUS', installed: isInstalled });
  }
});
// ========================================
// BACKGROUND SYNC FOR ENGAGEMENT
// ========================================
self.addEventListener('sync', function(event) {
  console.log('🔄 Background Sync triggered:', event.tag);
  
  if (event.tag === 'engagement-check') {
    event.waitUntil(checkAndSendEngagements());
  }
  
  if (event.tag === 'daily-engagement') {
    event.waitUntil(scheduleDailyEngagements());
  }
});
async function scheduleDailyEngagements() {
    console.log('📅 Scheduling daily engagements...');
    
    try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilTomorrow = tomorrow.getTime() - now.getTime();
        
        // Schedule daily tasks
        setTimeout(async () => {
            await checkAndSendEngagements();
            // Reschedule for next day
            scheduleDailyEngagements();
        }, msUntilTomorrow);
        
        console.log(`⏰ Daily engagement scheduled for ${tomorrow.toLocaleString()}`);
    } catch (error) {
        console.error('Error scheduling daily engagements:', error);
    }
}
// ========================================
// PERIODIC BACKGROUND SYNC (Chrome only)
// ========================================
self.addEventListener('periodicsync', function(event) {
  console.log('⏰ Periodic Sync triggered:', event.tag);
  
  if (event.tag === 'engagement-sync') {
    event.waitUntil(checkAndSendEngagements());
  }
});

// Main engagement checker
async function checkAndSendEngagements() {
  console.log('📋 Checking engagement schedule...');
  
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const today = now.toDateString();
  
  // Get stored schedule data
  const engagementData = await getEngagementData();
  
  // Morning check (6-9 AM)
  if (hour >= 6 && hour <= 9) {
    const lastMorning = engagementData.lastMorningCheck;
    if (lastMorning !== today) {
      await sendEngagementNotification('morning');
      await updateEngagementData({ lastMorningCheck: today });
    }
  }
  
  // Mid-day check (12-2 PM)
  if (hour >= 12 && hour <= 14) {
    const lastMidday = engagementData.lastMiddayCheck;
    if (lastMidday !== today) {
      await checkMiddayEngagements();
      await updateEngagementData({ lastMiddayCheck: today });
    }
  }
  
  // Evening check (6-9 PM)
  if (hour >= 18 && hour <= 21) {
    const lastEvening = engagementData.lastEveningCheck;
    if (lastEvening !== today) {
      await sendEngagementNotification('evening');
      await updateEngagementData({ lastEveningCheck: today });
    }
  }
  
  // Weekly checks
  if (day === 1) { // Monday
    const weekNum = getWeekNumber(now);
    const lastMondayMotivation = engagementData.lastMondayMotivation;
    if (lastMondayMotivation !== weekNum && hour >= 8 && hour <= 12) {
      await sendEngagementNotification('monday_motivation');
      await updateEngagementData({ lastMondayMotivation: weekNum });
    }
  }
  
  if (day === 3) { // Wednesday
    const weekNum = getWeekNumber(now);
    const lastWednesdayTip = engagementData.lastWednesdayTip;
    if (lastWednesdayTip !== weekNum && hour >= 10 && hour <= 14) {
      await sendEngagementNotification('business_tip');
      await updateEngagementData({ lastWednesdayTip: weekNum });
    }
  }
  
  // Check low stock daily
  await checkLowStockAlert();
  
  // Check inactivity
  await checkUserInactivity();
  
  // Schedule next check
  await scheduleNextEngagementCheck();
}

// Send engagement notification with appropriate message
async function sendEngagementNotification(type) {
  const messages = getEngagementMessages(type);
  if (!messages) return;
  
  const message = Array.isArray(messages) ? 
    messages[Math.floor(Math.random() * messages.length)] : 
    messages;
  
  await self.registration.showNotification(message.title, {
    body: message.body,
    icon: '/myshop/image/logo.jpg',
    badge: '/myshop/image/200.png',
    vibrate: [200, 100, 200],
    tag: `engagement-${type}-${Date.now()}`,
    data: { 
      type: type,
      url: '/myshop/shop.html?from=notification&skip=main',
      timestamp: Date.now()
    },
    requireInteraction: type === 'inactive_alert',
    actions: [
      {
        action: 'open',
        title: 'Open App'
      }
    ]
  });
}

// Get messages based on type 
function getEngagementMessages(type) {
  const messages = {
    morning: [
      { title: '🌅 Good Morning!', body: 'Start your day by checking stock levels!' },
      { title: '☀️ Rise and Shine!', body: 'Your business awaits! Check inventory now.' }
    ],
    midday_reminder: [  // ADD THIS SECTION
      { title: '☀️ Afternoon Check', body: 'How are your sales going today?' },
      { title: '📊 Midday Update', body: 'Time to check your stock levels and sales!' },
      { title: '💼 Business Check', body: 'Review your morning sales and plan for the afternoon!' }
    ],
    evening: [
      { title: '🌙 Evening Check-in', body: 'Record all sales before closing!' },
      { title: '📝 End of Day', body: 'Don\'t forget to update your stock!' }
    ],
    monday_motivation: [
      { title: '💪 New Week, New Goals!', body: 'Make this week amazing for your business!' },
      { title: '🚀 Week Ahead!', body: 'Plan your stock management for success!' }
    ],
    business_tip: [
      { title: '💡 Business Tip', body: 'Review your top 10 products for better insights!' },
      { title: '📊 Smart Management', body: 'Check profit margins on bestsellers!' }
    ],
    inactive_alert: [
      { title: '👋 We Miss You!', body: 'You haven\'t checked your stock in {days} days!' }
    ],
    low_stock: [
      { title: '⚠️ Low Stock Alert', body: '{count} items need restocking!' }
    ]
  };
  
  return messages[type];
}
// Check and alert about low stock
async function checkLowStockAlert() {
  const stockData = await getLocalStockData();
  if (!stockData) return;
  
  const lowStockItems = stockData.filter(item => 
    item.quantity <= (item.min_stock || 5)
  );
  
  if (lowStockItems.length > 0) {
    const messages = getEngagementMessages('low_stock');
    const message = messages[0];
    message.body = message.body.replace('{count}', lowStockItems.length);
    
    await sendEngagementNotification('low_stock');
  }
}

// Check user inactivity
async function checkUserInactivity() {
  const lastActivity = await getLastActivityTime();
  const now = Date.now();
  const inactiveHours = (now - lastActivity) / (1000 * 60 * 60);
  
  if (inactiveHours > 48) { // 2 days inactive
    const messages = getEngagementMessages('inactive_alert');
    const message = { ...messages[0] };
    message.body = message.body.replace('{days}', Math.floor(inactiveHours / 24));
    
    await sendEngagementNotification('inactive_alert');
  }
}

// Schedule next check
async function scheduleNextEngagementCheck() {
  try {
    // Try periodic background sync (Chrome)
    if ('periodicSync' in self.registration) {
      await self.registration.periodicSync.register('engagement-sync', {
        minInterval: 60 * 60 * 1000 // 1 hour minimum
      });
      console.log('✅ Periodic sync registered');
    }
    
    // Fallback: Register regular background sync
    await self.registration.sync.register('engagement-check');
    console.log('✅ Background sync registered');
  } catch (error) {
    console.warn('⚠️ Could not register background sync:', error);
  }
}

// ========================================
// DATA STORAGE (IndexedDB instead of localStorage)
// ========================================
function openEngagementDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EngagementDB', 1);
    
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('engagements')) {
        db.createObjectStore('engagements', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('activity')) {
        db.createObjectStore('activity', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('stock')) {
        db.createObjectStore('stock', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = function(event) {
      resolve(event.target.result);
    };
    
    request.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

async function getEngagementData() {
  const db = await openEngagementDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['engagements'], 'readonly');
    const store = transaction.objectStore('engagements');
    const request = store.get('schedule');
    
    request.onsuccess = () => resolve(request.result?.data || {});
    request.onerror = () => reject(request.error);
  });
}

async function updateEngagementData(data) {
  const db = await openEngagementDB();
  const existing = await getEngagementData();
  const updated = { ...existing, ...data };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['engagements'], 'readwrite');
    const store = transaction.objectStore('engagements');
    const request = store.put({ id: 'schedule', data: updated });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getLastActivityTime() {
  const db = await openEngagementDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['activity'], 'readonly');
    const store = transaction.objectStore('activity');
    const request = store.get('lastActivity');
    
    request.onsuccess = () => {
      resolve(request.result?.timestamp || Date.now() - (7 * 24 * 60 * 60 * 1000));
    };
    request.onerror = () => resolve(Date.now());
  });
}

async function getLocalStockData() {
  const db = await openEngagementDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['stock'], 'readonly');
    const store = transaction.objectStore('stock');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

// ========================================
// HELPER FUNCTIONS
// ========================================
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ========================================
// MESSAGE HANDLING FROM MAIN APP
// ========================================
self.addEventListener('message', async function(event) {
  if (!event.data) return;
  
  switch(event.data.type) {
    case 'UPDATE_ACTIVITY':
      const db = await openEngagementDB();
      const transaction = db.transaction(['activity'], 'readwrite');
      const store = transaction.objectStore('activity');
      store.put({ id: 'lastActivity', timestamp: Date.now() });
      break;
      
    case 'UPDATE_STOCK':
      const stockDb = await openEngagementDB();
      const stockTransaction = stockDb.transaction(['stock'], 'readwrite');
      const stockStore = stockTransaction.objectStore('stock');
      // Clear and update stock data
      stockStore.clear();
      event.data.items.forEach(item => stockStore.put(item));
      break;
      
    case 'INIT_ENGAGEMENT_SYSTEM':
      await checkAndSendEngagements();
      await scheduleNextEngagementCheck();
      break;
      
    case 'CHECK_INSTALL_STATUS':
      const clients = await self.clients.matchAll();
      const isInstalled = clients.some(client => 
        client.url.includes('/myshop/') || client.url.includes('stocksalesapp')
      );
      event.source.postMessage({ type: 'INSTALL_STATUS', installed: isInstalled });
      break;
  }
});

// Initialize when service worker activates
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      scheduleNextEngagementCheck(),
      checkAndSendEngagements()
    ])
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/myshop/shop.html';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes('shop.html') && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});

console.log('✅ Offline-First Engagement Service Worker Ready!');
// Main engagement checker
async function checkAndSendEngagements() {
  console.log('📋 Checking engagement schedule...');
  
  try {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const today = now.toDateString();
    
    // Get stored schedule data
    const engagementData = await getEngagementData();
    
    // Morning check (6-9 AM)
    if (hour >= 6 && hour <= 9) {
      const lastMorning = engagementData.lastMorningCheck;
      if (lastMorning !== today) {
        await sendEngagementNotification('morning');
        await updateEngagementData({ lastMorningCheck: today });
      }
    }
    
    // Mid-day check (12-2 PM)
    if (hour >= 12 && hour <= 14) {
      const lastMidday = engagementData.lastMiddayCheck;
      if (lastMidday !== today) {
        await checkMiddayEngagements();  // Now this function exists!
        await updateEngagementData({ lastMiddayCheck: today });
      }
    }
    
    // Evening check (6-9 PM)
    if (hour >= 18 && hour <= 21) {
      const lastEvening = engagementData.lastEveningCheck;
      if (lastEvening !== today) {
        await sendEngagementNotification('evening');
        await updateEngagementData({ lastEveningCheck: today });
      }
    }
    
    // Weekly checks
    if (day === 1) { // Monday
      const weekNum = getWeekNumber(now);
      const lastMondayMotivation = engagementData.lastMondayMotivation;
      if (lastMondayMotivation !== weekNum && hour >= 8 && hour <= 12) {
        await sendEngagementNotification('monday_motivation');
        await updateEngagementData({ lastMondayMotivation: weekNum });
      }
    }
    
    if (day === 3) { // Wednesday
      const weekNum = getWeekNumber(now);
      const lastWednesdayTip = engagementData.lastWednesdayTip;
      if (lastWednesdayTip !== weekNum && hour >= 10 && hour <= 14) {
        await sendEngagementNotification('business_tip');
        await updateEngagementData({ lastWednesdayTip: weekNum });
      }
    }
    
    // Check low stock daily
    await checkLowStockAlert();
    
    // Check inactivity
    await checkUserInactivity();
    
    // Schedule next check
    await scheduleNextEngagementCheck();
    
  } catch (error) {
    console.error('❌ Error in engagement check:', error);
  }
}

// Check mid-day engagements
async function checkMiddayEngagements() {
  console.log('🌤️ Running mid-day engagement checks...');
  
  try {
    // Check if there are any sales recorded today
    const hasSales = await checkTodaySales();
    
    if (!hasSales) {
      // If no sales yet, send a reminder
      await sendEngagementNotification('midday_reminder');
    }
    
    // Check stock levels at midday
    await checkLowStockAlert();
    
    // Check for any pending tasks or reminders
    await checkPendingReminders();
    
  } catch (error) {
    console.error('Error in midday engagement check:', error);
  }
}

// Check if there are sales recorded today
async function checkTodaySales() {
  try {
    const db = await openEngagementDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['activity'], 'readonly');
      const store = transaction.objectStore('activity');
      const request = store.get('todaySales');
      
      request.onsuccess = () => {
        const data = request.result;
        if (data && data.timestamp) {
          const today = new Date().toDateString();
          const saleDate = new Date(data.timestamp).toDateString();
          resolve(today === saleDate && data.count > 0);
        } else {
          resolve(false);
        }
      };
      request.onerror = () => resolve(false);
    });
  } catch (error) {
    return false;
  }
}

// Check for pending reminders
async function checkPendingReminders() {
  try {
    const db = await openEngagementDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['engagements'], 'readonly');
      const store = transaction.objectStore('engagements');
      const request = store.get('reminders');
      
      request.onsuccess = () => {
        const data = request.result?.data;
        if (data && data.pendingReminders && data.pendingReminders.length > 0) {
          // Notify about pending reminders
          console.log(`📝 Found ${data.pendingReminders.length} pending reminders`);
        }
        resolve();
      };
      request.onerror = () => resolve();
    });
  } catch (error) {
    // Silently fail for reminders
  }
}
