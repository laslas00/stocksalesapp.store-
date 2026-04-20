
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
    if (shouldShowSpinner) {
        // Now it correctly calls the global function instead of the boolean parameter
        showNotificationLoading(); 
    }
    
    try {
        const res = await fetch(`${API_BASE}/api/notifications`);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        notifications = await res.json();
        
        // Load seen status from localStorage
        loadSeenNotifications();
        
        if (shouldShowSpinner) {
            markAllNotificationsAsSeen();
        }
        
        renderNotifications();
        updateNotificationCount();
    } catch (error) {
        console.error('Error loading notifications:', error);
        notifications = [];
        renderNotifications();
        
        // Show error in UI
        notifList.innerHTML = `
            <li class="text-red-500 py-4 text-center">
                ${translate('error_loading_notifications') || 'Error loading notifications. Please try again.'}
            </li>
        `;
    } finally {
        if (shouldShowSpinner) {
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
window.deleteNotification = async function(id) {
    await fetch(`${API_BASE}/api/notifications/${id}`, { method: 'DELETE' });
    await loadNotifications();
};

document.getElementById('clearAllNotifBtn').onclick = async function() {
    if (confirm(translate('confirm_clear_all_notifications') || 'Are you sure you want to clear all notifications?')) {
        showNotificationLoading();
        try {
            await fetch(`${API_BASE}/api/notifications`, { method: 'DELETE' });
            // Clear local storage as well
            localStorage.removeItem(NOTIF_STORAGE_KEY);
            seenNotifications.clear();
            await loadNotifications(false);
        } catch (error) {
            console.error('Error clearing notifications:', error);
            showMessageModal(translate('error_clearing_notifications') || 'Error clearing notifications.');
        } finally {
            hideNotificationLoading();
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
                // Fallback to in-app notification
                showMessageModal(body || title);
            }
        });
    } else {
        // Fallback to in-app notification
       showMessageModal(body || title);
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
    await loadDatafornotifcation();
    const fixPath = (path) => {
        if (!path || path.startsWith('http') || path.startsWith('image/')) return path;
        return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
    };
    notifList.innerHTML = '';
    
    if (notifications.length === 0) {
        notifList.innerHTML = `<li class="text-gray-500 py-4 text-center">${translate('no_notifications_yet') || 'No notifications yet.'}</li>`;
    } else {
        const filtered = filterNotifications();

        if (filtered.length === 0) {
            notifList.innerHTML = `<li class="text-gray-500 py-4 text-center">${translate('no_matching_notifications') || 'No matching notifications.'}</li>`;
            return;
        }

        filtered.forEach(n => {
            const isLowStock = n.type === 'low-stock';
            const isSale = n.type === 'sale';
            const isSeen = seenNotifications.has(n.id);
            
            const li = document.createElement('li');
            li.className = `notification-item py-3 px-2 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${!isSeen ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`;
            li.setAttribute('data-notification-id', n.id);
            li.setAttribute('data-notification-type', n.type);
            li.setAttribute('data-notification-seen', isSeen);
            
            // Store all relevant data for click handling
            if (n.itemData) {
                li.setAttribute('data-item-data', JSON.stringify(n.itemData));
            }
            if (n.saleData) {
                li.setAttribute('data-sale-data', JSON.stringify(n.saleData));
            }
            if (n.productName) {
                li.setAttribute('data-product-name', n.productName);
            }
            // Store sale ID from saleData
            if (n.saleData && n.saleData.id) {
                li.setAttribute('data-sale-id', n.saleData.id);
            }
            if (n.stockQuantity !== undefined) {
                li.setAttribute('data-stock-quantity', n.stockQuantity);
            }

            // Add unseen indicator dot
            let unseenIndicator = '';
            if (!isSeen) {
                unseenIndicator = `
                    <div class="absolute top-2 right-2">
                        <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                `;
            }

             let imgHtml = '';
            
            // Check if we have real item data with a custom image
            const actualImageUrl = n.itemData && n.itemData.imageUrl ? n.itemData.imageUrl : n.productImage;

            if (isLowStock) {
                // If there is a real image in itemData, use it. Otherwise, use the fallback "out of stock" icon.
                const lowStockImg = (n.itemData && n.itemData.imageUrl) ? fixPath(n.itemData.imageUrl) : "image/out of stock.png";
                imgHtml = `<img src="${lowStockImg}" alt="${n.productName || 'Low Stock'}" class="w-12 h-12 rounded-lg object-cover mr-3 border border-gray-200" />`;
            } else if (isSale) {
                // For sales, always try to get the product image from itemData
                const saleImg = (n.itemData && n.itemData.imageUrl) ? fixPath(n.itemData.imageUrl) : "image/out of stock.png";
                imgHtml = `<img src="${saleImg}" alt="${n.productName || 'Sale'}" class="w-12 h-12 rounded-lg object-cover mr-3 border border-gray-200" />`;
            } else if (n.userImage) {
                imgHtml = `<img src="${fixPath(n.userImage)}" alt="${n.user}" class="w-10 h-10 rounded-full mr-3" />`;
            } else {
                imgHtml = `<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                    <span class="text-gray-600 font-bold">${n.user ? n.user[0].toUpperCase() : '?'}</span>
                </div>`;
            }

            // Add quantity badge for low stock notifications
            let quantityBadge = '';
            if (isLowStock && n.stockQuantity !== undefined) {
                const quantityText = n.stockQuantity === 0 ? 
                    translate('out_of_stock') || 'out of stock' : 
                    translate('left') || 'left';
                quantityBadge = `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${n.stockQuantity === 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'} ml-2">
                    ${n.stockQuantity} ${quantityText}
                </span>`;
            }
            
            // Add sale ID badge for sale notifications
            let saleIdBadge = '';
            if (isSale && n.saleData && n.saleData.id) {
                // Shorten the ID for display
                const shortId = n.saleData.id.replace('sale-', '').substring(0, 6);
                saleIdBadge = `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 ml-2" title="${translate('sale_id') || 'Sale ID'}: ${n.saleData.id}">
                    #${shortId}...
                </span>`;
            }

            // Add timestamp relative display
            const timeAgo = getTimeAgo(n.date);
            const timeAgoHtml = `<span class="text-xs text-gray-500 ml-2" title="${n.date}">${timeAgo}</span>`;

            li.innerHTML = `
                <div class="flex items-start relative">
                    ${unseenIndicator}
                    <div class="flex-shrink-0">
                        ${imgHtml}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center">
                            <div class="font-semibold ${isLowStock ? 'text-red-600' : 'text-green-600'} truncate">
                                ${n.message}
                                ${timeAgoHtml}
                            </div>
                            ${quantityBadge}
                            ${saleIdBadge}
                        </div>
                        <div class="mt-1 text-xs text-gray-500">
                            ${n.date}
                            ${n.user ? `<span class="ml-2">${translate('by') || 'By:'} ${n.user}</span>` : ''}
                        </div>
                        ${isSale && n.saleData ? 
                            `<div class="mt-1">
                                <span class="text-sm text-gray-700">
                                    <span class="font-medium">${translate('amount') || 'Amount'}:</span> ${formatCurrency(n.saleData.price || n.saleData.totalAmount || 0)}
                                </span>
                                <span class="mx-2 text-gray-400">•</span>
                                <span class="text-sm text-gray-700">
                                    <span class="font-medium">${translate('payment') || 'Payment'}:</span> ${n.saleData.paymentType || translate('cash') || 'Cash'}
                                </span>
                            </div>` : ''}
                    </div>
                    <button class="delete-notif-btn text-gray-400 hover:text-red-500 ml-2 p-1 rounded-full hover:bg-gray-100" 
                            onclick="event.stopPropagation(); deleteNotification(${n.id})"
                            title="${translate('delete_notification') || 'Delete notification'}">
                        &times;
                    </button>
                </div>
            `;
            notifList.appendChild(li);
        });
    }
    
    updateNotificationCount();
    
    // Add click handlers AFTER all notifications are rendered
    addNotificationClickHandlers();
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
            const localSale = sales.find(s => s.id === saleId);
            if (localSale) return localSale;
        }
        
        // If not found locally, try API
        const response = await fetch(`${API_BASE}/api/sales/${encodeURIComponent(saleId)}`);
        if (response.ok) {
            return await response.json();
        }
        
        return null;
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
        notifSound.play();
    }
