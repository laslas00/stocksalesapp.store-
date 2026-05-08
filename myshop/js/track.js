// ==================== SUPABASE DIRECT TRACKER ====================
// Works in packaged AppX - no localhost server required!

(function() {
    'use strict';

    // ⚠️ REPLACE WITH YOUR ACTUAL VALUES
    const SUPABASE_URL = 'https://zexxdoxuzvkovszfqcio.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleHhkb3h1enZrb3ZzemZxY2lvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUzMzQ1MSwiZXhwIjoyMDkyMTA5NDUxfQ.yLhpe7k3bxu73az7qqKssN33JGB358hhWqZIUC490Pk'; // ← Replace with your Supabase anon key

    let supabase = null;
    let cachedDeviceId = null;

    // ==================== INIT SUPABASE ====================
function initSupabase() {
    if (supabase) return supabase;
    try {
        // The CDN creates window.supabase global object
        const { createClient } = window.supabase; // ← USE window.supabase
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false }
        });
        console.log('✅ Supabase tracker ready ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅');
    } catch (err) {
        console.error('Supabase init failed:', err.message);
    }
    return supabase;
}

    // ==================== GET DEVICE ID ====================
    async function getDeviceId() {
        if (cachedDeviceId) return cachedDeviceId;
        
        cachedDeviceId = localStorage.getItem('deviceId');
        
        if (!cachedDeviceId && window.electronAPI?.getMachineId) {
            try {
                cachedDeviceId = await window.electronAPI.getMachineId();
                if (cachedDeviceId) localStorage.setItem('deviceId', cachedDeviceId);
            } catch (err) {
                // fall through
            }
        }
        
        if (!cachedDeviceId) {
            cachedDeviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', cachedDeviceId);
        }
        
        return cachedDeviceId;
    }

    // ==================== GET USER LOCATION ====================
    async function getUserLocation() {
        const resultBase = { 
            source: 'unknown', 
            timestamp: new Date().toISOString(), 
            userAgent: navigator.userAgent 
        };

        // 1) Try browser geolocation first
        try {
            const geo = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) return reject(new Error('Not supported'));
                
                const timer = setTimeout(() => reject(new Error('Timeout')), 7000);
                
                navigator.geolocation.getCurrentPosition(
                    pos => {
                        clearTimeout(timer);
                        resolve({
                            source: 'geolocation',
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            accuracy: pos.coords.accuracy,
                            timestamp: new Date(pos.timestamp).toISOString()
                        });
                    },
                    err => {
                        clearTimeout(timer);
                        reject(err);
                    },
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 7000 }
                );
            });
            return { ...resultBase, ...geo };
        } catch (geoErr) {
            console.debug('Geolocation failed:', geoErr?.message);
        }

        // 2) Try IP-based services
        const services = [
            { url: 'https://ipapi.co/json/', parse: (d) => ({ ip: d.ip, city: d.city, region: d.region, country: d.country_name, latitude: d.latitude, longitude: d.longitude }) },
            { url: 'https://ipinfo.io/json', parse: (d) => ({ ip: d.ip, city: d.city, region: d.region, country: d.country, latitude: d.loc?.split(',')[0], longitude: d.loc?.split(',')[1] }) },
            { url: 'https://ip-api.com/json', parse: (d) => ({ ip: d.query, city: d.city, region: d.regionName, country: d.country, latitude: d.lat, longitude: d.lon }) }
        ];

        for (const service of services) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const res = await fetch(service.url, { 
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                });
                clearTimeout(timeoutId);
                
                if (res.ok) {
                    const data = await res.json();
                    const parsed = service.parse(data);
                    return {
                        ...resultBase,
                        source: 'ip',
                        ip: parsed.ip || '',
                        city: parsed.city || '',
                        region: parsed.region || '',
                        country: parsed.country || '',
                        latitude: parseFloat(parsed.latitude) || null,
                        longitude: parseFloat(parsed.longitude) || null,
                        accuracy: null
                    };
                }
            } catch (err) {
                continue;
            }
        }

        // 3) Fallback
        return {
            ...resultBase,
            source: 'device',
            city: 'Unknown',
            country: '',
            deviceInfo: {
                platform: navigator.platform,
                language: navigator.language,
                screen: `${screen.width}x${screen.height}`
            }
        };
    }

    // ==================== CORE: trackAppEvent ====================
    // ✅ THIS IS THE MAIN FUNCTION EVERYTHING CALLS
    // trackAppEvent(eventType, eventData = {}, username = null)
    window.trackAppEvent = async function(eventType, eventData = {}, username = null) {
        try {
            const client = initSupabase();
            if (!client) return;

            const deviceId = await getDeviceId();
            
            let location = null;
            try {
                location = await getUserLocation();
            } catch (err) {
                console.debug('Location failed:', err?.message);
            }

            const { error } = await client
                .from('app_events')
                .insert({
                    device_id: deviceId,
                    event_type: eventType,
                    event_data: eventData,
                    username: username || localStorage.getItem('username') || null,
                    country: location?.country || null,
                    city: location?.city || null,
                    latitude: location?.latitude || null,
                    longitude: location?.longitude || null,
                    user_agent: navigator.userAgent,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.debug('Tracking failed:', error.message);
            }
        } catch (err) {
            console.debug('Tracking error (non-critical):', err.message);
        }
    };

    // ==================== PRINT TRACKING ====================
    // ✅ Exact signature from your code
    window.trackPrintEvent = function(reportType, details = {}) {
        setTimeout(async () => {
            try {
                const eventData = {
                    reportType: reportType,
                    timestamp: new Date().toISOString(),
                    ...details
                };
                await window.trackAppEvent('print_history', eventData, window.currentUser?.username);
            } catch (err) {
                console.debug('Print tracking failed (non-critical):', err.message);
            }
        }, 0);
    };

    // ==================== SUBMIT FEEDBACK ====================
    // ✅ Direct Supabase - no local server needed
    window.submitFeedbackDirect = async function() {
        const suggestions = document.getElementById('feedbackText')?.value?.trim();
        const sentiment = window.selectedSentiment || 'Neutral';
        
        if (!suggestions) {
            alert('Please enter your feedback before submitting.');
            return;
        }
        
        const submitBtn = document.querySelector('#feedbackModal .btn-primary');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }
        
        try {
            const client = initSupabase();
            if (!client) throw new Error('Database not available');

            const deviceId = await getDeviceId();
            const username = localStorage.getItem('username') || 'Anonymous';
            const email = localStorage.getItem('userEmail') || '';
            
            let location = null;
            try {
                location = await getUserLocation();
            } catch (e) {
                console.debug('Location for feedback failed:', e);
            }
            
            const actions = localStorage.getItem('successfulActions') || '';
            const installDate = localStorage.getItem('install_date') || '';
            
            const metadata = {
                platform: navigator.platform,
                language: navigator.language,
                screenResolution: `${screen.width}x${screen.height}`,
                userAgent: navigator.userAgent,
                appVersion: localStorage.getItem('appVersion') || 'unknown',
                timestamp: new Date().toISOString()
            };
            
            const { data, error } = await client
                .from('user_feedback')
                .insert({
                    sentiment: sentiment,
                    suggestions: suggestions,
                    username: username,
                    email: email || null,
                    device_id: deviceId,
                    actions: actions || null,
                    install_date: installDate || null,
                    country: location?.country || null,
                    city: location?.city || null,
                    latitude: location?.latitude || null,
                    longitude: location?.longitude || null,
                    user_agent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    status: 'new',
                    metadata: metadata
                })
                .select();
            
            if (error) throw error;
            
            alert('✅ Thank you for your feedback!');
            
            const feedbackText = document.getElementById('feedbackText');
            if (feedbackText) feedbackText.value = '';
            
            localStorage.setItem('feedbackPromptShown', 'true');
            localStorage.setItem('lastFeedbackDate', new Date().toISOString());
            
            if (typeof closeFeedback === 'function') closeFeedback();
            
        } catch (err) {
            console.error('Feedback error:', err);
            alert('⚠️ Something went wrong. Please try again later.\n\nError: ' + err.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send Feedback';
            }
        }
    };

    // ==================== TRACK SETUP COMPLETION ====================
    window.trackSetupComplete = async function(setupData) {
        try {
            const client = initSupabase();
            if (!client) return;

            const deviceId = await getDeviceId();
            const location = await getUserLocation();

            const { error } = await client
                .from('user_setups')
                .insert({
                    username: setupData.username || 'unknown',
                    email: setupData.email || null,
                    owner_name: setupData.ownerName || null,
                    business_name: setupData.businessName || null,
                    business_address: setupData.businessAddress || null,
                    business_phone: setupData.businessPhone || null,
                    business_website: setupData.businessWebsite || null,
                    business_description: setupData.businessDescription || null,
                    city: location?.city || null,
                    country: location?.country || null,
                    region: location?.region || null,
                    latitude: location?.latitude || null,
                    longitude: location?.longitude || null,
                    location_source: location?.source || null,
                    language: setupData.language || 'en',
                    currency: setupData.currency || 'XAF',
                    warranty_duration: setupData.warrantyDuration || 0,
                    warranty_unit: setupData.warrantyUnit || 'days',
                    device_id: deviceId,
                    user_agent: navigator.userAgent,
                    setup_completed_at: new Date().toISOString(),
                    app_version: localStorage.getItem('appVersion') || '1.0'
                });

            if (error) {
                console.debug('Setup tracking failed:', error.message);
            }
        } catch (err) {
            console.debug('Setup tracking error:', err.message);
        }
    };

    // ==================== SENTIMENT SELECTION ====================
    window.selectedSentiment = 'Happy';
    
    window.setSentiment = function(sentiment) {
        window.selectedSentiment = sentiment;
        
        document.querySelectorAll('.sentiment-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const buttons = document.querySelectorAll('.sentiment-btn');
        const sentiments = ['Sad', 'Neutral', 'Happy'];
        const index = sentiments.indexOf(sentiment);
        if (index >= 0 && buttons[index]) {
            buttons[index].classList.add('active');
        }
    };

    console.log('📊 Supabase Direct Tracker Ready (no server required)');

})();



