
const MYSUPABASE_URL =window.ENV?.MYSHOPSUPABASE_URL || 'https://zexxdoxuzvkovszfqcio.supabase.co';
const MY_ANON_KEY = window.ENV?.MYSHOPSUPABASE_ANON_KEY || 'your-anon-key-here';

// Create a dedicated Supabase client for setup (YOUR project, not track.js)
let setupDB = null;

let notificationSound = null;

let businessInfo = null;

function getSB() {
    if (setupDB && setupDB.from) {
        return setupDB;
    }
    
    // Check if Supabase CDN is loaded
    if (!window.supabase || !window.supabase.createClient) {
        console.error('❌ Supabase CDN library not loaded yet. Retrying...');
        // Wait and retry once
        return new Promise((resolve) => {
            setTimeout(() => {
                if (window.supabase && window.supabase.createClient) {
                    setupDB = window.supabase.createClient(MYSUPABASE_URL, MY_ANON_KEY);
                    console.log('✅ Setup Supabase client created (retry)');
                    resolve(setupDB);
                } else {
                    console.error('❌ Supabase CDN still not available');
                    resolve(null);
                }
            }, 1000);
        });
    }
    
    setupDB = window.supabase.createClient(MYSUPABASE_URL, MY_ANON_KEY);
    console.log('✅ Setup Supabase client created for YOUR project');
    return setupDB;
}

let realtimeSubscription = null;
let salesRefreshTimer = null;

function scheduleSalesYearRefresh(delay = 1500) {
    if (salesRefreshTimer) {
        clearTimeout(salesRefreshTimer);
    }
    salesRefreshTimer = setTimeout(async () => {
        salesRefreshTimer = null;
        if (typeof loadSalesForYear === 'function') {
            try {
                await loadSalesForYear(new Date().getFullYear());
                if (typeof renderSales === 'function') renderSales();
            } catch (refreshError) {
                console.error('Failed to refresh sales after realtime event:', refreshError);
            }
        }
    }, delay);
}



// ========================================
// SUPABASE CLIENT
// ========================================

function getSB() {
    if (setupDB && setupDB.from) {
        return setupDB;
    }
    
    if (!window.supabase || !window.supabase.createClient) {
        console.error('❌ Supabase CDN library not loaded yet. Retrying...');
        return new Promise((resolve) => {
            setTimeout(() => {
                if (window.supabase && window.supabase.createClient) {
                    setupDB = window.supabase.createClient(MYSUPABASE_URL, MY_ANON_KEY);
                    console.log('✅ Setup Supabase client created (retry)');
                    resolve(setupDB);
                } else {
                    console.error('❌ Supabase CDN still not available');
                    resolve(null);
                }
            }, 1000);
        });
    }
    
    setupDB = window.supabase.createClient(MYSUPABASE_URL, MY_ANON_KEY);
    console.log('✅ Setup Supabase client created');
    return setupDB;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function translate(key, fallback = key) {
    const translations = {
        'product': 'Product',
        'sales_for_year': 'sales for the year',
        'loaded_sales_year': '✅ Loaded',
        'loading_data_for_year': '📅 Loading data for year',
        'all_data_loaded': 'All data successfully loaded for',
        'failed_to_load_some_data': 'Failed to load some data',
        'error_loading_stock': 'Error loading stock',
        'error_loading_credit_sales': 'Error loading credit sales',
        'loaded_loans': 'Loans loaded:',
        'full_error_loading_loans': 'Error loading loans:',
        'using_local_data': 'Using cached local data',
        'error': 'Error',
        'offline_using_cached': 'Offline mode - using cached stock data',
        'storage_full_warning': 'Could not cache stock data',
        'attempting_load_stock': 'Attempting to load stock from Supabase...',
        'invalid_date': 'Invalid Date'
    };
    return translations[key] || fallback;
}


function scheduleSalesYearRefresh(delay = 1500) {
    if (salesRefreshTimer) clearTimeout(salesRefreshTimer);
    salesRefreshTimer = setTimeout(async () => {
        salesRefreshTimer = null;
        if (typeof loadSalesForYear === 'function') {
            try {
                await loadSalesForYear(new Date().getFullYear());
                if (typeof renderSales === 'function') renderSales();
            } catch (refreshError) {
                console.error('Failed to refresh sales:', refreshError);
            }
        }
    }, delay);
}

// ========================================
// NATIVE PUSH NOTIFICATIONS
// ========================================

function canUseNativePush() {
    const hasPush = 'PushManager' in window;
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
    const isSupported = 'serviceWorker' in navigator && hasPush && isSecure;
    
    console.log('Native Push Support:', {
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: hasPush,
        https: isSecure,
        supported: isSupported
    });
    
    return isSupported;
}

async function requestPushPermission() {
    if (!canUseNativePush()) {
        console.log('Native push not supported');
        return false;
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('✅ Push notification permission granted');
            await subscribeToPush();
            return true;
        } else {
            console.log('❌ Push permission denied');
            return false;
        }
    } catch (error) {
        console.error('Error requesting push permission:', error);
        return false;
    }
}

