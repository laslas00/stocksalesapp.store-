const API_BASE = (() => {
    if (window.location.protocol === 'file:') {
        return 'https://localhost:54221';
    }
    if (window.location.port === '9999') {
        return window.location.origin;
    }
    return `${window.location.protocol}//${window.location.hostname}:54221`;
})();

console.log("📡 App connecting to API via:", API_BASE);
if (typeof reconnectAttempts === 'undefined') {
    window.reconnectAttempts = 0;
}

function connectWebSocket() {
    const isFileProtocol = window.location.protocol === 'file:';
    
    // 1. Determine the correct Port
    // If the window loaded on 9999 (the bridge), we MUST use 9999 for the WebSocket.
    let wsPort = window.location.port;
    if (!wsPort || wsPort === "") {
        wsPort = isFileProtocol ? '54221' : '9999'; 
    }

    // 2. Determine Host and Protocol
    const wsHost = isFileProtocol ? 'localhost' : window.location.hostname;
    
    // Always use 'wss' for HTTPS/Bridge connections to avoid Mixed Content errors
    const wsProtocol = (window.location.protocol === 'https:' || window.location.protocol === 'app:' || isFileProtocol) ? 'wss' : 'ws';

    try {
        const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}`;
        console.log(`🔌 Attempting WebSocket connection: ${wsUrl}`);
        
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            reconnectAttempts = 0; // Reset attempts on successful connection
            
            if (typeof currentUser !== 'undefined' && currentUser && currentUser.username) {
                ws.send(JSON.stringify({ type: 'identify', username: currentUser.username }));
            }
            
            const successMsg = typeof translate === 'function' ? translate('websocket_connected') : null;
            console.log(successMsg || `✅ WebSocket connected via ${wsUrl}`);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'new-sale' && data.sale) {
                const saleUser = (typeof users !== 'undefined' ? users.find(u => u.username === data.sale.username) : null) || currentUser;
                
                if (typeof loadSalesForYear === 'function') {
                    loadSalesForYear(new Date().getFullYear()).then(renderSales);
                }
                
                if (typeof enqueueNotification === 'function') {
                    enqueueNotification(
                        (payload, done) => showSaleNotificationBar(payload.sale, payload.user, done),
                        { sale: data.sale, user: saleUser }
                    );
                }
            }

            else if (data.type === 'low-stock' && data.notification) {
                if (typeof enqueueNotification === 'function') {
                    enqueueNotification(
                        showLowStockNotificationBar,
                        data.notification
                    );
                }
            }
            
            // New Task Notification (for all users)
            else if ((data.type === 'new-task' || data.type === 'task-updated') && data.task) {
                if (typeof showTaskNotificationBar === 'function') showTaskNotificationBar(data.task);
                if (typeof loadTasks === 'function') loadTasks();
            }

            else if (data.type === 'system-announcement' && data.event === 'manager-promoted') {
                if (typeof showNotificationOnWindow === 'function') {
                    showNotificationOnWindow({
                        title: typeof translate === 'function' ? translate('promotion') : 'Promotion',
                        message: data.message
                    });
                }
                if (typeof showPromotionEnvelope === 'function') showPromotionEnvelope(data.username);
            }

            else if (data.type === 'system-announcement' && data.event === 'manager-demoted') {
                if (typeof showNotificationOnWindow === 'function') {
                    showNotificationOnWindow({
                        title: typeof translate === 'function' ? translate('demotion') : 'Demotion',
                        message: data.message
                    });
                }
            }
        };

        ws.onclose = () => {
            if (reconnectAttempts < 6) {
                console.log(`🔄 WebSocket closed. Retrying (${reconnectAttempts + 1}/6)...`);
                setTimeout(connectWebSocket, 5000);
                reconnectAttempts++;
            } else {
                const limitMsg = typeof translate === 'function' ? translate('websocket_reconnect_limit') : null;
                console.warn(limitMsg || '❌ WebSocket reconnect limit reached.');
            }
        };

        ws.onerror = (err) => {
            const errMsg = typeof translate === 'function' ? translate('websocket_error') : null;
            console.error(errMsg || '❌ WebSocket error occurred');
            ws.close(); // Force close to trigger the onclose reconnect logic
        };
        
    } catch (err) {
        const initMsg = typeof translate === 'function' ? translate('websocket_init_failed') : null;
        console.error(initMsg || '🚨 Failed to initialize WebSocket:', err);
    }
}

async function loadSales(startDate, endDate) {
    // If no dates are provided, default to today
    if (!startDate || !endDate) {
        const today = new Date().toISOString().slice(0, 10);
        startDate = today;
        endDate = today;
    }

    try {
        const response = await fetch(`${API_BASE}/api/sales?start=${startDate}&end=${endDate}`);
        
        if (!response.ok) {
            throw new Error(`${translate('http_error') || 'HTTP error! status:'} ${response.status}`);
        }
        const data = await response.json();
        sales = data.map(sale => {
            if (!sale.type) {
                const stockItem = stock.find(item => item.name && sale.productName && item.name.toLowerCase() === sale.productName.toLowerCase());
                sale.type = stockItem ? stockItem.type : translate('product');
            }
            if (sale.paymentType === translate('mobile_money') && typeof sale.mobileMoneyType === 'undefined') {
                sale.mobileMoneyType = '';
            }
            return sale;
        });

    } catch (error) {
        console.error(translate('error_loading_sales') || 'Error loading sales from backend:', error);
        showMessageModal(translate('load_sales_error') || 'Failed to load sales data from the server. Please check your network connection.');
        sales = []; // Clear sales if loading fails
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
        console.log( 'Loading cached stock from localStorage...');
        try {
            stock = JSON.parse(cachedStock);
            // Ensure 'type' property exists for cached data
            stock.forEach(item => {
                if (!item.type) item.type = translate('product') || 'product';
            });
            console.log('Cached stock loaded:', stock);
        } catch (error) {
            console.error( 'Error parsing cached stock:', error);
            stock = [];
        }
    }

    // If offline, use cached data and stop here
    if (!navigator.onLine) {
        console.log(translate('offline_using_cached') || 'Offline mode - using cached stock data');
        if (!stock || stock.length === 0) {
            // Fallback to older offline_stock if no cached_stock
            const offlineStock = localStorage.getItem('offline_stock');
            if (offlineStock) {
                try {
                    stock = JSON.parse(offlineStock);
                    stock.forEach(item => {
                        if (!item.type) item.type = translate('product') || 'product';
                    });
                    console.log(translate('using_offline_stock') || 'Using legacy offline stock data');
                } catch (error) {
                    console.error(translate('error_parsing_offline') || 'Error parsing offline stock:', error);
                    stock = [];
                }
            }
        }
        return;
    }

    // Online: try to fetch fresh data from API
    try {
        console.log('Fetching fresh stock data from API...');
       const response = await fetch(`${API_BASE}/api/stock`);
        
        if (!response.ok) {
            throw new Error(`${translate('http_error') || 'HTTP error! status:'} ${response.status}`);
        }
        
        const freshStock = await response.json();
        
        // Ensure 'type' property exists
        freshStock.forEach(item => {
            if (!item.type) item.type = translate('product') || 'product';
        });
        
        // Update stock variable
        stock = freshStock;
        
        // Save to localStorage for caching
        try {
            localStorage.setItem('cached_stock', JSON.stringify(freshStock));
            // Also update the legacy offline_stock for backward compatibility
            localStorage.setItem('offline_stock', JSON.stringify(freshStock));
            console.log('Stock data cached successfully');
        } catch (storageError) {
            console.warn(translate('storage_full_warning') || 'Could not cache stock data (storage may be full):', storageError);
        }
        
        console.log('Fresh stock loaded successfully:', stock);
        
    } catch (error) {
        console.error(translate('error_loading_stock') || 'Error loading stock from API:', error);
        
        // If we have cached stock, use it and show warning
        if (cachedStock && stock && stock.length > 0) {

        } else {
            // No cached data available

            stock = []; // Clear stock if loading fails
        }
    }
}
 async function loadStock() {
    try {
        console.log(translate('attempting_load_stock') || 'Attempting to load stock from /api/stock...');
       const response = await fetch(`${API_BASE}/api/stock`);
        if (!response.ok) {
            throw new Error(`${translate('http_error') || 'HTTP error! status:'} ${response.status}`);
        }
        stock = await response.json();
        // Ensure 'type' property exists for older data
        stock.forEach(item => {
            if (!item.type) item.type = translate('product'); // Default to product for old data
        });
        console.log(translate('stock_loaded_success') || 'Stock loaded successfully:', stock);
    } catch (error) {
        console.error(translate('error_loading_stock') || 'Error loading stock from backend:', error);
        showMessageModal(translate('load_stock_error') || 'Failed to load stock data from the server. Please check your network connection.');
        stock = []; // Clear stock if loading fails
    }
    
    if (!navigator.onLine) {
        stock = JSON.parse(localStorage.getItem('offline_stock') || '[]');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/api/stock`);
        stock = await res.json();
    } catch (error) {
        stock = JSON.parse(localStorage.getItem('offline_stock') || '[]');
    }
}