// ==================== AUTOMATIC FEEDBACK PROMPT SYSTEM ====================
// Add this AFTER your Supabase tracker code



(function() {
    'use strict';

    // 📊 TRACK COUNTERS (stored in localStorage)
    let counters = {
        salesCount: parseInt(localStorage.getItem('feedback_sales_count') || '0'),
        stockCount: parseInt(localStorage.getItem('feedback_stock_count') || '0'),
        customerCount: parseInt(localStorage.getItem('feedback_customer_count') || '0'),
        lastFeedbackDate: localStorage.getItem('feedback_last_date') || null
    };

    // 🎯 TARGETS - Show feedback after these many actions
    const TARGETS = {
        sales: 1,      // Show after 3 sales
        stock: 2,      // Show after 2 stock items added
        customer: 3    // Show after 3 customers added
    };

    // ⏰ COOLDOWN - Only show feedback once per day max
    const COOLDOWN_HOURS = 24;

    // ==================== FEEDBACK MODAL HTML ====================
    function injectFeedbackModal() {
        if (document.getElementById('autoFeedbackSimpleModal')) return;
        
        const modalHTML = `
            <div id="autoFeedbackSimpleModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-[99999]" style="backdrop-filter: blur(4px);">
                <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 transform transition-all scale-95 animate-modal-popup">
                    <div class="text-center mb-4">
                        <div class="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-3 animate-bounce">
                            <i class="fas fa-trophy text-4xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                            🎉 Great Progress!
                        </h3>
                        <p id="feedbackMessage" class="text-gray-600 dark:text-gray-300">
                            You're doing amazing work!
                        </p>
                    </div>
                    
                    <!-- Quick Stats -->
                    <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
                        <div class="grid grid-cols-2 gap-3 text-center">
                            <div>
                                <div class="text-2xl font-bold text-blue-600" id="statSales">0</div>
                                <div class="text-xs text-gray-600 dark:text-gray-400">Sales Today</div>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-green-600" id="statStock">0</div>
                                <div class="text-xs text-gray-600 dark:text-gray-400">Items Added</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Simple Sentiment -->
                    <div class="mb-4">
                        <p class="text-sm text-gray-700 dark:text-gray-300 mb-2 text-center">How are you feeling?</p>
                        <div class="flex justify-around">
                            <button onclick="setSimpleSentiment('Sad')" class="simple-sentiment p-3 rounded-lg transition-all hover:scale-105">
                                <i class="far fa-frown text-2xl text-red-500"></i>
                            </button>
                            <button onclick="setSimpleSentiment('Neutral')" class="simple-sentiment p-3 rounded-lg transition-all hover:scale-105">
                                <i class="far fa-meh text-2xl text-yellow-500"></i>
                            </button>
                            <button onclick="setSimpleSentiment('Happy')" class="simple-sentiment p-3 rounded-lg transition-all hover:scale-105 active">
                                <i class="far fa-smile-wink text-2xl text-green-500"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Feedback Text -->
                    <div class="mb-4">
                        <textarea id="simpleFeedbackText" rows="2" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" 
                            placeholder="Quick feedback... (optional)"></textarea>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex gap-3">
                        <button onclick="closeSimpleFeedback()" class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                            Later
                        </button>
                        <button onclick="submitSimpleFeedback()" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            Send ❤️
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add animation styles
        if (!document.querySelector('#simple-feedback-styles')) {
            const style = document.createElement('style');
            style.id = 'simple-feedback-styles';
            style.textContent = `
                @keyframes modal-popup {
                    from { opacity: 0; transform: scale(0.9) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-modal-popup { animation: modal-popup 0.3s ease-out; }
                .animate-bounce { animation: bounce 0.5s ease-in-out; }
                .simple-sentiment.active {
                    background: linear-gradient(135deg, #3b82f6, #6366f1);
                    transform: scale(1.05);
                }
                .simple-sentiment.active i { color: white !important; }
            `;
            document.head.appendChild(style);
        }
    }

    // ==================== CHECK AND SHOW FEEDBACK ====================
    function checkAndShowFeedback(type, actionName) {
        // Check cooldown (once per day)
        const now = new Date().toDateString();
        if (counters.lastFeedbackDate === now) {
            console.log(`⏰ Already showed feedback today. Skipping.`);
            return false;
        }
        
        let shouldShow = false;
        let message = '';
        
        switch(type) {
            case 'sale':
                counters.salesCount++;
                localStorage.setItem('feedback_sales_count', counters.salesCount);
                
                if (counters.salesCount >= TARGETS.sales) {
                    shouldShow = true;
                    message = `🎉 You've made ${counters.salesCount} sales! Amazing job! How's the sales process?`;
                    // Reset counter after showing
                    counters.salesCount = 0;
                    localStorage.setItem('feedback_sales_count', 0);
                } else {
                    console.log(`📊 Sales: ${counters.salesCount}/${TARGETS.sales} until feedback`);
                }
                break;
                
            case 'stock':
                counters.stockCount++;
                localStorage.setItem('feedback_stock_count', counters.stockCount);
                
                if (counters.stockCount >= TARGETS.stock) {
                    shouldShow = true;
                    message = `📦 You've added ${counters.stockCount} items to inventory! How's the stock management working?`;
                    counters.stockCount = 0;
                    localStorage.setItem('feedback_stock_count', 0);
                } else {
                    console.log(`📊 Stock: ${counters.stockCount}/${TARGETS.stock} until feedback`);
                }
                break;
                
            case 'customer':
                counters.customerCount++;
                localStorage.setItem('feedback_customer_count', counters.customerCount);
                
                if (counters.customerCount >= TARGETS.customer) {
                    shouldShow = true;
                    message = `👋 You've added ${counters.customerCount} customers! Building your business! How's it going?`;
                    counters.customerCount = 0;
                    localStorage.setItem('feedback_customer_count', 0);
                } else {
                    console.log(`📊 Customers: ${counters.customerCount}/${TARGETS.customer} until feedback`);
                }
                break;
        }
        
        if (shouldShow) {
            // Update last feedback date
            counters.lastFeedbackDate = now;
            localStorage.setItem('feedback_last_date', now);
            
            // Show the feedback modal
            showSimpleFeedback(message, type, {
                sales: parseInt(localStorage.getItem('feedback_sales_count') || '0'),
                stock: parseInt(localStorage.getItem('feedback_stock_count') || '0')
            });
            return true;
        }
        
        return false;
    }
    
    // ==================== SHOW FEEDBACK MODAL ====================
    let currentFeedbackType = '';
    
    function showSimpleFeedback(message, type, stats) {
        const modal = document.getElementById('autoFeedbackSimpleModal');
        const messageEl = document.getElementById('feedbackMessage');
        const statSales = document.getElementById('statSales');
        const statStock = document.getElementById('statStock');
        
        currentFeedbackType = type;
        messageEl.textContent = message;
        
        // Show stats (even if not at target yet)
        if (statSales) statSales.textContent = stats.sales;
        if (statStock) statStock.textContent = stats.stock;
        
        // Reset form
        document.getElementById('simpleFeedbackText').value = '';
        setSimpleSentiment('Happy');
        
        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Track that we showed feedback
        if (typeof window.trackAppEvent === 'function') {
            window.trackAppEvent('auto_feedback_shown', {
                type: type,
                message: message
            });
        }
    }
    
    // ==================== FEEDBACK SUBMISSION ====================
    let simpleSentiment = 'Happy';
    
    window.setSimpleSentiment = function(sentiment) {
        simpleSentiment = sentiment;
        document.querySelectorAll('.simple-sentiment').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.includes(sentiment) || 
                (sentiment === 'Happy' && btn.querySelector('.fa-smile-wink')) ||
                (sentiment === 'Sad' && btn.querySelector('.fa-frown')) ||
                (sentiment === 'Neutral' && btn.querySelector('.fa-meh'))) {
                btn.classList.add('active');
            }
        });
    };
    
    window.submitSimpleFeedback = async function() {
        const feedbackText = document.getElementById('simpleFeedbackText')?.value?.trim();
        const submitBtn = document.querySelector('#autoFeedbackSimpleModal .bg-blue-600');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }
        
        try {
            const client = window.initSupabase ? window.initSupabase() : null;
            
            if (client) {
                const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
                const username = window.currentUser?.username || localStorage.getItem('username') || 'Anonymous';
                
                const { error } = await client
                    .from('user_feedback')
                    .insert({
                        sentiment: simpleSentiment,
                        suggestions: feedbackText || `Feedback after ${currentFeedbackType}`,
                        username: username,
                        device_id: deviceId,
                        feedback_source: 'auto_trigger',
                        feedback_type: currentFeedbackType,
                        status: 'new',
                        created_at: new Date().toISOString()
                    });
                
                if (error) throw error;
            }
            
            // Show success message
            showSuccessToast('Thank you for your feedback! ❤️');
            
            // Close modal
            closeSimpleFeedback();
            
        } catch (err) {
            console.error('Feedback error:', err);
            alert('Thanks for your feedback! (Will save next time)');
            closeSimpleFeedback();
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send ❤️';
            }
        }
    };
    
    window.closeSimpleFeedback = function() {
        const modal = document.getElementById('autoFeedbackSimpleModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };
    
    function showSuccessToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-[99999] animate-fade-in';
        toast.innerHTML = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        
        // Add animation style if not exists
        if (!document.querySelector('#toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes fade-in {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // ==================== PUBLIC FUNCTIONS TO CALL ====================
    
    // Call this AFTER successfully recording a sale
    window.onSaleRecorded = function() {
        console.log('💰 Sale recorded! Checking feedback trigger...');
        checkAndShowFeedback('sale', 'Sale Recorded');
    };
    
    // Call this AFTER successfully adding an item to stock
    window.onItemAdded = function() {
        console.log('📦 Item added! Checking feedback trigger...');
        checkAndShowFeedback('stock', 'Item Added');
    };
    
    // Call this AFTER successfully adding a customer
    window.onCustomerAdded = function() {
        console.log('👋 Customer added! Checking feedback trigger...');
        checkAndShowFeedback('customer', 'Customer Added');
    };
    
    // Reset counters manually (for testing)
    window.resetFeedbackCounters = function() {
        counters.salesCount = 0;
        counters.stockCount = 0;
        counters.customerCount = 0;
        localStorage.setItem('feedback_sales_count', 0);
        localStorage.setItem('feedback_stock_count', 0);
        localStorage.setItem('feedback_customer_count', 0);
        console.log('🔄 Feedback counters reset!');
    };
    
    // View current counters
    window.viewFeedbackCounters = function() {
        console.log('📊 Feedback Counters:', {
            sales: parseInt(localStorage.getItem('feedback_sales_count') || '0'),
            stock: parseInt(localStorage.getItem('feedback_stock_count') || '0'),
            customers: parseInt(localStorage.getItem('feedback_customer_count') || '0'),
            lastFeedback: localStorage.getItem('feedback_last_date') || 'Never'
        });
    };
    
    // ==================== AUTO-HOOK INTO EXISTING FUNCTIONS ====================
    
    function autoHookFunctions() {
        // Hook into recordSale function if it exists
        if (typeof window.recordSale === 'function') {
            const originalRecordSale = window.recordSale;
            window.recordSale = async function(...args) {
                const result = await originalRecordSale.apply(this, args);
                // If sale was successful, trigger feedback check
                if (result !== false && result !== null && !result?.error) {
                    setTimeout(() => window.onSaleRecorded(), 500);
                }
                return result;
            };
            console.log('✅ Auto-hooked into recordSale()');
        }
        
        // Hook into addItem function if it exists
        if (typeof window.addItem === 'function') {
            const originalAddItem = window.addItem;
            window.addItem = async function(...args) {
                const result = await originalAddItem.apply(this, args);
                if (result !== false && result !== null && !result?.error) {
                    setTimeout(() => window.onItemAdded(), 500);
                }
                return result;
            };
            console.log('✅ Auto-hooked into addItem()');
        }
        
        // Hook into addCustomer function if it exists
        if (typeof window.addCustomer === 'function') {
            const originalAddCustomer = window.addCustomer;
            window.addCustomer = async function(...args) {
                const result = await originalAddCustomer.apply(this, args);
                if (result !== false && result !== null && !result?.error) {
                    setTimeout(() => window.onCustomerAdded(), 500);
                }
                return result;
            };
            console.log('✅ Auto-hooked into addCustomer()');
        }
    }
    
    // ==================== INITIALIZE ====================
    function initSimpleFeedback() {
        console.log('🎯 Simple Auto-Feedback System Initialized');
        console.log(`📊 Settings: Show after ${TARGETS.sales} sales, ${TARGETS.stock} stock items, or ${TARGETS.customer} customers`);
        
        injectFeedbackModal();
        
        // Try to auto-hook into existing functions after a delay
        setTimeout(autoHookFunctions, 2000);
        
        // Display current counters on load
        console.log('Current counters:', {
            sales: parseInt(localStorage.getItem('feedback_sales_count') || '0'),
            stock: parseInt(localStorage.getItem('feedback_stock_count') || '0'),
            customers: parseInt(localStorage.getItem('feedback_customer_count') || '0')
        });
    }
    
    // Start the system
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSimpleFeedback);
    } else {
        initSimpleFeedback();
    }
    
})();