async function subscribeToPush() {
    if (!canUseNativePush()) return null;
    
    try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            // ✅ USE YOUR ACTUAL VAPID PUBLIC KEY (not the demo key!)
            const YOUR_VAPID_PUBLIC_KEY = 'BCqU66A4QXNDI5gSketfQ37RXpiZszkNtRAZ6SikdBwiJCAQqdFa25tsOrbewdanquyxJ9tuRqLoCe_1KSU0FUI';
            
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(YOUR_VAPID_PUBLIC_KEY)
            });
            
            console.log('✅ Push subscription created');
            await savePushSubscription(subscription);
        } else {
            console.log('✅ Already subscribed to push');
        }
        
        return subscription;
    } catch (error) {
        console.error('Failed to subscribe to push:', error);
        return null;
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function savePushSubscription(subscription) {
    try {
        const client = getSB();
        if (!client) {
            console.error('No Supabase client');
            return false;
        }

        const businessId = (typeof currentUser !== 'undefined' && currentUser?.business_id) || 
                          (typeof businessInfo !== 'undefined' && businessInfo?.id) || 
                          localStorage.getItem('businessId');
        
        const userId = (typeof currentUser !== 'undefined' && currentUser?.id) || 
                       localStorage.getItem('userId');

        const p256dh = subscription.getKey('p256dh');
        const auth = subscription.getKey('auth');

        const payload = {
            business_id: businessId,
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: p256dh ? arrayBufferToBase64(p256dh) : '',
            auth: auth ? arrayBufferToBase64(auth) : '',
            user_agent: navigator.userAgent
        };

        // Upsert to Supabase
        const { error } = await client
            .from('push_subscriptions')
            .upsert(payload, { onConflict: 'endpoint' });

        if (error) {
            console.error('Failed saving push subscription:', error);
            return false;
        }

        console.log('✅ Push subscription saved to Supabase');
        
        // Also store locally as fallback
        localStorage.setItem('pushSubscription', JSON.stringify({
            endpoint: subscription.endpoint,
            keys: { p256dh: payload.p256dh, auth: payload.auth }
        }));
        
        return true;
    } catch (error) {
        console.error('Push subscription error:', error);
        return false;
    }
}
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
async function initializePushAfterLogin() {
    console.log('🔔 Checking push notification setup after login...');
    
    // Check if user is logged in
    const businessId = localStorage.getItem('businessId');
    const userId = localStorage.getItem('userId');
    
    if (!businessId || !userId) {
        console.log('⚠️ User not logged in yet - push notifications will initialize after login');
        return false;
    }
    
    console.log(`✅ User logged in - business: ${businessId}, user: ${userId}`);
    
    // Check if push is supported
    if (!('PushManager' in window)) {
        console.log('❌ Push not supported in this browser');
        return false;
    }
    
    // Check notification permission
    if (Notification.permission === 'granted') {
        console.log('✅ Notification permission already granted, subscribing...');
        await subscribeToPush();
        return true;
    } 
    else if (Notification.permission === 'default') {
        console.log('🔔 Notification permission not set - will ask on user interaction');
        
        // Ask for permission on next click
        const askOnInteraction = async () => {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ User granted notification permission');
                await subscribeToPush();
            } else {
                console.log('❌ User denied notification permission');
            }
            document.removeEventListener('click', askOnInteraction);
            document.removeEventListener('touchstart', askOnInteraction);
        };
        
        document.addEventListener('click', askOnInteraction, { once: true });
        document.addEventListener('touchstart', askOnInteraction, { once: true });
        
        // Show a subtle hint to the user
        console.log('👆 Click anywhere to enable notifications for real-time alerts');
    } 
    else {
        console.log('❌ Notification permission already denied');
    }
    
    return false;
}
async function sendNativePushNotification(title, body, data = {}, options = {}) {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body: body,
                icon: options.icon || '/image/logo.jpg',
                badge: options.badge || '/image/200.png',
                vibrate: options.vibrate || [200, 100, 200],
                tag: options.tag || `stockapp-${Date.now()}`,
                data: { url: data.url || window.location.href, type: data.type || 'notification', ...data },
                actions: options.actions || [
                    { action: 'view', title: 'View Details' },
                    { action: 'dismiss', title: 'Dismiss' }
                ],
                silent: options.silent || false,
                requireInteraction: options.requireInteraction || false,
                timestamp: Date.now()
            });
            console.log(`📱 Native push sent: "${title}"`);
            return true;
        } catch (error) {
            console.error('Failed to send native push:', error);
            return false;
        }
    }
    
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/image/logo.jpg' });
        return true;
    }
    
    return false;
}
// ========================================
// TRIGGER PUSH NOTIFICATIONS VIA EDGE FUNCTION
// ========================================

