
let seenNotifications = new Set();
const NOTIF_STORAGE_KEY = 'notification_seen_status';

// Load seen notifications from localStorage
function loadSeenNotifications() {
    try {
        const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
        if (stored) {
            seenNotifications = new Set(JSON.parse(stored));
        }
    } catch (error) {
        console.error('Error loading seen notifications:', error);
        seenNotifications = new Set();
    }
}

// Save seen notifications to localStorage
function saveSeenNotifications() {
    try {
        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify([...seenNotifications]));
    } catch (error) {
        console.error('Error saving seen notifications:', error);
    }
}

// Update notification status as seen
function markNotificationAsSeen(notificationId) {
    seenNotifications.add(notificationId);
    saveSeenNotifications();
}

// Mark all notifications as seen
function markAllNotificationsAsSeen() {
    notifications.forEach(notification => {
        seenNotifications.add(notification.id);
    });
    saveSeenNotifications();
    updateNotificationCount();
}

// Get unseen notification count
function getUnseenCount() {
    return notifications.filter(n => !seenNotifications.has(n.id)).length;
}

// Update notification badge
function updateNotificationCount() {
    const count = getUnseenCount();
    notifCount.textContent = count;
    notifCount.classList.toggle('hidden', count === 0);
}

// Show loading indicator
// Show loading spinner inside the dropdown
function showNotificationLoading() {
    const loadingEl = document.getElementById('notifLoading');
    const listEl = document.getElementById('notifList');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (listEl) listEl.classList.add('hidden');
}

// Hide loading spinner
function hideNotificationLoading() {
    const loadingEl = document.getElementById('notifLoading');
    const listEl = document.getElementById('notifList');
    if (loadingEl) loadingEl.classList.add('hidden');
    if (listEl) listEl.classList.remove('hidden');
}

// Enhanced loadNotifications function
// Enhanced loadNotifications function
async function loadNotifications(shouldShowSpinner = true) {
    if (shouldShowSpinner && typeof showNotificationLoading === 'function') {
        showNotificationLoading(); 
    }
    
    try {
        const client = getSB();
        if (!client) throw new Error('Database not connected');

        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        let notifications = [];

        // 1. Get unread tasks as notifications (filtered by business)
        let tasksQuery = client
            .from('tasks')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(20);
        if (currentBusinessId) tasksQuery = tasksQuery.eq('business_id', currentBusinessId);
        
        const { data: tasks, error: tasksError } = await tasksQuery;

        if (!tasksError && tasks) {
            tasks.forEach(task => {
                notifications.push({
                    id: task.id,
                    type: 'task',
                    title: task.title,
                    message: task.description || '',
                    date: task.created_at,
                    status: task.status,
                    is_read: false,
                    data: task
                });
            });
        }

        // 2. Get active reminders as notifications (filtered by business)
        let remindersQuery = client
            .from('reminders')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(20);
        if (currentBusinessId) remindersQuery = remindersQuery.eq('business_id', currentBusinessId);
        
        const { data: reminders, error: remindersError } = await remindersQuery;

        if (!remindersError && reminders) {
            reminders.forEach(reminder => {
                notifications.push({
                    id: reminder.id,
                    type: 'reminder',
                    title: reminder.title,
                    message: reminder.message || '',
                    date: reminder.date || reminder.created_at,
                    status: reminder.status,
                    is_read: false,
                    data: reminder
                });
            });
        }

        // 3. Get low stock alerts (filtered by business)
        let stockQuery = client
            .from('stock')
            .select('name, quantity')
            .lt('quantity', 3)
            .eq('has_been_sold', true)
            .limit(10);
        if (currentBusinessId) stockQuery = stockQuery.eq('business_id', currentBusinessId);
        
        const { data: stockItems, error: stockError } = await stockQuery;

        if (!stockError && stockItems) {
            stockItems.forEach(item => {
                notifications.push({
                    id: 'stock-' + item.name,
                    type: 'low_stock',
                    title: 'Low Stock Alert',
                    message: `${item.name} has only ${item.quantity} left in stock`,
                    date: new Date().toISOString(),
                    status: 'alert',
                    is_read: false,
                    data: item
                });
            });
        }

        // Sort by date (newest first)
        notifications.sort((a, b) => new Date(b.date) - new Date(a.date));

        window.notifications = notifications;

        if (typeof loadSeenNotifications === 'function') loadSeenNotifications();
        if (shouldShowSpinner && typeof markAllNotificationsAsSeen === 'function') markAllNotificationsAsSeen();
        if (typeof renderNotifications === 'function') renderNotifications();
        if (typeof updateNotificationCount === 'function') updateNotificationCount();

        console.log(`🔔 Notifications loaded: ${notifications.length} (business: ${currentBusinessId || 'all'})`);

    } catch (error) {
        console.error('Error loading notifications:', error);
        window.notifications = [];
        if (typeof renderNotifications === 'function') renderNotifications();
        
        const notifList = document.getElementById('notifList');
        if (notifList) {
            notifList.innerHTML = `
                <li class="text-red-500 py-4 text-center">
                    ${translate('error_loading_notifications') || 'Error loading notifications.'}
                </li>
            `;
        }
    } finally {
        if (shouldShowSpinner && typeof hideNotificationLoading === 'function') {
            hideNotificationLoading();
        }
    }
}
['notifSearchInput', 'notifTypeFilter', 'notifDateFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderNotifications);
    document.getElementById(id).addEventListener('change', renderNotifications);
});