async function loadCreditSales() {
    try {
        const response = await fetch(`${API_BASE}/api/credit-sales`);
        if (!response.ok) {
            throw new Error(`${translate('http_error') || 'HTTP error! status:'} ${response.status}`);
        }
        creditSales = await response.json();
        console.log(translate('credit_sales_loaded_success') || 'Credit sales loaded successfully:', creditSales);
    } catch (error) {
        console.error(translate('error_loading_credit_sales') || 'Error loading credit sales from backend:', error);
        showMessageModal(translate('load_credit_sales_error') || 'Failed to load credit sales data from the server. Please check your network connection.');
        creditSales = []; // Clear credit sales if loading fails
    }
}

async function loadStockHistory(startDateStr, endDateStr) {
    try {
        console.log(translate('attempting_load_stock_history_range') || 'Attempting to load stock history with date range...');

        if (!navigator.onLine) {
            // Load from localStorage if offline
            const offlineData = localStorage.getItem('offline_stock_history');
            stockHistory = offlineData ? JSON.parse(offlineData) : [];
            
            // Filter by date range if provided
            if (startDateStr && endDateStr) {
                stockHistory = stockHistory.filter(entry => {
                    if (!entry.timestamp && !entry.date) return false;
                    
                    try {
                        // Try to get date from entry
                        let entryDate;
                        if (entry.timestamp) {
                            entryDate = new Date(entry.timestamp).toISOString().slice(0, 10);
                        } else if (entry.date) {
                            entryDate = entry.date;
                        } else {
                            return false;
                        }
                        
                        // Compare dates (YYYY-MM-DD format)
                        return entryDate >= startDateStr && entryDate <= endDateStr;
                    } catch (e) {
                        console.warn('Error parsing date for entry:', entry);
                        return false;
                    }
                });
            }
            
            normalizeStockHistoryTimestamps();
            return stockHistory; // Return the filtered history
        }

        // Build URL with query parameters if date range is provided
        let url = `${API_BASE}/api/stock-history`;
        if (startDateStr && endDateStr) {
            url += `?start=${encodeURIComponent(startDateStr)}&end=${encodeURIComponent(endDateStr)}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`${translate('http_error') || 'HTTP error! status:'} ${response.status}`);

        stockHistory = await response.json();
        normalizeStockHistoryTimestamps();

        // Store in localStorage for offline use
        localStorage.setItem('offline_stock_history', JSON.stringify(stockHistory));

        console.log(translate('stock_history_loaded_success') || 'Stock history loaded successfully:', stockHistory);
        return stockHistory; // Return the loaded history
    } catch (error) {
        console.error(translate('error_loading_stock_history') || 'Error loading stock history:', error);
        showMessageModal(translate('load_stock_history_error') || 'Failed to load stock history data. Please check your network.');
        stockHistory = [];
        return []; // Return empty array on error
    }
}


// NEW: Load business info from the backend
async function loadBusinessInfo() {
    try {
        const response = await fetch(`${API_BASE}/api/business-info`);
        if (!response.ok) {
            throw new Error(`${translate('http_error') || 'http error! status:'} ${response.status}`);
        }
        const data = await response.json();
        
        console.log('Raw data from server:', data); // Debug log
        
        // Ensure all required business info fields are set with defaults
        businessInfo = {
            // Default values
            name: '',
            address: '',
            shopNumber: '',
            phoneNumberTwo: '',
            email: '',
             Website: '',
            socialMediaHandles: '',
            details: '',
            logoData: '',
            warrantyDuration: 0,
            warrantyUnit: 'none',
            warrantyText: '',
            currency: 'FCFA',
            fontStyle: '',
            currentLanguage: 'en',
            festiveBadgeEnabled: false,
            currentBadgeIndex: 0,
            // Override with backend data
            ...data
        };

        console.log('Processed businessInfo:', businessInfo); // Debug log

        // Save ALL business info to localStorage
        localStorage.setItem('businessInfo', JSON.stringify(businessInfo));

        // Set currency
        if (businessInfo.currency) {
            currentCurrency = businessInfo.currency;
            localStorage.setItem('currency', currentCurrency);
            if (currencySelector) currencySelector.value = currentCurrency;
            updateCurrencyLabels();
        }
        
        applyBusinessFontStyle(businessInfo.fontStyle);
        
        // Set language from business info
        if (businessInfo.currentLanguage) {
            currentLanguage = businessInfo.currentLanguage;
            localStorage.setItem('language', currentLanguage);
            
            const languageSelector = document.getElementById('languageSelector');
            if (languageSelector && languageSelector.value !== currentLanguage) {
                languageSelector.value = currentLanguage;
            }
            
            if (typeof translateUI === 'function') {
                translateUI();
            }
        }

        // Save other individual items to localStorage for quick access
        if (businessInfo.name) localStorage.setItem('businessName', businessInfo.name);
        if (businessInfo.address) localStorage.setItem('businessAddress', businessInfo.address);
        if (businessInfo.shopNumber) localStorage.setItem('businessPhone', businessInfo.shopNumber);
        if (businessInfo.email) localStorage.setItem('businessEmail', businessInfo.email);
          if (businessInfo.Website) localStorage.setItem('businessEmail', businessInfo.Website);
        if (businessInfo.logoData) localStorage.setItem('businessLogo', businessInfo.logoData);
        if (businessInfo.warrantyDuration) localStorage.setItem('warrantyDuration', businessInfo.warrantyDuration.toString());
        if (businessInfo.warrantyUnit) localStorage.setItem('warrantyUnit', businessInfo.warrantyUnit);
        if (businessInfo.warrantyText) localStorage.setItem('warrantyText', businessInfo.warrantyText);
        if (businessInfo.fontStyle) localStorage.setItem('fontStyle', businessInfo.fontStyle);

        updateHomeLogo();
        populatePrintFooter();
        
        // 🔥 CRITICAL FIX: Apply festive settings AFTER loading data
        console.log('Calling applyGlobalFestiveSettings with businessInfo:', businessInfo);
        applyGlobalFestiveSettings();
        
        console.log('Business info fully loaded and applied');
    } catch (error) {
        console.error('Error loading business info from backend:', error);
        showMessageModal('Failed to load business information from the server. Using saved data or defaults.');
        
        // Try to load from localStorage as fallback
        const savedBusinessInfo = localStorage.getItem('businessInfo');
        if (savedBusinessInfo) {
            try {
                businessInfo = JSON.parse(savedBusinessInfo);
                console.log('Loaded business info from localStorage fallback:', businessInfo);
                
                // Set currency from localStorage fallback
                if (businessInfo.currency) {
                    currentCurrency = businessInfo.currency;
                    if (currencySelector) currencySelector.value = currentCurrency;
                    updateCurrencyLabels();
                }
                
                // Set language from localStorage fallback
                if (businessInfo.currentLanguage) {
                    currentLanguage = businessInfo.currentLanguage;
                    const languageSelector = document.getElementById('languageSelector');
                    if (languageSelector) languageSelector.value = currentLanguage;
                    if (typeof translateUI === 'function') translateUI();
                }
                
                updateHomeLogo();
                
                // 🔥 Apply festive settings from localStorage data
                if (typeof applyGlobalFestiveSettings === 'function') {
                    applyGlobalFestiveSettings();
                }
                
                return;
            } catch (parseError) {
                console.error('Error parsing saved business info:', parseError);
            }
        }
        
        // Set comprehensive defaults on error
        businessInfo = {
            name: '',
            address: '',
            shopNumber: '',
            phoneNumberTwo: '',
            email: '',
            Website: '',
            socialMediaHandles: '',
            details: '',
            logoData: '',
            warrantyDuration: 0,
            warrantyUnit: 'none',
            warrantyText: '',
            currency: 'FCFA',
            currentLanguage: 'en',
            festiveBadgeEnabled: false,
            currentBadgeIndex: 0
        };
        
        // Save defaults to localStorage
        localStorage.setItem('businessInfo', JSON.stringify(businessInfo));
        
        // 🔥 Apply festive settings with defaults
        if (typeof applyGlobalFestiveSettings === 'function') {
            applyGlobalFestiveSettings();
        }
        
        // Ensure language is set in localStorage on error
        const savedLanguage = localStorage.getItem('language');
        if (!savedLanguage) {
            localStorage.setItem('language', 'en');
        }
        currentLanguage = savedLanguage || 'en';
        
        // Translate UI even on error
        if (typeof translateUI === 'function') {
            translateUI();
        }
    }
}

   
function normalizeStockHistoryTimestamps() {
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
    try {
        const response = await fetch(`${API_BASE}/api/sales/update-missing-dates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();

        if (result.success) {
            console.log(`${translate('sales_fixed_success') || '✅'} ${result.updatedCount} ${translate('sales_fixed') || 'sales fixed'}: ${result.message}`);
        } else {
            console.warn(translate('no_sales_updated') || '⚠️ No sales were updated:', result.message);
        }
    } catch (err) {
        console.error(translate('failed_to_fix_sale_dates') || '❌ Failed to fix missing sale dates:', err);
        showMessageModal(translate('fix_sale_dates_error') || 'Failed to fix missing sales dates. Please check the connection.');
    }
}
async function loadLoans() {
    try {
        showLoading();
if (isCancelled) return;

translate('loading_loans');
        
        const response = await fetch(`${API_BASE}/api/loans`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(translate('server_responded_with'), response.status, errorText);
            throw new Error(`${translate('failed_to_load_loans')}: ${response.status} ${errorText}`);
        }
        
        loans = await response.json();
        console.log(translate('loaded_loans'), loans.length);
        
        // Apply filters and render
        applyLoanFilters();
        updateLoanStats();
        
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
    } catch (error) {
        console.error(translate('full_error_loading_loans'), error);
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        showMessageModal(`${translate('error')}: ${error.message}`, 'error');
        
        // Fallback to local storage if server fails
        const localLoans = JSON.parse(localStorage.getItem('loans') || '[]');
        if (localLoans.length > 0) {
            loans = localLoans;
            applyLoanFilters();
            updateLoanStats();
            showMessageModal(translate('using_local_data'), 'warning');
        }
    }
}
async function loadExpenses() {
    try {
        const res = await fetch(`${API_BASE}/api/expenses`);
        expenses = await res.json();
    } catch (e) {
        expenses = [];
    }
}
async function loadReminders() {
    try {
        const res = await fetch(`${API_BASE}/api/reminders`);
        if(res.ok) {
            const allRemindersData = await res.json();
            if (currentUser && currentUser.username === "admin") {
                allReminders = allRemindersData;
            } else {
                allReminders = allRemindersData.filter(r => r.username === (currentUser ? currentUser.username : translate('unknown')));
            }
            
            // Update local reminders for alarm checking (only active ones)
            reminders = allReminders.filter(r => r.isActive !== false);
            
            updateReminderDisplay();
            updateStatistics();
        }
    } catch (e) { 
        console.error(translate('failedToLoadReminders'), e); 
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
async function loadLoansdata() {
    try {



        
        const response = await fetch(`${API_BASE}/api/loans`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(translate('server_responded_with'), response.status, errorText);
            throw new Error(`${translate('failed_to_load_loans')}: ${response.status} ${errorText}`);
        }
        
        loans = await response.json();
        console.log(translate('loaded_loans'), loans.length);
        
        // Apply filters and render
        applyLoanFilters();
        updateLoanStats();
        
    } catch (error) {
        console.error(translate('full_error_loading_loans'), error);
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        showMessageModal(`${translate('error')}: ${error.message}`, 'error');
        
        // Fallback to local storage if server fails
        const localLoans = JSON.parse(localStorage.getItem('loans') || '[]');
        if (localLoans.length > 0) {
            loans = localLoans;
            applyLoanFilters();
            updateLoanStats();
            showMessageModal(translate('using_local_data'), 'warning');
        }
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/api/users`);
        users = await response.json();
        console.log('👥 Users loaded:', users);
    } catch (error) {
        console.error(translations[currentLanguage]?.error_loading_users || 'Error loading users:', error);
        showMessageModal(translations[currentLanguage]?.load_users_error || 'Failed to load user data from the server.');
    }
}
async function loadUsers21() {
    try {
        const response = await fetch(`${API_BASE}/api/users`);
        users = await response.json();
    } catch (error) {
        console.error(translations[currentLanguage]?.error_loading_users || 'Error loading users:', error);
        
    }
}
    async function loadSalesTargets() {
        try {
            const res = await fetch(`${API_BASE}/api/targets`);
            if (!res.ok) throw new Error('Failed to load targets');
            const data = await res.json();
            weeklySalesTarget = data.weekly || 0;
            monthlySalesTarget = data.monthly || 0;
            document.getElementById('weeklySalesTargetInput').value = weeklySalesTarget;
            document.getElementById('monthlySalesTargetInput').value = monthlySalesTarget;

        } catch (err) {
            console.error('Error loading targets:', err);
        }
    }

async function loadTasks() {
    try {
        const res = await fetch(`${API_BASE}/api/tasks`);
        if (res.ok) {
            const allTasksData = await res.json();
            
            // Filter tasks based on user role and assignment
            if (currentUser && currentUser.username === "admin") {
                allTasks = allTasksData;
            } else {
                allTasks = allTasksData.filter(task => 
                    task.assignedTo === 'all' || 
                    task.assignedTo === currentUser?.username ||
                    task.createdBy === currentUser?.username
                );
            }
            
            // Update window.tasks for compatibility (only active pending tasks)
            window.tasks = allTasks.filter(t => t.status === 'pending' && t.isActive !== false);
            
            updateTaskDisplay();
            updateTaskStatistics();
             renderTasksInReminderPanel();
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
        try {
        const res = await fetch(`${API_BASE}/api/tasks`);
        if (!res.ok) throw new Error(translate('failed_to_load_tasks') || 'Failed to load tasks');
        window.tasks = await res.json();
        renderTasksInReminderPanel(); // ✅ Render AFTER data loads
    } catch (err) {
        console.error(translate('error_loading_tasks') || 'Error loading tasks:', err);
        window.tasks = [];
        renderTasksInReminderPanel();
    }
}

// Helper function to normalize receipt data from different sources
function normalizeReceiptData(data) {
    // If it's already in customer receipt format with items array
    if (data.receiptId && data.items) {
        return data;
    }
    
    // If it's from SALES_FILE (single sale object)
    if (data.id && data.productName) {
        return {
            receiptId: data.id,
            customerName: data.customerName || '',
            date: data.dateSold,
            items: [{
                id: data.id,
                name: data.productName,
                type: data.type || 'product',
                quantity: data.quantity || 1,
                price: data.price || data.totalAmount || 0,
                paymentType: data.paymentType || 'Cash',
                mobileMoneyType: data.mobileMoneyType,
                hybridBreakdown: data.hybridBreakdown,
                customerName: data.customerName,
                taxRate: data.taxRate || 0,
                creditRemaining: data.creditRemaining
            }],
            total: data.price || data.totalAmount || 0,
            cashier: data.username,
            paymentType: data.paymentType,
            source: 'sales'
        };
    }
    
    return data;
}