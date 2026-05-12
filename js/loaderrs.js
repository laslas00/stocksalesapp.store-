
const MYSUPABASE_URL =window.ENV?.MYSHOPSUPABASE_URL || 'https://axndkzmmzwpvwuftbkuw.supabase.co';
const MY_ANON_KEY = window.ENV?.MYSHOPSUPABASE_ANON_KEY || 'your-anon-key-here';

// Create a dedicated Supabase client for setup (YOUR project, not track.js)
let setupDB = null;

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

function connectWebSocket() {
    console.log('🔌 Setting up Supabase Realtime...');
    
    const client = getSB();
    if (!client) {
        console.warn('Supabase not available for realtime');
        return;
    }

    // Get current business ID for filtering
    const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
    
    console.log('🔍 Realtime filtering by business_id:', currentBusinessId);

    // Listen for new sales (filtered by business)
    realtimeSubscription = client
        .channel('public-sales')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'sales',
                filter: currentBusinessId ? `business_id=eq.${currentBusinessId}` : undefined
            },
            (payload) => {
                const sale = payload.new;
                
                // Double-check business match
                if (currentBusinessId && sale.business_id !== currentBusinessId) {
                    return; // Skip - different business
                }
                
                const saleUser = (typeof users !== 'undefined' ? users.find(u => u.username === sale.username) : null) || currentUser;
                
                if (typeof loadSalesForYear === 'function') {
                    loadSalesForYear(new Date().getFullYear()).then(renderSales);
                }
                
                if (typeof enqueueNotification === 'function') {
                    enqueueNotification(
                        (data, done) => showSaleNotificationBar(data.sale, data.user, done),
                        { sale: sale, user: saleUser }
                    );
                }
            }
        )
        // Listen for new tasks (filtered by business)
        .on('postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'tasks',
                filter: currentBusinessId ? `business_id=eq.${currentBusinessId}` : undefined
            },
            (payload) => {
                const task = payload.new;
                
                if (currentBusinessId && task.business_id !== currentBusinessId) {
                    return;
                }
                
                if (typeof showTaskNotificationBar === 'function') showTaskNotificationBar(task);
                if (typeof loadTasks === 'function') loadTasks();
            }
        )
        // Listen for stock changes - low stock (filtered by business)
        .on('postgres_changes',
            { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'stock',
                filter: currentBusinessId ? `business_id=eq.${currentBusinessId}` : undefined
            },
            (payload) => {
                const item = payload.new;
                
                if (currentBusinessId && item.business_id !== currentBusinessId) {
                    return;
                }
                
                if (item.quantity < 3) {
                    if (typeof enqueueNotification === 'function') {
                        enqueueNotification(
                            showLowStockNotificationBar,
                            { itemName: item.name, quantity: item.quantity }
                        );
                    }
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Supabase Realtime connected (business:', currentBusinessId || 'all', ')');
            } else {
                console.log('🔄 Realtime status:', status);
            }
        });
}

// To disconnect:
function disconnectRealtime() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
        console.log('🔌 Realtime disconnected');
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
        
        let query = client.from('stock').select('*').order('name', { ascending: true });
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