notifBellBtn.onclick = async () => {
    notifDropdown.classList.toggle('hidden');
    if (!notifDropdown.classList.contains('hidden')) {
        await loadNotifications();
    }
};
notifCloseDropdown.onclick = () => notifDropdown.classList.add('hidden');

// Close when clicking outside
document.addEventListener('click', function(event) {
    const isClickInsideDropdown = notifDropdown.contains(event.target);
    const isClickOnBellBtn = notifBellBtn.contains(event.target);
    
    if (!isClickInsideDropdown && !isClickOnBellBtn && !notifDropdown.classList.contains('hidden')) {
        notifDropdown.classList.add('hidden');
    }
});

// Delete notification
// Delete a single notification
window.deleteNotification = async function(id) {
    try {
        const client = getSB();
        if (!client) {
            console.warn('Database not connected - notification deleted locally only');
            removeNotificationFromUI(id);
            return;
        }

        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;

        // Determine which table the notification came from
        if (id.startsWith('stock-')) {
            // Stock alert - don't delete, just mark as seen
            markNotificationAsSeen(id);
        } else {
            // Try deleting from tasks table (with business safety)
            let taskQuery = client.from('tasks').delete().eq('id', id);
            if (currentBusinessId) taskQuery = taskQuery.eq('business_id', currentBusinessId);
            const { error: taskError } = await taskQuery;

            // If not found in tasks, try reminders (with business safety)
            if (taskError) {
                let reminderQuery = client.from('reminders').delete().eq('id', id);
                if (currentBusinessId) reminderQuery = reminderQuery.eq('business_id', currentBusinessId);
                const { error: reminderError } = await reminderQuery;

                if (reminderError) {
                    console.warn('Could not delete notification:', reminderError);
                }
            }
        }

        // Remove from local array
        if (window.notifications) {
            window.notifications = window.notifications.filter(n => n.id !== id);
        }
        
        if (typeof renderNotifications === 'function') renderNotifications();
        if (typeof updateNotificationCount === 'function') updateNotificationCount();

    } catch (error) {
        console.error('Error deleting notification:', error);
    }
};
// Helper to remove notification from UI only
function removeNotificationFromUI(id) {
    if (window.notifications) {
        window.notifications = window.notifications.filter(n => n.id !== id);
    }
    if (typeof renderNotifications === 'function') renderNotifications();
    if (typeof updateNotificationCount === 'function') updateNotificationCount();
}