const fixPath = (path) => {
        if (!path || path.startsWith('http') || path.startsWith('image/')) return path;
        
        // Check if API_BASE exists, if not, use a hardcoded fallback for debugging
        const base = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE : 'https://localhost:54221'; 
        
        return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    // 2. Logic to choose the best image
    let imgToUse;
    if (sale.itemData && sale.itemData.imageUrl) {
        imgToUse = fixPath(sale.itemData.imageUrl);
    } else if (user && user.photo) {
        imgToUse = fixPath(user.photo);
    } else {
        imgToUse = 'image/logo.jpg'; // Final fallback if everything else fails
    }

    // 3. Apply the image
    const photoEl = document.getElementById('notifUserPhoto');
    if (photoEl) {
        photoEl.src = imgToUse;
        
        // Emergency fix: If it still fails, show a fallback image instead of a broken icon
        photoEl.onerror = function() {
            this.src = 'image/out of stock.png';
            this.onerror = null; 
        };
    }

    document.getElementById('notifUserName').textContent =
        user?.username || translate('sales_associate') || 'Sales Associate';

    document.getElementById('notifSaleDate').textContent =
        `${translate('sold_on') || 'Sold on:'} ${sale.dateSold || sale.timestamp || new Date().toLocaleString()}`;

    document.getElementById('notifSaleProduct').textContent =
        `${translate('product') || 'Product:'} ${sale.productName} | ${translate('quantity') || 'Qty:'} ${sale.quantity} | ${translate('price') || 'Price:'} ${formatCurrency(sale.price)}`;

    bar.classList.add('show');

    let timeout = setTimeout(close, 7000);

    function close() {
        bar.classList.remove('show');
        clearTimeout(timeout);
        done && done();
    }

    bar.onclick = () => {
        showReceiptFromHistory(sale);
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
            setTimeout(() => panel.classList.remove('-translate-x-full'), 10);
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
        sound.play();
    }
    const fixPath = (path) => {
        if (!path || path.startsWith('http') || path.startsWith('image/')) return path;
        return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
    };
const realImg = (notification.itemData && notification.itemData.imageUrl) 
        ? fixPath(notification.itemData.imageUrl) 
        : "image/out of stock.png";

    document.getElementById('notifUserPhoto').src = realImg;
    document.getElementById('notifUserName').textContent = translate('stock_alert') || 'Stock Alert';

    document.getElementById('notifSaleDate').textContent =
        notification.date || new Date().toLocaleString();

    document.getElementById('notifSaleProduct').textContent =
        notification.message;

    bar.classList.add('show');

    let timeout = setTimeout(close, 9000);

    function close() {
        bar.classList.remove('show');
        clearTimeout(timeout);
        done && done();
    }

    bar.onclick = close;
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