async function triggerPushNotification(title, body, type, data = {}) {
    try {
        const businessId = (typeof currentUser !== 'undefined' && currentUser?.business_id) || 
                          (typeof businessInfo !== 'undefined' && businessInfo?.id) || 
                          localStorage.getItem('businessId');
        
        console.log(`📤 Triggering push: ${title} for business ${businessId}`);
        
        const response = await fetch(
            `${MYSUPABASE_URL}/functions/v1/send-push`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MY_ANON_KEY}`
                },
                body: JSON.stringify({
                    title: title,
                    body: body,
                    type: type,
                    business_id: businessId,
                    requireInteraction: data.requireInteraction || type === 'sale' || type === 'low_stock',
                    data: data
                })
            }
        );
        
        const result = await response.json();
        console.log(`📊 Push result:`, result);
        return result;
    } catch (error) {
        console.error('Failed to trigger push:', error);
        return null;
    }
}
// ========================================
// WEBSOCKET / REALTIME CONNECTION - FIXED
// ========================================

function connectWebSocket() {
    console.log('🔌 Setting up Supabase Realtime...');
    
    const client = getSB();
    if (!client) {
        console.warn('Supabase not available for realtime');
        return;
    }
    
    if (canUseNativePush() && Notification.permission !== 'granted') {
        const askOnInteraction = async () => {
            await requestPushPermission();
            document.removeEventListener('click', askOnInteraction);
            document.removeEventListener('touchstart', askOnInteraction);
        };
        document.addEventListener('click', askOnInteraction);
        document.addEventListener('touchstart', askOnInteraction);
    }
    
    const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
    console.log('🔍 Realtime filtering by business_id:', currentBusinessId);
    
    notificationSound = new Audio('/sounds/notification.mp3');
    notificationSound.load();
    
    function playNotificationSound() {
        if (notificationSound && !localStorage.getItem('muteNotifications')) {
            notificationSound.currentTime = 0;
            notificationSound.play().catch(e => console.log('Sound play prevented:', e));
        }
    }
    
    if (realtimeSubscription) realtimeSubscription.unsubscribe();
    
realtimeSubscription = client
    .channel('sales-realtime-channel')  // ← Any unique name works
        // FIXED: Added 'async' to callback
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'sales', filter: currentBusinessId ? `business_id=eq.${currentBusinessId}` : undefined },
            async (payload) => {  // ← ADDED async
                const sale = payload.new;
                if (currentBusinessId && sale.business_id !== currentBusinessId) return;
                
                const saleUser = (typeof users !== 'undefined' ? users.find(u => u.username === sale.username) : null) || currentUser;
                scheduleSalesYearRefresh();
                playNotificationSound();
                
                const productName = sale.productName || sale.product_name || 'a product';
                const amount = sale.price || sale.total_amount || 0;
                const formattedAmount = typeof formatCurrency === 'function' ? formatCurrency(amount) : amount;
                
                // FIXED: Correct parameter order - triggerPushNotification expects (title, body, type, data)
                await triggerPushNotification(
                    '💰 New Sale!',
                    `${saleUser?.username || 'Someone'} sold ${productName} for ${formattedAmount}`,
                    'sale',  // ← type parameter
                    {  // ← data parameter
                        saleId: sale.id, 
                        saleData: sale, 
                        url: window.location.href,
                        tag: `sale-${sale.id}`,
                        requireInteraction: true
                    }
                );
                
                if (typeof enqueueNotification === 'function') {
                    enqueueNotification((data, done) => showSaleNotificationBar(data.sale, data.user, done), { sale: sale, user: saleUser });
                }
            }
        )
        // FIXED: Tasks handler with async
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'tasks', filter: currentBusinessId ? `business_id=eq.${currentBusinessId}` : undefined },
            async (payload) => {  // ← ADDED async
                const task = payload.new;
                if (currentBusinessId && task.business_id !== currentBusinessId) return;
                playNotificationSound();
                await triggerPushNotification(
                    '📋 New Task',
                    `${task.title || 'New task'} - ${task.description || 'Click to view'}`,
                    'task',
                    { taskId: task.id, taskData: task, url: window.location.href, tag: `task-${task.id}` }
                );
                if (typeof showTaskNotificationBar === 'function') showTaskNotificationBar(task);
                if (typeof loadTasks === 'function') loadTasks();
            }
        )
        // FIXED: Stock handler with async
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'stock', filter: currentBusinessId ? `business_id=eq.${currentBusinessId}` : undefined },
            async (payload) => {  // ← ADDED async
                const item = payload.new;
                if (currentBusinessId && item.business_id !== currentBusinessId) return;
                if (item.quantity < 3) {
                    playNotificationSound();
                    await triggerPushNotification(
                        '⚠️ Low Stock Alert',
                        `${item.name} has only ${item.quantity} left!`,
                        'low_stock',
                        { itemId: item.id, itemData: item, url: window.location.href, tag: `stock-${item.id}`, requireInteraction: true }
                    );
                    if (typeof enqueueNotification === 'function') {
                        enqueueNotification(showLowStockNotificationBar, { itemName: item.name, quantity: item.quantity, itemData: item });
                    }
                }
            }
        )
        // FIXED: Reminders handler with async
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'reminders', filter: currentBusinessId ? `business_id=eq.${currentBusinessId}` : undefined },
            async (payload) => {  // ← ADDED async
                const reminder = payload.new;
                if (currentBusinessId && reminder.business_id !== currentBusinessId) return;
                playNotificationSound();
                await triggerPushNotification(
                    '🔔 Reminder',
                    reminder.title || reminder.message || 'You have a new reminder',
                    'reminder',
                    { reminderId: reminder.id, reminderData: reminder, url: window.location.href, tag: `reminder-${reminder.id}` }
                );
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Supabase Realtime connected');
            } else {
                console.log('🔄 Realtime status:', status);
            }
        });
}
function disconnectRealtime() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
        console.log('🔌 Realtime disconnected');
    }
}

// ========================================
// TEST FUNCTIONS
// ========================================

async function testNativeNotification() {
    console.log('🧪 Testing native push notification...');
    
    if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            alert('Please enable notifications to test');
            return;
        }
    }
    
    if (!('serviceWorker' in navigator)) {
        alert('Service Worker not supported');
        return;
    }
    
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('🧪 Test Notification', {
        body: 'If you see this, native notifications work!',
        icon: '/image/logo.jpg',
        badge: '/image/200.png',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        requireInteraction: true,
        data: { url: window.location.href, type: 'test' }
    });
    
    console.log('✅ Test notification sent!');
    alert('Test notification sent! Check your notification shade.');
}

async function registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-notifications');
            console.log('✅ Background sync registered');
        } catch (error) {
            console.log('Background sync not available:', error);
        }
    }
}

async function loadSalesForYear(year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    cleanupMemory();
    await loadSales(startDate, endDate);
    
    // Log with translation
    console.log(`${translate('loaded_sales_year') || '✅ Loaded'} ${sales.length} ${translate('sales_for_year') || 'sales for the year'} ${year} (P&L).`);
}

async function loadSalesForFiveMonths(year, startMonth = 1) {
    // Ensure valid year and start month
    if (!year) year = new Date().getFullYear();
    if (startMonth < 1) startMonth = 1;
    if (startMonth > 12) startMonth = 12;

    // Calculate end month safely (max 12)
    let endMonth = startMonth + 4;
    if (endMonth > 12) endMonth = 12;

    // Format start and end dates (e.g., "2025-03-01" to "2025-07-31")
    const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
    const endDate = new Date(year, endMonth, 0).toISOString().slice(0, 10); // last day of endMonth

    cleanupMemory();
    await loadSales(startDate, endDate);

    // Log with translation
    console.log(`${translate('loaded_sales_range') || '✅ Loaded'} ${sales.length} ${translate('sales_from') || 'sales from'} ${startDate} ${translate('to') || 'to'} ${endDate} (${translate('five_months') || '5 months'}).`);
}

async function loadStockTOSAVE() {
    // First check localStorage for cached stock
    const cachedStock = localStorage.getItem('cached_stock');
    if (cachedStock) {
        console.log('Loading cached stock from localStorage...');
        try {
            stock = JSON.parse(cachedStock);
            stock.forEach(item => {
                if (!item.type) item.type = translate('product') || 'product';
            });
        } catch (error) {
            console.error('Error parsing cached stock:', error);
            stock = [];
        }
    }

    // If offline, use cached data and stop here
    if (!navigator.onLine) {
        console.log(translate('offline_using_cached') || 'Offline mode - using cached stock data');
        if (!stock || stock.length === 0) {
            const offlineStock = localStorage.getItem('offline_stock');
            if (offlineStock) {
                try {
                    stock = JSON.parse(offlineStock);
                    stock.forEach(item => {
                        if (!item.type) item.type = translate('product') || 'product';
                    });
                } catch (error) {
                    stock = [];
                }
            }
        }
        return;
    }

    // Online: fetch fresh data from Supabase
    try {
        console.log('Fetching fresh stock data from Supabase...');
        
        const client = getSB();
        if (!client) throw new Error('Database connection not available');
        
        // Get business ID for multi-tenant filtering
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
          let query = client
            .from('stock')
            .select('*')
            .order('name', { ascending: true });
        
 
        
        // Filter by business if multi-tenant
        if (currentBusinessId) {
            query = query.eq('business_id', currentBusinessId);
        }

        const { data: freshStock, error } = await query;

        if (error) throw new Error(error.message);
        
        // Ensure 'type' property exists
        (freshStock || []).forEach(item => {
            if (!item.type) item.type = translate('product') || 'product';
        });
        
        // Update stock variable
        stock = freshStock || [];
        
        // Save to localStorage for caching
        try {
            localStorage.setItem('cached_stock', JSON.stringify(stock));
            localStorage.setItem('offline_stock', JSON.stringify(stock));
            console.log(`📦 Stock cached: ${stock.length} items (business: ${currentBusinessId || 'all'})`);
        } catch (storageError) {
            console.warn(translate('storage_full_warning') || 'Could not cache stock data:', storageError);
        }
        
    } catch (error) {
        console.error(translate('error_loading_stock') || 'Error loading stock:', error);
        
        if (cachedStock && stock && stock.length > 0) {
            console.log('Using cached stock data after fetch error');
        } else {
            stock = [];
        }
    }
}

async function loadStock() {
    try {
        console.log(translate('attempting_load_stock') || 'Attempting to load stock from Supabase...');
        
        const client = getSB();
        if (!client) throw new Error('Database connection not available');
        
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
        let query = client.from('stock').select('id,name,quantity,type,business_id,image_url,price,cost_price',).order('name', { ascending: true });
        if (currentBusinessId) query = query.eq('business_id', currentBusinessId);
        
        const { data, error } = await query;

        if (error) throw new Error(error.message);
        
        stock = data || [];
        
        stock.forEach(item => {
            if (!item.type) item.type = translate('product');
        });
        
        localStorage.setItem('cached_stock', JSON.stringify(stock));
        localStorage.setItem('offline_stock', JSON.stringify(stock));
        
        console.log(`📦 Stock loaded: ${stock.length} items (business: ${currentBusinessId || 'all'})`);
    } catch (error) {
        console.error(translate('error_loading_stock') || 'Error loading stock:', error);
        const offlineStock = localStorage.getItem('offline_stock');
        stock = offlineStock ? JSON.parse(offlineStock) : [];
    }
}

async function loadCreditSales() {
    try {
        const client = getSB();
        if (!client) throw new Error('Database connection not available');
        
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
        let query = client.from('credit_sales').select('*').order('created_at', { ascending: false });
        if (currentBusinessId) query = query.eq('business_id', currentBusinessId);
        
        const { data, error } = await query;

        if (error) throw new Error(error.message);
        
        creditSales = data || [];
        console.log(`💳 Credit sales loaded: ${creditSales.length} (business: ${currentBusinessId || 'all'})`);
    } catch (error) {
        console.error(translate('error_loading_credit_sales') || 'Error loading credit sales:', error);
        creditSales = [];
    }
}

async function loadStockHistory(startDateStr, endDateStr) {
    try {
        console.log('🔍 loadStockHistory called with:', { startDateStr, endDateStr });

        // ... existing offline check ...

        const client = getSB();
        if (!client) throw new Error('Database connection not available');
        
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
        let query = client.from('stock_history').select('*');
        
        // ONLY filter by business if we have one
        if (currentBusinessId) {
            query = query.eq('business_id', currentBusinessId);
            console.log('🔍 Filtering by business_id:', currentBusinessId);
        }
        
        // ONLY filter by date if dates provided AND not default (Jan 1)
        if (startDateStr && endDateStr) {
            query = query.gte('timestamp', startDateStr).lte('timestamp', endDateStr + 'T23:59:59');
            console.log('🔍 Filtering by date:', startDateStr, 'to', endDateStr);
        }
        
        const { data, error } = await query.order('timestamp', { ascending: false });

        if (error) throw new Error(error.message);

        stockHistory = data || [];
        console.log(`📜 Stock history loaded: ${stockHistory.length} entries`, 
            stockHistory.length > 0 ? { first: stockHistory[0].item_name, last: stockHistory[stockHistory.length-1].item_name } : 'EMPTY');

        return stockHistory;
    } catch (error) {
        console.error('Error loading stock history:', error);
        stockHistory = [];
        return [];
    }
}
async function loadBusinessInfo() {
    try {
        const client = getSB();
        if (!client) throw new Error('Database connection not available');
        
        // Get business ID from multiple sources
        const businessId = localStorage.getItem('businessId') || 
                          (typeof businessInfo !== 'undefined' && businessInfo?.id) || null;
        
        let query = client.from('business_info').select('*');
        if (businessId) {
            query = query.eq('id', businessId);
        }
        
        const { data, error } = await query.limit(1).maybeSingle();

        if (error) throw new Error(error.message);
        
        if (!data) {
            console.warn('No business info found');
            throw new Error('No business info found');
        }
        
        console.log('Raw data from Supabase:', data);
        
        // Map Supabase columns to app format
        businessInfo = {
            id: data.id,
            name: data.name || '',
            address: data.address || '',
            shopNumber: data.shop_number || data.phone || '',
            phoneNumberTwo: data.phone_number_two || '',
            email: data.email || '',
            Website: data.website || '',
            socialMediaHandles: data.social_media_handles || '',
            details: data.details || '',
            logoData: data.logo_url || '',
            logo_url: data.logo_url || '',
            warrantyDuration: data.warranty_duration || 0,
            warrantyUnit: data.warranty_unit || 'days',
            warrantyText: data.warranty_text || '',
            currency: data.currency || 'XAF',
            fontStyle: data.font_style || 'default',
            currentLanguage: data.language || 'en',
            festiveBadgeEnabled: data.festive_badge_enabled || false,
            currentBadgeIndex: data.current_badge_index || 0,
            ownerName: data.owner_name || '',
            setup_completed: data.setup_completed,
            created_at: data.created_at,
            updated_at: data.updated_at
        };

        // Cache business ID
        if (businessInfo.id) {
            localStorage.setItem('businessId', businessInfo.id);
        }

        localStorage.setItem('businessInfo', JSON.stringify(businessInfo));

        if (businessInfo.currency) {
            currentCurrency = businessInfo.currency;
            localStorage.setItem('currency', currentCurrency);
            if (typeof currencySelector !== 'undefined' && currencySelector) currencySelector.value = currentCurrency;
            if (typeof updateCurrencyLabels === 'function') updateCurrencyLabels();
        }
        
        if (typeof applyBusinessFontStyle === 'function') applyBusinessFontStyle(businessInfo.fontStyle);
        
        if (businessInfo.currentLanguage) {
            currentLanguage = businessInfo.currentLanguage;
            localStorage.setItem('language', currentLanguage);
            const languageSelector = document.getElementById('languageSelector');
            if (languageSelector) languageSelector.value = currentLanguage;
            if (typeof translateUI === 'function') translateUI();
        }

        if (typeof updateHomeLogo === 'function') updateHomeLogo();
        if (typeof populatePrintFooter === 'function') populatePrintFooter();
        if (typeof applyGlobalFestiveSettings === 'function') applyGlobalFestiveSettings();
        
        console.log('✅ Business info loaded:', businessInfo.id);
    } catch (error) {
        console.error('Error loading business info:', error);
        
        const savedBusinessInfo = localStorage.getItem('businessInfo');
        if (savedBusinessInfo) {
            try {
                businessInfo = JSON.parse(savedBusinessInfo);
                if (businessInfo.id) localStorage.setItem('businessId', businessInfo.id);
                return;
            } catch (parseError) {}
        }
        
        businessInfo = {
            name: '', address: '', shopNumber: '', phoneNumberTwo: '',
            email: '', Website: '', socialMediaHandles: '', details: '',
            logoData: '', warrantyDuration: 0, warrantyUnit: 'none',
            warrantyText: '', currency: 'XAF', fontStyle: '',
            currentLanguage: 'en', festiveBadgeEnabled: false, currentBadgeIndex: 0
        };
        localStorage.setItem('businessInfo', JSON.stringify(businessInfo));
    }
}
function normalizeStockHistoryTimestamps() {
    // NO CHANGE - same as before
    stockHistory.forEach(entry => {
        const date = new Date(entry.timestamp);
        if (!isNaN(date)) {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const mi = String(date.getMinutes()).padStart(2, '0');
            const ss = String(date.getSeconds()).padStart(2, '0');
            entry.normalizedTimestamp = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
        } else {
            entry.normalizedTimestamp = translate('invalid_date') || 'Invalid Date';
        }
    });
}

async function fixMissingSaleDates() {
    // This was a POST endpoint - with Supabase you'd do an UPDATE
    try {
        const client = getSB();
        if (!client) throw new Error('Database not available');
        
        const { data: salesWithoutDates, error: fetchError } = await client
            .from('sales')
            .select('id')
            .is('date_sold', null);

        if (fetchError) throw fetchError;

        if (!salesWithoutDates || salesWithoutDates.length === 0) {
            console.log('No sales with missing dates');
            return;
        }

        const { error: updateError } = await client
            .from('sales')
            .update({ date_sold: new Date().toISOString() })
            .is('date_sold', null);

        if (updateError) throw updateError;

        console.log(`✅ ${salesWithoutDates.length} sales fixed`);
    } catch (err) {
        console.error('Failed to fix missing sale dates:', err);
    }
}

async function loadLoans() {
    try {
        if (typeof showLoading === 'function') showLoading();
        if (typeof isCancelled !== 'undefined' && isCancelled) return;

        const client = getSB();
        if (!client) throw new Error('Database not available');
        
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
        let query = client.from('loans').select('*').order('created_at', { ascending: false });
        if (currentBusinessId) query = query.eq('business_id', currentBusinessId);
        
        const { data, error } = await query;

        if (error) throw error;
        
        loans = data || [];
        console.log(`💰 Loans loaded: ${loans.length} (business: ${currentBusinessId || 'all'})`);
        
        if (typeof applyLoanFilters === 'function') applyLoanFilters();
        if (typeof updateLoanStats === 'function') updateLoanStats();
        
    } catch (error) {
        console.error('Error loading loans:', error);
        
        const localLoans = JSON.parse(localStorage.getItem('loans') || '[]');
        if (localLoans.length > 0) {
            loans = localLoans;
            if (typeof applyLoanFilters === 'function') applyLoanFilters();
            if (typeof updateLoanStats === 'function') updateLoanStats();
        }
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
    }
}

async function loadExpenses() {
    try {
        const client = getSB();
        if (!client) throw new Error('Database not available');
        
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
        let query = client.from('expenses').select('*').order('date', { ascending: false });
        if (currentBusinessId) query = query.eq('business_id', currentBusinessId);
        
        const { data, error } = await query;

        if (error) throw error;
        expenses = data || [];
        console.log(`💸 Expenses loaded: ${expenses.length} (business: ${currentBusinessId || 'all'})`);
    } catch (e) {
        console.error('Error loading expenses:', e);
        expenses = [];
    }
}

async function loadReminders() {
    try {
        const client = getSB();
        if (!client) throw new Error('Database not available');
        
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
        let query = client.from('reminders').select('*').order('created_at', { ascending: false });
        if (currentBusinessId) query = query.eq('business_id', currentBusinessId);
        
        const { data, error } = await query;

        if (error) throw error;

        const allRemindersData = data || [];
        
        // Filter by user or show all for admin
        if (currentUser && currentUser.username === "admin") {
            allReminders = allRemindersData;
        } else {
            allReminders = allRemindersData.filter(r => 
                r.username === (currentUser ? currentUser.username : 'unknown') ||
                r.created_by === (currentUser ? currentUser.username : 'unknown')
            );
        }
        
        reminders = allReminders.filter(r => r.is_active !== false && r.status !== 'completed');
        
        if (typeof updateReminderDisplay === 'function') updateReminderDisplay();
        if (typeof updateStatistics === 'function') updateStatistics();
        
        console.log(`🔔 Reminders loaded: ${reminders.length} active (business: ${currentBusinessId || 'all'})`);
        
    } catch (e) { 
        console.error('Failed to load reminders:', e); 
    }
}
async function loadData() {
    try {
        const yearToLoad = typeof selectedYear !== 'undefined' ? selectedYear : new Date().getFullYear();

        console.log(`${translate('loading_data_for_year') || '📅 Loading data for year'} ${yearToLoad}...`);
        await cleanupMemory();

        // Load yearly sales and supporting data
        await loadSalesForYear(yearToLoad);
        await loadStockTOSAVE();
        await loadStockHistory();
        await loadLoans();
        await loadExpenses();
        await loadBusinessInfo();
        await loadReminders();

        console.log(`✅ ${translate('all_data_loaded') || 'All data successfully loaded for'} ${yearToLoad}.`);
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showMessageModal(translate('failed_to_load_some_data') || 'Failed to load some data. Please check your connection or server.');
    }
}
function showReminderLoading() {
    document.getElementById('remidepanlloading').classList.remove('hidden');
}

// Hide the loader
function hideReminderLoading() {
    document.getElementById('remidepanlloading').classList.add('hidden');
}
async function loadDataforreminder() {
    showReminderLoading();
    try {
        const yearToLoad = typeof selectedYear !== 'undefined' ? selectedYear : new Date().getFullYear();

        console.log(`${translate('loading_data_for_year') || '📅 Loading data for year'} ${yearToLoad}...`);
        await cleanupMemory();

        // Load yearly sales and supporting data
        await loadSalesForYear(yearToLoad);
        await loadStockTOSAVE();
        await loadStockHistory();
        await loadLoansdata();
        await loadExpenses();
        await loadBusinessInfo();
        await loadReminders();

        console.log(`✅booooooooooo ${translate('all_data_loaded') || 'All data successfully loaded for'} ${yearToLoad}.`);
        hideReminderLoading();
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showMessageModal(translate('failed_to_load_some_data') || 'Failed to load some data. Please check your connection or server.');
    }
}
// ==================== UPDATED FUNCTIONS ====================

async function loadLoansdata() {
    try {
        const client = getSB();
        if (!client) throw new Error('Database not available');
        
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
        let query = client.from('loans').select('*').order('created_at', { ascending: false });
        if (currentBusinessId) query = query.eq('business_id', currentBusinessId);
        
        const { data, error } = await query;

        if (error) throw error;
        
        loans = data || [];
        console.log(translate('loaded_loans'), loans.length);
        
        if (typeof applyLoanFilters === 'function') applyLoanFilters();
        if (typeof updateLoanStats === 'function') updateLoanStats();
        
    } catch (error) {
        console.error(translate('full_error_loading_loans'), error);
        
        if (typeof hideLoading === 'function') hideLoading();
        if (typeof showMessageModal === 'function') showMessageModal(`${translate('error')}: ${error.message}`, 'error');
        
        const localLoans = JSON.parse(localStorage.getItem('loans') || '[]');
        if (localLoans.length > 0) {
            loans = localLoans;
            if (typeof applyLoanFilters === 'function') applyLoanFilters();
            if (typeof updateLoanStats === 'function') updateLoanStats();
            if (typeof showMessageModal === 'function') showMessageModal(translate('using_local_data'), 'warning');
        }
    }
}

async function loadUsers() {
    try {
        const client = getSB();
        if (!client) throw new Error('Database not available');
        
        const { data, error } = await client
            .from('users')
            .select('*')
            .order('username', { ascending: true });

        if (error) throw error;
        
        users = data || [];
        console.log('👥 Users loaded:', users);
    } catch (error) {
        console.error(translations[currentLanguage]?.error_loading_users || 'Error loading users:', error);
        if (typeof showMessageModal === 'function') {
            showMessageModal(translations[currentLanguage]?.load_users_error || 'Failed to load user data.');
        }
        users = [];
    }
}

async function loadUsers21() {
    try {
        const client = getSB();
        if (!client) throw new Error('Database not available');
        
        const { data, error } = await client
            .from('users')
            .select('*');

        if (error) throw error;
        users = data || [];
    } catch (error) {
        console.error(translations[currentLanguage]?.error_loading_users || 'Error loading users:', error);
        users = [];
    }
}

async function loadSalesTargets() {
    try {
        const client = getSB();
        if (!client) throw new Error('Database not available');
        
        const businessId = localStorage.getItem('businessId') || businessInfo?.id || null;
        
        let query = client.from('business_info').select('weekly_target, monthly_target');
        if (businessId) query = query.eq('id', businessId);
        
        const { data, error } = await query.limit(1).maybeSingle();

        if (error) throw error;

        weeklySalesTarget = (data?.weekly_target) || 0;
        monthlySalesTarget = (data?.monthly_target) || 0;
        
        const weeklyInput = document.getElementById('weeklySalesTargetInput');
        const monthlyInput = document.getElementById('monthlySalesTargetInput');
        if (weeklyInput) weeklyInput.value = weeklySalesTarget;
        if (monthlyInput) monthlyInput.value = monthlySalesTarget;

    } catch (err) {
        console.error('Error loading targets:', err);
        weeklySalesTarget = parseFloat(localStorage.getItem('weeklySalesTarget') || '0');
        monthlySalesTarget = parseFloat(localStorage.getItem('monthlySalesTarget') || '0');
    }
}
async function loadTasks() {
    try {
        const client = getSB();
        if (!client) throw new Error('Database not available');
        
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
        let query = client.from('tasks').select('*').order('created_at', { ascending: false });
        if (currentBusinessId) query = query.eq('business_id', currentBusinessId);
        
        const { data, error } = await query;

        if (error) throw error;

        const allTasksData = data || [];
        
        if (currentUser && currentUser.username === "admin") {
            allTasks = allTasksData;
        } else {
            allTasks = allTasksData.filter(task => 
                task.assigned_to === 'all' || 
                task.assigned_to === currentUser?.username ||
                task.created_by === currentUser?.username
            );
        }
        
        window.tasks = allTasks.filter(t => t.status === 'pending' && t.is_active !== false);
        allTasks = allTasksData;
        
        localStorage.setItem('cached_tasks', JSON.stringify(allTasksData));
        
        if (typeof updateTaskDisplay === 'function') updateTaskDisplay();
        if (typeof updateTaskStatistics === 'function') updateTaskStatistics();
        if (typeof renderTasksInReminderPanel === 'function') renderTasksInReminderPanel();
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        
        const cachedTasks = localStorage.getItem('cached_tasks');
        if (cachedTasks) {
            try {
                allTasks = JSON.parse(cachedTasks);
                window.tasks = allTasks.filter(t => t.status === 'pending' && t.is_active !== false);
                if (typeof renderTasksInReminderPanel === 'function') renderTasksInReminderPanel();
            } catch (e) {
                allTasks = [];
                window.tasks = [];
            }
        } else {
            allTasks = [];
            window.tasks = [];
        }
    }
}
// Helper function to normalize receipt data from different sources
function normalizeReceiptData(data) {
    if (data.receiptId && data.items) {
        return data;
    }
    
    if (data.id && (data.productName || data.product_name)) {
        return {
            receiptId: data.id,
            customerName: data.customerName || data.customer_name || '',
            date: data.dateSold || data.date_sold,
            items: [{
                id: data.id,
                name: data.productName || data.product_name,
                type: data.type || 'product',
                quantity: data.quantity || 1,
                price: data.price || data.totalAmount || data.total_amount || 0,
                paymentType: data.paymentType || data.payment_type || 'Cash',
                customerName: data.customerName || data.customer_name
            }],
            total: data.price || data.totalAmount || data.total_amount || 0,
            cashier: data.username,
            paymentType: data.paymentType || data.payment_type,
            source: 'sales'
        };
    }
    
    return data;
}