// Helper to mark notification as seen (for stock alerts)
function markNotificationAsSeen(id) {
    try {
        const seenKey = 'seen_notifications';
        const seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
        if (!seen.includes(id)) {
            seen.push(id);
            localStorage.setItem(seenKey, JSON.stringify(seen));
        }
    } catch (e) {
        console.warn('Could not mark notification as seen');
    }
}

// Clear all notifications
document.getElementById('clearAllNotifBtn').onclick = async function() {
    if (confirm(translate('confirm_clear_all_notifications') || 'Are you sure you want to clear all notifications?')) {
        if (typeof showNotificationLoading === 'function') showNotificationLoading();
        
        try {
            const client = getSB();
            
            if (client) {
                const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;

                // Delete completed reminders (scoped to business)
                let reminderQuery = client.from('reminders').delete().eq('status', 'completed');
                if (currentBusinessId) reminderQuery = reminderQuery.eq('business_id', currentBusinessId);
                const { error: reminderError } = await reminderQuery;

                if (reminderError) {
                    console.warn('Could not clear reminders:', reminderError);
                }

                // Delete completed tasks (scoped to business)
                let taskQuery = client.from('tasks').delete().eq('status', 'completed');
                if (currentBusinessId) taskQuery = taskQuery.eq('business_id', currentBusinessId);
                const { error: taskError } = await taskQuery;

                if (taskError) {
                    console.warn('Could not clear completed tasks:', taskError);
                }

                console.log('✅ Cleared notifications for business:', currentBusinessId || 'all');
            }

            // Clear local storage
            localStorage.removeItem('seen_notifications');
            
            // Clear global state
            if (window.seenNotifications) window.seenNotifications.clear();
            if (window.notifications) window.notifications = [];
            
            // Reload notifications
            await loadNotifications(false);
            
        } catch (error) {
            console.error('Error clearing notifications:', error);
            showMessageModal(translate('error_clearing_notifications') || 'Error clearing notifications.');
        } finally {
            if (typeof hideNotificationLoading === 'function') hideNotificationLoading();
        }
    }
};
function canUseNotificationAPI() {
    if (window.electronAPI) return false; 
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) return false;
    if (!("Notification" in window)) return false;
    if (typeof Notification !== "function") return false;
    
    return true;
}

function showSystemNotification(title, body, options = {}) {
    const defaultOptions = {
        icon: '/image/logo.jpg',
        timeout: 5000, // Auto-close after 5 seconds
        type: 'info', // info, success, warning, error
        actions: [], // Optional action buttons
        silent: false,
        ...options
    };

    // 1. Try Electron API first
    if (window.electronAPI && typeof window.electronAPI.notify === 'function') {
        window.electronAPI.notify(title, { 
            body: body, 
            icon: defaultOptions.icon,
            silent: defaultOptions.silent
        });
        


    }

    // 2. Try Browser Notification API
    if (canUseNotificationAPI()) {
        requestNotificationPermission().then(permission => {
            if (permission === 'granted') {
                const notification = new Notification(title, {
                    body: body,
                    icon: defaultOptions.icon,
                    silent: defaultOptions.silent
                });
                
                // Auto-close
                if (defaultOptions.timeout) {
                    setTimeout(() => notification.close(), defaultOptions.timeout);
                }
                
                // Handle click
                notification.onclick = function() {
                    window.focus();
                    this.close();
                    if (options.onClick) options.onClick();
                };
            } else {
            
            }
        });
    } else {

    }
}

// Request permission
function requestNotificationPermission() {
    return new Promise((resolve) => {
        if (!('Notification' in window)) {
            resolve('unsupported');
            return;
        }
        
        if (Notification.permission === 'granted') {
            resolve('granted');
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                resolve(permission);
            });
        } else {
            resolve('denied');
        }
    });
}

