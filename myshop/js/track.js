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



(function() {
    'use strict';

    // ============================================
    // 📊 CONFIGURATION
    // ============================================
    const CONFIG = {
        TARGETS: {
            sales: 3,      // Show after 3 sales
            stock: 2,      // Show after 2 stock additions  
            customer: 3    // Show after 3 customer additions
        },
        COOLDOWN_HOURS: 24,
        UI: {
            debugMode: true,
            autoCloseDelay: 15000,  // Auto-close after 15 seconds
            showToastFirst: true,    // Show toast before modal
            toastDelay: 2500         // Delay before showing modal
        }
    };

    // ============================================
    // 📦 STORAGE KEYS
    // ============================================
    const STORAGE_KEYS = {
        sales: 'feedback_sales_count',
        stock: 'feedback_stock_count',
        customer: 'feedback_customer_count',
        lastFeedback: 'feedback_last_date',
        lastFeedbackTimestamp: 'feedback_last_timestamp',
        skippedToday: 'feedback_skipped_today'
    };

    // ============================================
    // 📈 COUNTERS STATE
    // ============================================
    let counters = {
        sales: parseInt(localStorage.getItem(STORAGE_KEYS.sales) || '0'),
        stock: parseInt(localStorage.getItem(STORAGE_KEYS.stock) || '0'),
        customer: parseInt(localStorage.getItem(STORAGE_KEYS.customer) || '0'),
        lastFeedbackDate: localStorage.getItem(STORAGE_KEYS.lastFeedback) || null,
        lastFeedbackTimestamp: parseInt(localStorage.getItem(STORAGE_KEYS.lastFeedbackTimestamp) || '0'),
        skippedToday: localStorage.getItem(STORAGE_KEYS.skippedToday) === 'true'
    };

    let currentFeedbackType = '';
    let currentSentiment = 'Great';
    let supabaseClient = null;
    let autoCloseTimeout = null;

    // ============================================
    // 🔧 HELPER FUNCTIONS
    // ============================================
    
    function log(...args) {
        if (CONFIG.UI.debugMode) {
            console.log('[Feedback System]', ...args);
        }
    }

    function getSupabaseClient() {
        if (window.supabaseClient) return window.supabaseClient;
        if (window._supabaseClient) return window._supabaseClient;
        if (window.SUPABASE_CLIENT) return window.SUPABASE_CLIENT;
        
        const supabaseUrl = 'https://zexxdoxuzvkovszfqcio.supabase.co';
        const supabaseKey = 'sb_publishable_svIdBFlhG9fG8zlOsMcs-g_kqUWBT8W';
        
        if (window.supabase) {
            try {
                const client = window.supabase.createClient(supabaseUrl, supabaseKey);
                window._supabaseClient = client;
                return client;
            } catch(e) {
                log('Failed to create supabase client:', e);
                return null;
            }
        }
        return null;
    }

    function hasCooldownExpired() {
        // Check if user skipped today
        if (counters.skippedToday) {
            const today = new Date().toDateString();
            if (counters.lastFeedbackDate === today) {
                log('⏰ User skipped today');
                return false;
            } else {
                // Reset skip for new day
                counters.skippedToday = false;
                localStorage.setItem(STORAGE_KEYS.skippedToday, 'false');
            }
        }
        
        if (!counters.lastFeedbackTimestamp) return true;
        const hoursSinceLast = (Date.now() - counters.lastFeedbackTimestamp) / (1000 * 60 * 60);
        return hoursSinceLast >= CONFIG.COOLDOWN_HOURS;
    }

    function saveCounters() {
        localStorage.setItem(STORAGE_KEYS.sales, counters.sales);
        localStorage.setItem(STORAGE_KEYS.stock, counters.stock);
        localStorage.setItem(STORAGE_KEYS.customer, counters.customer);
        if (counters.lastFeedbackDate) {
            localStorage.setItem(STORAGE_KEYS.lastFeedback, counters.lastFeedbackDate);
        }
        if (counters.lastFeedbackTimestamp) {
            localStorage.setItem(STORAGE_KEYS.lastFeedbackTimestamp, counters.lastFeedbackTimestamp);
        }
    }

    // ============================================
    // 🎯 MAIN FEEDBACK CHECK LOGIC
    // ============================================
    async function checkAndShowFeedback(type, actionName) {
        log(`Checking feedback for: ${type}`);
        
        if (!hasCooldownExpired()) {
            log(`⏰ Cooldown active`);
            return false;
        }
        
        let shouldShow = false;
        let target = CONFIG.TARGETS[type];
        
        if (!target) return false;
        
        // Increment counter
        counters[type]++;
        saveCounters();
        
        // Check if target reached
        if (counters[type] >= target) {
            shouldShow = true;
            log(`🎯 Target reached! Showing feedback after ${counters[type]} ${type}`);
        } else {
            log(`📊 Progress: ${counters[type]}/${target}`);
        }
        
        if (shouldShow) {
            // Record that we showed feedback
            counters.lastFeedbackDate = new Date().toDateString();
            counters.lastFeedbackTimestamp = Date.now();
            saveCounters();
            
            // Show toast first, then modal with delay
            if (CONFIG.UI.showToastFirst) {
                showSuccessToast(getCelebrationMessage(type, counters[type]));
                setTimeout(() => {
                    showFeedbackModal(getFeedbackMessage(type, counters[type]), type);
                }, CONFIG.UI.toastDelay);
            } else {
                await showFeedbackModal(getFeedbackMessage(type, counters[type]), type);
            }
            
            // Reset counter after showing
            counters[type] = 0;
            saveCounters();
            
            return true;
        }
        
        return false;
    }

    function getCelebrationMessage(type, count) {
        const messages = {
            sales: `🔥 ${count} sales completed! Great momentum!`,
            stock: `📦 ${count} items added to inventory!`,
            customer: `👋 ${count} new customers added!`
        };
        return messages[type] || '🎉 Great progress today!';
    }

    function getFeedbackMessage(type, count) {
        const messages = {
            sales: [
                `🔥 Nice work! You just completed ${count} sales.`,
                `💸 Business is moving! ${count} sales already.`,
                `🚀 You're doing great today — ${count} sales completed!`,
                `💰 ${count} sales in the books! Keep the momentum going!`
            ],
            stock: [
                `📦 Inventory updated smoothly.`,
                `🛒 ${count} products added successfully.`,
                `📈 Your stock is growing nicely!`,
                `✅ Stock management is on point today!`
            ],
            customer: [
                `👋 New customers added successfully.`,
                `🤝 Your customer list keeps growing!`,
                `⭐ ${count} customers added today.`,
                `🎯 Building your business, one customer at a time!`
            ]
        };

        const list = messages[type] || [`Great work today!`];
        return list[Math.floor(Math.random() * list.length)];
    }

    // ============================================
    // 🎨 MODERN BOTTOM SHEET MODAL
    // ============================================
    function injectFeedbackModal() {
        if (document.getElementById('autoFeedbackModal')) return;
        
        const modalHTML = `
            <div id="autoFeedbackModal" class="fixed inset-0 bg-black/40 hidden items-end justify-center z-[99999]" style="backdrop-filter: blur(2px);">
                <div class="feedback-card w-full max-w-sm bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl transform transition-all">
                    <!-- Drag indicator -->
                    <div class="flex justify-center pt-3 pb-1">
                        <div class="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    </div>
                    
                    <div class="p-5">
                        <!-- Header -->
                        <div class="text-center mb-4">
                            <div class="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                                <i class="fas fa-chart-line text-2xl text-white"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800 dark:text-white">
                                🎯 Progress Check!
                            </h3>
                            <p id="feedbackMessage" class="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                You're doing amazing work!
                            </p>
                        </div>
                        
                        <!-- Quick Stats -->
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 rounded-xl p-3 mb-4">
                            <div class="flex justify-around text-center">
                                <div>
                                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400" id="statSales">0</div>
                                    <div class="text-xs text-gray-600 dark:text-gray-400">Sales Today</div>
                                </div>
                                <div>
                                    <div class="text-2xl font-bold text-green-600 dark:text-green-400" id="statStock">0</div>
                                    <div class="text-xs text-gray-600 dark:text-gray-400">Items Added</div>
                                </div>
                            </div>
                            <div class="text-center mt-2">
                                <span class="text-xs text-green-600 dark:text-green-400">
                                    🔥 Keep going! You're building momentum.
                                </span>
                            </div>
                        </div>
                        
                        <!-- Modern Sentiment Options -->
                        <div class="mb-4">
                            <p class="text-sm text-gray-700 dark:text-gray-300 mb-3 text-center">How's everything working?</p>
                            <div class="grid grid-cols-3 gap-2">
                                <button data-sentiment="Great" class="sentiment-btn flex flex-col items-center p-3 rounded-xl transition-all hover:scale-105 bg-gray-50 dark:bg-gray-700">
                                    <i class="far fa-grin-beam text-2xl text-green-500"></i>
                                    <span class="text-xs mt-1">Great</span>
                                </button>
                                <button data-sentiment="Okay" class="sentiment-btn flex flex-col items-center p-3 rounded-xl transition-all hover:scale-105 bg-gray-50 dark:bg-gray-700">
                                    <i class="far fa-smile text-2xl text-yellow-500"></i>
                                    <span class="text-xs mt-1">Okay</span>
                                </button>
                                <button data-sentiment="Needs Improvement" class="sentiment-btn flex flex-col items-center p-3 rounded-xl transition-all hover:scale-105 bg-gray-50 dark:bg-gray-700">
                                    <i class="far fa-lightbulb text-2xl text-purple-500"></i>
                                    <span class="text-xs mt-1">Needs Work</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Quick Reactions -->
                        <div class="mb-3">
                            <div class="flex gap-2 flex-wrap justify-center">
                                <button class="quick-reaction text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-blue-100 transition-colors">
                                    👍 Easy to use
                                </button>
                                <button class="quick-reaction text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-blue-100 transition-colors">
                                    ⚡ Fast
                                </button>
                                <button class="quick-reaction text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-blue-100 transition-colors">
                                    🐛 Found issue
                                </button>
                                <button class="quick-reaction text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-blue-100 transition-colors">
                                    💡 Suggestion
                                </button>
                            </div>
                        </div>
                        
                        <!-- Feedback Text with Counter -->
                        <div class="mb-4">
                            <textarea id="feedbackText" rows="2" maxlength="200" 
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none" 
                                placeholder="Share your thoughts... (optional)"></textarea>
                            <div class="flex justify-between mt-1 text-xs text-gray-500">
                                <span>Optional feedback</span>
                                <span id="charCount">0/200</span>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex flex-col gap-2">
                            <button id="submitFeedbackBtn" 
                                class="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:scale-[1.02] transition-all shadow-lg">
                                Send Feedback ❤️
                            </button>
                            <div class="flex gap-2">
                                <button id="closeFeedbackBtn" 
                                    class="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all text-sm">
                                    Later
                                </button>
                                <button id="skipTodayBtn" 
                                    class="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all text-sm">
                                    Don't ask today
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add styles
        if (!document.querySelector('#feedback-styles')) {
            const style = document.createElement('style');
            style.id = 'feedback-styles';
            style.textContent = `
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .feedback-card {
                    animation: slideUp 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
                }
                
                .sentiment-btn.active {
                    background: linear-gradient(135deg, #3b82f6, #6366f1) !important;
                    transform: scale(1.05);
                }
                
                .sentiment-btn.active i,
                .sentiment-btn.active span {
                    color: white !important;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                
                .feedback-toast-premium {
                    animation: slideUp 0.3s ease-out;
                }
            `;
            document.head.appendChild(style);
        }
        
        attachModalEvents();
        setupCharacterCounter();
    }
    
    function setupCharacterCounter() {
        const textarea = document.getElementById('feedbackText');
        const charCount = document.getElementById('charCount');
        
        if (textarea && charCount) {
            textarea.addEventListener('input', () => {
                const length = textarea.value.length;
                charCount.textContent = `${length}/200`;
                if (length > 200) {
                    textarea.value = textarea.value.slice(0, 200);
                    charCount.textContent = '200/200';
                }
            });
        }
    }
    
    function attachModalEvents() {
        // Close button
        document.getElementById('closeFeedbackBtn')?.addEventListener('click', closeFeedbackModal);
        
        // Submit button
        document.getElementById('submitFeedbackBtn')?.addEventListener('click', submitFeedback);
        
        // Skip today button
        document.getElementById('skipTodayBtn')?.addEventListener('click', () => {
            counters.skippedToday = true;
            localStorage.setItem(STORAGE_KEYS.skippedToday, 'true');
            counters.lastFeedbackTimestamp = Date.now();
            saveCounters();
            showSuccessToast("We won't ask again today. Thanks for your hard work! 🙌");
            closeFeedbackModal();
        });
        
        // Sentiment buttons
        document.querySelectorAll('.sentiment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setSentiment(btn.dataset.sentiment);
            });
        });
        
        // Quick reactions
        document.querySelectorAll('.quick-reaction').forEach(btn => {
            btn.addEventListener('click', () => {
                const textarea = document.getElementById('feedbackText');
                const currentText = textarea.value;
                const reaction = btn.textContent.trim();
                textarea.value = currentText ? `${currentText}\n${reaction}` : reaction;
                textarea.dispatchEvent(new Event('input'));
                textarea.focus();
            });
        });
        
        // Close on backdrop click
        const modal = document.getElementById('autoFeedbackModal');
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) closeFeedbackModal();
        });
        
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                closeFeedbackModal();
            }
        });
    }
    
    function setSentiment(sentiment) {
        currentSentiment = sentiment;
        document.querySelectorAll('.sentiment-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.sentiment === sentiment) {
                btn.classList.add('active');
            }
        });
    }
    
    async function showFeedbackModal(message, type) {
        // Clear any existing auto-close timeout
        if (autoCloseTimeout) clearTimeout(autoCloseTimeout);
        
        injectFeedbackModal();
        
        const modal = document.getElementById('autoFeedbackModal');
        const messageEl = document.getElementById('feedbackMessage');
        const statSales = document.getElementById('statSales');
        const statStock = document.getElementById('statStock');
        
        currentFeedbackType = type;
        messageEl.textContent = message;
        
        statSales.textContent = counters.sales;
        statStock.textContent = counters.stock;
        
        const textarea = document.getElementById('feedbackText');
        if (textarea) textarea.value = '';
        setSentiment('Great');
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Auto-close after delay
        autoCloseTimeout = setTimeout(() => {
            closeFeedbackModal();
        }, CONFIG.UI.autoCloseDelay);
        
        log(`Modal shown for type: ${type}`);
    }
    
    function closeFeedbackModal() {
        if (autoCloseTimeout) clearTimeout(autoCloseTimeout);
        
        const modal = document.getElementById('autoFeedbackModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }
    
    // ============================================
    // 💾 SAVE FEEDBACK TO SUPABASE
    // ============================================
    async function submitFeedback() {
        const feedbackText = document.getElementById('feedbackText')?.value?.trim();
        const submitBtn = document.getElementById('submitFeedbackBtn');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }
        
        try {
            supabaseClient = getSupabaseClient();
            
            if (supabaseClient) {
                const deviceId = localStorage.getItem('deviceId') || 
                                localStorage.getItem('app_device_id') || 
                                'device-' + Date.now();
                
                const username = window.currentUser?.username || 
                                localStorage.getItem('username') || 
                                localStorage.getItem('app_username') || 
                                'Anonymous';
                
                let city = null, country = null;
                try {
                    if (window.userLocation) {
                        city = window.userLocation.city;
                        country = window.userLocation.country;
                    }
                } catch(e) {}
                
                const feedbackData = {
                    sentiment: currentSentiment,
                    suggestions: feedbackText || `Feedback provided after ${currentFeedbackType}`,
                    username: username,
                    device_id: deviceId,
                    city: city,
                    country: country,
                    status: 'new',
                    created_at: new Date().toISOString()
                };
                
                log('Submitting feedback:', feedbackData);
                
                const { data, error } = await supabaseClient
                    .from('user_feedback')
                    .insert(feedbackData)
                    .select();
                
                if (error) throw error;
                
                log('✅ Feedback saved!', data);
                showSuccessToast('Thanks for your feedback! ❤️');
                
            } else {
                saveFeedbackLocally(feedbackText);
                showSuccessToast('Feedback saved! Thanks! ❤️');
            }
            
            closeFeedbackModal();
            
        } catch (err) {
            console.error('Feedback error:', err);
            showSuccessToast('Thanks for sharing! ❤️');
            closeFeedbackModal();
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send Feedback ❤️';
            }
        }
    }
    
    function saveFeedbackLocally(feedbackText) {
        const localFeedbacks = JSON.parse(localStorage.getItem('local_feedbacks') || '[]');
        localFeedbacks.push({
            sentiment: currentSentiment,
            feedback: feedbackText,
            type: currentFeedbackType,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('local_feedbacks', JSON.stringify(localFeedbacks));
        log('Feedback saved locally');
    }
    
    function showSuccessToast(message) {
        const existingToast = document.querySelector('.feedback-toast-premium');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'feedback-toast-premium fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md bg-black/80 text-white text-sm z-[99999]';
        toast.innerHTML = `<i class="fas fa-check-circle mr-2 text-green-400"></i>${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // ============================================
    // 🔌 AUTO-HOOK FUNCTIONS (FIXED)
    // ============================================
    function hookFunction(obj, functionName, hookType) {
        if (typeof obj[functionName] === 'function') {
            const original = obj[functionName];
            obj[functionName] = async function(...args) {
                try {
                    const result = await original.apply(this, args);
                    const isSuccess = result !== false && result !== null && !result?.error;
                    if (isSuccess) {
                        setTimeout(() => {
                            checkAndShowFeedback(hookType, functionName);
                        }, 500);
                    }
                    return result;
                } catch (err) {
                    console.error(`Error in ${functionName}:`, err);
                    throw err; // Fixed: Don't call original again on error
                }
            };
            log(`✅ Hooked into ${functionName}()`);
            return true;
        }
        return false;
    }
    
    function autoHookFunctions() {
        const hooks = [
            { obj: window, name: 'recordSale', type: 'sales' },
            { obj: window, name: 'saveSale', type: 'sales' },
            { obj: window, name: 'addSale', type: 'sales' },
            { obj: window, name: 'addItem', type: 'stock' },
            { obj: window, name: 'addStockItem', type: 'stock' },
            { obj: window, name: 'addCustomer', type: 'customer' },
            { obj: window, name: 'saveCustomer', type: 'customer' }
        ];
        
        let hooked = 0;
        hooks.forEach(hook => {
            if (hookFunction(hook.obj, hook.name, hook.type)) hooked++;
        });
        log(`Auto-hooked into ${hooked} functions`);
    }
    
    // ============================================
    // 🌐 PUBLIC API
    // ============================================
    
    window.FeedbackSystem = {
        onSale: () => checkAndShowFeedback('sales', 'Manual'),
        onStock: () => checkAndShowFeedback('stock', 'Manual'),
        onCustomer: () => checkAndShowFeedback('customer', 'Manual'),
        reset: () => {
            counters = { sales: 0, stock: 0, customer: 0, lastFeedbackDate: null, lastFeedbackTimestamp: 0, skippedToday: false };
            localStorage.setItem(STORAGE_KEYS.skippedToday, 'false');
            saveCounters();
            log('Counters reset');
            console.log('✅ Counters reset!');
        },
        setTargets: (targets) => {
            Object.assign(CONFIG.TARGETS, targets);
            console.log('🎯 New targets:', CONFIG.TARGETS);
        },
        setDebug: (enabled) => {
            CONFIG.UI.debugMode = enabled;
            console.log(`Debug mode: ${enabled ? 'ON' : 'OFF'}`);
        },
        showModal: (message, type) => showFeedbackModal(message, type),
        status: () => {
            console.log('=== Feedback System Status ===');
            console.log('Counters:', counters);
            console.log('Targets:', CONFIG.TARGETS);
            const hoursLeft = counters.lastFeedbackTimestamp ? 
                Math.max(0, CONFIG.COOLDOWN_HOURS - (Date.now() - counters.lastFeedbackTimestamp) / (1000 * 60 * 60)).toFixed(1) : 0;
            console.log(`Cooldown: ${hoursLeft} hours remaining`);
            console.log('===============================');
        }
    };
    
    // Legacy support
    window.onSaleRecorded = () => checkAndShowFeedback('sales', 'Sale');
    window.onItemAdded = () => checkAndShowFeedback('stock', 'Stock');
    window.onCustomerAdded = () => checkAndShowFeedback('customer', 'Customer');
    window.resetFeedbackCounters = () => window.FeedbackSystem.reset();
    window.viewFeedbackCounters = () => window.FeedbackSystem.status();
    
    // ============================================
    // 🚀 INITIALIZATION
    // ============================================
    function init() {
        log('🎯 UX-Enhanced Auto-Feedback System v3.0 Initialized');
        log(`📊 Settings: ${CONFIG.TARGETS.sales} sales, ${CONFIG.TARGETS.stock} stock, ${CONFIG.TARGETS.customer} customers`);
        log(`🎨 Modern bottom sheet + toast-first UX enabled`);
        
        injectFeedbackModal();
        
        setTimeout(autoHookFunctions, 1500);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();