async function renderNotifications() {
    if (typeof loadDatafornotifcation === 'function') {
        await loadDatafornotifcation();
    }
    
    // Helper to fix image paths - Supabase URLs are already full URLs
    const fixPath = (path) => {
        if (!path) return 'image/placeholder.png';
        // If it's already a full URL (Supabase Storage), use as-is
        if (path.startsWith('http')) return path;
        // If it starts with 'image/', it's a local asset
        if (path.startsWith('image/')) return path;
        // If it's a relative path without prefix, return as-is (may not work on web)
        return path;
    };

    const notifList = document.getElementById('notifList');
    if (!notifList) return;
    
    notifList.innerHTML = '';
    
    if (!window.notifications || window.notifications.length === 0) {
        notifList.innerHTML = `<li class="text-gray-500 py-4 text-center">${translate('no_notifications_yet') || 'No notifications yet.'}</li>`;
        return;
    }

    const filtered = typeof filterNotifications === 'function' ? filterNotifications() : window.notifications;

    if (filtered.length === 0) {
        notifList.innerHTML = `<li class="text-gray-500 py-4 text-center">${translate('no_matching_notifications') || 'No matching notifications.'}</li>`;
        return;
    }

    filtered.forEach(n => {
        const isLowStock = n.type === 'low_stock' || n.type === 'low-stock';
        const isSale = n.type === 'sale';
        const isTask = n.type === 'task';
        const isReminder = n.type === 'reminder';
        const isSeen = window.seenNotifications && window.seenNotifications.has(n.id);
        
        const li = document.createElement('li');
        li.className = `notification-item py-3 px-2 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${!isSeen ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`;
        li.setAttribute('data-notification-id', n.id);
        li.setAttribute('data-notification-type', n.type);
        li.setAttribute('data-notification-seen', String(isSeen));

        // Store relevant data
        if (n.data) {
            li.setAttribute('data-item-data', JSON.stringify(n.data));
        }
        if (n.productName || n.product_name) {
            li.setAttribute('data-product-name', n.productName || n.product_name);
        }

        // Unseen indicator
        const unseenIndicator = !isSeen ? `
            <div class="absolute top-2 right-2">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
        ` : '';

        // Image HTML
        let imgHtml = '';
        const itemImageUrl = n.data?.imageUrl || n.data?.image_url || n.data?.logo_url || n.productImage;

        if (isLowStock) {
            const lowStockImg = itemImageUrl ? fixPath(itemImageUrl) : "image/out of stock.png";
            imgHtml = `<img src="${lowStockImg}" alt="Low Stock" class="w-12 h-12 rounded-lg object-cover mr-3 border border-gray-200" />`;
        } else if (isSale) {
            const saleImg = itemImageUrl ? fixPath(itemImageUrl) : "image/out of stock.png";
            imgHtml = `<img src="${saleImg}" alt="Sale" class="w-12 h-12 rounded-lg object-cover mr-3 border border-gray-200" />`;
        } else if (isTask) {
            imgHtml = `<div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                <span class="text-purple-600 font-bold">📋</span>
            </div>`;
        } else if (isReminder) {
            imgHtml = `<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <span class="text-blue-600 font-bold">🔔</span>
            </div>`;
        } else {
            imgHtml = `<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                <span class="text-gray-600 font-bold">${n.title ? n.title[0].toUpperCase() : '?'}</span>
            </div>`;
        }

        // Quantity badge for low stock
        let quantityBadge = '';
        if (isLowStock && n.data?.quantity !== undefined) {
            const qty = n.data.quantity;
            quantityBadge = `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${qty === 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'} ml-2">
                ${qty} ${qty === 0 ? (translate('out_of_stock') || 'out of stock') : (translate('left') || 'left')}
            </span>`;
        }

        // Time ago
        const timeAgo = typeof getTimeAgo === 'function' ? getTimeAgo(n.date) : n.date;
        const timeAgoHtml = `<span class="text-xs text-gray-500 ml-2" title="${n.date}">${timeAgo}</span>`;

        li.innerHTML = `
            <div class="flex items-start relative">
                ${unseenIndicator}
                <div class="flex-shrink-0">${imgHtml}</div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center">
                        <div class="font-semibold ${isLowStock ? 'text-red-600' : isSale ? 'text-green-600' : 'text-gray-800'} truncate">
                            ${n.title || n.message || ''}
                            ${timeAgoHtml}
                        </div>
                        ${quantityBadge}
                    </div>
                    <div class="mt-1 text-xs text-gray-500">
                        ${n.message || ''}
                    </div>
                </div>
                <button class="delete-notif-btn text-gray-400 hover:text-red-500 ml-2 p-1 rounded-full hover:bg-gray-100" 
                        onclick="event.stopPropagation(); window.deleteNotification('${n.id}')"
                        title="${translate('delete_notification') || 'Delete'}">
                    &times;
                </button>
            </div>
        `;
        notifList.appendChild(li);
    });

    if (typeof updateNotificationCount === 'function') updateNotificationCount();
    if (typeof addNotificationClickHandlers === 'function') addNotificationClickHandlers();
}
async function loadDatafornotifcation() {
     showNotificationLoading(); 
    try {
        const yearToLoad = typeof selectedYear !== 'undefined' ? selectedYear : new Date().getFullYear();

        

        console.log(`${translate('loading_data_for_year') || '📅 Loading data for year'} ${yearToLoad}...`);
        await cleanupMemory();

        // Load yearly sales and supporting data
        await loadSalesForYear(yearToLoad);
        await loadStockTOSAVE();
        await loadStockHistory();

        console.log(`✅ ${translate('all_data_loaded') || 'All data successfully loaded for'} ${yearToLoad}.`);
         hideNotificationLoading();
    } catch (error) {
        console.error('❌ Error loading data:', error);
         hideNotificationLoading();
        showMessageModal(translate('failed_to_load_some_data') || 'Failed to load some data. Please check your connection or server.');
    }
}

// Helper function to get relative time
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return translate('just_now') || 'just now';
    if (diffMin < 60) return `${diffMin} ${translate('minutes_ago') || 'min ago'}`;
    if (diffHour < 24) return `${diffHour} ${translate('hours_ago') || 'hr ago'}`;
    if (diffDay < 7) return `${diffDay} ${translate('days_ago') || 'days ago'}`;
    return date.toLocaleDateString();
}
function filterNotifications() {
    const search = document.getElementById('notifSearchInput').value.toLowerCase();
    const typeFilter = document.getElementById('notifTypeFilter').value;
    const dateFilter = document.getElementById('notifDateFilter').value;

    const now = new Date();

    // Date boundaries
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return notifications.filter(n => {
        /* 🔍 SEARCH */
        const searchMatch =
            !search ||
            n.message?.toLowerCase().includes(search) ||
            n.productName?.toLowerCase().includes(search) ||
            n.user?.toLowerCase().includes(search);

        /* 🧩 TYPE */
        const typeMatch =
            typeFilter === 'all' || n.type === typeFilter;

        /* 📅 DATE */
        let dateMatch = true;

        if (dateFilter !== 'all') {
            if (!n.date) return false;

            const notifTime = Date.parse(n.date);
            if (isNaN(notifTime)) return false;

            const notifDate = new Date(notifTime);

            if (dateFilter === 'today') {
                dateMatch =
                    notifDate >= todayStart &&
                    notifDate <= now;
            } 
            else if (dateFilter === '7days') {
                dateMatch =
                    notifDate >= sevenDaysAgo &&
                    notifDate <= now;
            }
        }
        return searchMatch && typeMatch && dateMatch;
    });
}

async function addNotificationClickHandlers() {
    const notificationItems = document.querySelectorAll('.notification-item');
    
    notificationItems.forEach(item => {
        item.addEventListener('click', async function(e) {
            // Don't trigger if user clicked the delete button
            if (e.target.classList.contains('delete-notif-btn') || 
                e.target.closest('.delete-notif-btn')) {
                return;
            }
            
            const notificationId = this.getAttribute('data-notification-id');
            const type = this.getAttribute('data-notification-type');
            const saleDataStr = this.getAttribute('data-sale-data');
            const itemDataStr = this.getAttribute('data-item-data');
            const productName = this.getAttribute('data-product-name');
            const saleId = this.getAttribute('data-sale-id');
            
            // Mark as seen when clicked
            if (notificationId) {
                markNotificationAsSeen(notificationId);
                this.setAttribute('data-notification-seen', 'true');
                this.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-500');
            }
            
            // Close dropdown first
            const notifDropdown = document.getElementById('notifDropdown');
            if (notifDropdown) {
                notifDropdown.classList.add('hidden');
            }
            
            try {
                if (type === 'sale' && saleDataStr) {
                    // We have the complete sale data in the notification!
                    const saleData = JSON.parse(saleDataStr);
                    
                    // Directly show the receipt from the sale data
                    if (saleData && saleData.id) {
                        showReceiptFromHistory(saleData);
                    } else {
                        // Fallback: try to find the sale by ID
                        const foundSale = await findSaleById(saleId);
                        if (foundSale) {
                            showReceiptFromHistory(foundSale);
                        } else {
                            // Try to find by product name
                            const productSale = await findSaleByProductName(productName);
                            if (productSale) {
                                showReceiptFromHistory(productSale);
                            } else {
                                // Last resort: show the stock item
                                if (itemDataStr) {
                                    const itemData = JSON.parse(itemDataStr);
                                    showItemDetailsModal(itemData);
                                } else {
                                    showMessageModal(translate('sale_details_not_available') || 'Sale details not available.');
                                }
                            }
                        }
                    }
                    
                } else if (type === 'low-stock' && productName) {
                    // Handle low stock notification
                    await handleLowStockClick(productName, itemDataStr);
                    
                } else if (itemDataStr) {
                    // Generic notification with item data
                    const itemData = JSON.parse(itemDataStr);
                    if (itemData.type === 'service' || itemData.type === 'product') {
                        showItemDetailsModal(itemData);
                    } else {
                        showMessageModal(translate('cannot_display_this_item') || 'Cannot display this item.');
                    }
                }
                
            } catch (error) {
                console.error('Error handling notification click:', error);
                showMessageModal(translate('error_loading_notification_details') || 'Error loading notification details. Please try again.');
            }
        });
    });
}

// Helper function to find sale in history
async function findSaleById(saleId) {
    if (!saleId) return null;
    
    try {
        // First check in local sales array if available
        if (typeof sales !== 'undefined' && Array.isArray(sales)) {
            const localSale = sales.find(s => String(s.id) === String(saleId));
            if (localSale) return localSale;
        }
        
        // If not found locally, query Supabase (with business safety)
        const client = getSB();
        if (!client) return null;

        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;

        let query = client.from('sales').select('*').eq('id', saleId);
        if (currentBusinessId) query = query.eq('business_id', currentBusinessId);

        const { data, error } = await query.maybeSingle();

        if (error) {
            console.warn('Sale lookup error:', error.message);
            return null;
        }

        return data || null;

    } catch (error) {
        console.error('Error finding sale by ID:', error);
        return null;
    }
}
function resolveProductImage(img) {
    if (!img || img === 'null' || img === 'undefined') {
        return 'image/out of stock.png';
    }
    return img;
}

function enqueueNotification(handler, payload) {
    notificationQueue.push({ handler, payload });
    processNotificationQueue();
}

function processNotificationQueue() {
    if (notificationActive || notificationQueue.length === 0) return;

    notificationActive = true;
    const { handler, payload } = notificationQueue.shift();

    handler(payload, () => {
        notificationActive = false;
        processNotificationQueue();
    });
}

function showSaleNotificationBar(sale, user, done) {
    const bar = document.getElementById('saleNotificationBar');
    const notifSound = document.getElementById('saleNotifSound');

    if (notifSound) {
        notifSound.currentTime = 0;
        notifSound.play().catch(() => {}); // Ignore autoplay errors
    }

    // Helper to fix image paths - Supabase URLs are already full URLs
    const fixPath = (path) => {
        if (!path) return 'image/logo.jpg';
        // If it's already a full URL (Supabase Storage), use as-is
        if (path.startsWith('http')) return path;
        // If it's a local asset path, use as-is
        if (path.startsWith('image/')) return path;
        // Fallback
        return 'image/logo.jpg';
    };

    // Choose the best image
    let imgToUse = 'image/logo.jpg'; // Default fallback
    
    if (sale.itemData?.imageUrl || sale.itemData?.image_url) {
        imgToUse = fixPath(sale.itemData.imageUrl || sale.itemData.image_url);
    } else if (sale.imageUrl || sale.image_url) {
        imgToUse = fixPath(sale.imageUrl || sale.image_url);
    } else if (user?.photo || user?.photo_url) {
        imgToUse = fixPath(user.photo || user.photo_url);
    }

    // Apply the image
    const photoEl = document.getElementById('notifUserPhoto');
    if (photoEl) {
        photoEl.src = imgToUse;
        photoEl.onerror = function() {
            this.src = 'image/out of stock.png';
            this.onerror = null; 
        };
    }

    // Set notification text
    const userNameEl = document.getElementById('notifUserName');
    if (userNameEl) {
        userNameEl.textContent = user?.username || user?.full_name || translate('sales_associate') || 'Sales Associate';
    }

    const saleDateEl = document.getElementById('notifSaleDate');
    if (saleDateEl) {
        const saleDate = sale.dateSold || sale.date_sold || sale.timestamp || sale.created_at || new Date().toLocaleString();
        saleDateEl.textContent = `${translate('sold_on') || 'Sold on:'} ${saleDate}`;
    }

    const saleProductEl = document.getElementById('notifSaleProduct');
    if (saleProductEl) {
        const productName = sale.productName || sale.product_name || 'Unknown';
        const quantity = sale.quantity || 1;
        const price = sale.price || sale.total_amount || 0;
        saleProductEl.textContent = `${translate('product') || 'Product:'} ${productName} | ${translate('quantity') || 'Qty:'} ${quantity} | ${translate('price') || 'Price:'} ${typeof formatCurrency === 'function' ? formatCurrency(price) : price}`;
    }

    // Show the bar
    bar.classList.add('show');

    let timeout = setTimeout(close, 7000);

    function close() {
        bar.classList.remove('show');
        clearTimeout(timeout);
        if (done) done();
    }

    bar.onclick = () => {
        if (typeof showReceiptFromHistory === 'function') {
            showReceiptFromHistory(sale);
        }
        close();
    };

    bar.onmouseenter = () => clearTimeout(timeout);
    bar.onmouseleave = () => timeout = setTimeout(close, 3000);
}
function showTaskNotificationBar(task) {
    const bar = document.getElementById('saleNotificationBar');
    const notifSound = document.getElementById('saleNotifSound');
    if (notifSound) notifSound.play();

    document.getElementById('notifUserPhoto').src = 'image/user mangement.png';
    document.getElementById('notifUserName').textContent = task.assignedTo === 'all' ? translate('announcement') || 'Announcement' : (task.assignedTo || translate('task') || 'Task');
    document.getElementById('notifSaleDate').textContent = `${translate('due') || 'Due:'} ${task.dueDate || translate('no_due_date') || 'No due date'}`;
    document.getElementById('notifSaleProduct').textContent = `${translate('task') || 'Task:'} ${task.title}${task.description ? ' - ' + task.description : ''}`;

    bar.style.cursor = 'pointer';
    bar.onclick = () => {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            if (!modal.classList.contains('hidden')) modal.classList.add('hidden');
        });
        const panel = document.getElementById('reminderListPanel');
        if (panel) {
            panel.classList.remove('hidden');
        }
    };

    bar.classList.add('show');
    if (window.notificationTimeout) clearTimeout(window.notificationTimeout);
    window.notificationTimeout = setTimeout(() => bar.classList.remove('show'), 7000);

    bar.addEventListener('mouseenter', () => clearTimeout(window.notificationTimeout));
    bar.addEventListener('mouseleave', () => {
        window.notificationTimeout = setTimeout(() => bar.classList.remove('show'), 7000);
    });
}

function showLowStockNotificationBar(notification, done) {
    const bar = document.getElementById('saleNotificationBar');
    const sound = document.getElementById('lowStockSound');

    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {}); // Ignore autoplay errors
    }

    // Helper to fix image paths - Supabase URLs are already full URLs
    const fixPath = (path) => {
        if (!path) return 'image/out of stock.png';
        // If it's already a full URL (Supabase Storage), use as-is
        if (path.startsWith('http')) return path;
        // If it's a local asset path, use as-is
        if (path.startsWith('image/')) return path;
        // Fallback
        return 'image/out of stock.png';
    };

    // Choose the best image - check both camelCase and snake_case
    const itemImageUrl = notification.itemData?.imageUrl || 
                         notification.itemData?.image_url ||
                         notification.imageUrl ||
                         notification.image_url;

    const realImg = itemImageUrl ? fixPath(itemImageUrl) : "image/out of stock.png";

    // Set notification content
    const photoEl = document.getElementById('notifUserPhoto');
    if (photoEl) {
        photoEl.src = realImg;
        photoEl.onerror = function() {
            this.src = 'image/out of stock.png';
            this.onerror = null;
        };
    }

    const userNameEl = document.getElementById('notifUserName');
    if (userNameEl) {
        userNameEl.textContent = translate('stock_alert') || '⚠️ Stock Alert';
    }

    const saleDateEl = document.getElementById('notifSaleDate');
    if (saleDateEl) {
        saleDateEl.textContent = notification.date || new Date().toLocaleString();
    }

    const saleProductEl = document.getElementById('notifSaleProduct');
    if (saleProductEl) {
        saleProductEl.textContent = notification.message || notification.title || 'Low stock warning';
    }

    // Show the bar
    bar.classList.add('show');

    let timeout = setTimeout(close, 9000);

    function close() {
        bar.classList.remove('show');
        clearTimeout(timeout);
        if (done) done();
    }

    // Click to close (or navigate to stock)
    bar.onclick = () => {
        // If we have item data, show stock management
        if (notification.itemData && typeof showStockManagement === 'function') {
            showStockManagement();
        }
        close();
    };
    
    bar.onmouseenter = () => clearTimeout(timeout);
    bar.onmouseleave = () => timeout = setTimeout(close, 4000);
}

function showNotificationOnWindow({ title, message }) {
    const notificationBar = document.getElementById('saleNotificationBar');
    if (notificationBar) {
        notificationBar.querySelector('#notifUserName').textContent = title;
        notificationBar.querySelector('#notifSaleProduct').textContent = message;
        notificationBar.classList.add('show');
        setTimeout(() => {
            notificationBar.classList.remove('show');
        }, 7000);
    }
}

document.getElementById('closeNotificationBtn')?.addEventListener('click', function() {
    const bar = document.getElementById('saleNotificationBar');
    if (bar) {
        bar.classList.remove('show');
    }
});

async function handleLowStockClick(productName, itemDataStr) {
    try {
        let item = stock.find(i => i.name.toLowerCase().includes(productName.toLowerCase()));
        if (!item && itemDataStr) {
            try {
                const itemData = JSON.parse(itemDataStr);
                if (itemData.id) {
                    item = stock.find(i => i.id === itemData.id);
                }
                if (!item && itemData.name) {
                    item = itemData;
                }
            } catch (e) {
                console.error('Failed to parse item data:', e);
            }
        }
        
        if (!item) {
            item = stock.find(i => 
                i.name && i.name.toLowerCase() === productName.toLowerCase()
            );
        }
        
        if (item) {
            showItemDetailsModal(item);
           showLoading();
        } else {
            const searchPrompt = translate('item_not_found_search') || `Item "${productName}" not found in current stock. Would you like to search for it?`;
            const confirmSearch = confirm(searchPrompt);
            if (confirmSearch) {
                searchItems.value = productName;
                stockTypeFilter.value = 'low-stock';
                renderStock();
                showCurrentStockSection();
            }
        }
    } catch (error) {
        console.error('Error handling low stock click:', error);
       hideLoading();
        showMessageModal(translate('error_loading_low_stock_item') || 'Error loading low stock item details.');
    }
}