// ==================== SUPABASE DIRECT TRACKER ====================
// Works in packaged AppX - no localhost server required!

(function() {
    'use strict';



    let supabase = null;
    let cachedDeviceId = null;
    let currentUser = null;
    let businessInfo = null;

    // ==================== INIT SUPABASE ====================

    // ==================== LOAD USER DATA FROM STORAGE ====================
    function loadUserDataFromStorage() {
        // Load from localStorage
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
            try {
                currentUser = JSON.parse(userSession);
                console.log('✅ User loaded from session:', currentUser.username);
            } catch(e) {}
        }
        
        const businessInfoRaw = localStorage.getItem('businessInfo');
        if (businessInfoRaw) {
            try {
                businessInfo = JSON.parse(businessInfoRaw);
                console.log('✅ Business info loaded:', businessInfo.name);
            } catch(e) {}
        }
        
        // Also check individual storage items
        if (!currentUser) {
            currentUser = {
                username: localStorage.getItem('currentUsername') || localStorage.getItem('username') || 'User',
                role: localStorage.getItem('currentRole') || 'staff',
                userId: localStorage.getItem('currentUserId') || '',
                business_id: localStorage.getItem('businessId') || '',
                email: localStorage.getItem('userEmail') || '',
                full_name: localStorage.getItem('fullName') || '',
                phone: localStorage.getItem('userPhone') || '',
                address: localStorage.getItem('userAddress') || ''
            };
        }
        
        return { currentUser, businessInfo };
    }

    // ==================== GET DEVICE ID ====================
 async function getDeviceId() {
    if (cachedDeviceId) return cachedDeviceId;
    
    try {
        const businessId = localStorage.getItem('businessId');
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        const bizId = businessId || userSession?.business_id || window.currentUser?.business_id;
        
        if (bizId) {
            console.log('📱 Device ID = Business ID:', bizId);
            localStorage.setItem('deviceId', bizId);
            cachedDeviceId = bizId;
            return bizId;
        }
    } catch (err) {}
    
}
    // ==================== GET USER LOCATION ====================
    async function getUserLocation() {
        const resultBase = { 
            source: 'unknown', 
            timestamp: new Date().toISOString(), 
            userAgent: navigator.userAgent 
        };

        // Try browser geolocation first
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

        // Try IP-based services
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

        // Fallback
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

    // ==================== SAVE PROFILE TO STORAGE ====================
    function saveProfileToStorage(profileData) {
        // Update localStorage
        if (profileData.username) {
            localStorage.setItem('currentUsername', profileData.username);
            localStorage.setItem('username', profileData.username);
        }
        
        if (profileData.email) {
            localStorage.setItem('userEmail', profileData.email);
        }
        
        if (profileData.full_name) {
            localStorage.setItem('fullName', profileData.full_name);
        }
        
        if (profileData.phone) {
            localStorage.setItem('userPhone', profileData.phone);
        }
        
        if (profileData.address) {
            localStorage.setItem('userAddress', profileData.address);
        }
        
        if (profileData.business_id) {
            localStorage.setItem('businessId', profileData.business_id);
        }
        
        if (profileData.role) {
            localStorage.setItem('currentRole', profileData.role);
        }
        
        // Update userSession
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
            try {
                const session = JSON.parse(userSession);
                const updatedSession = {
                    ...session,
                    username: profileData.username || session.username,
                    email: profileData.email || session.email,
                    fullName: profileData.full_name || session.fullName,
                    phone: profileData.phone || session.phone,
                    address: profileData.address || session.address,
                    role: profileData.role || session.role
                };
                localStorage.setItem('userSession', JSON.stringify(updatedSession));
                currentUser = updatedSession;
            } catch(e) {}
        }
        
        // Update currentUser object
        if (currentUser) {
            currentUser = { ...currentUser, ...profileData };
        }
        
        console.log('✅ Profile saved to localStorage');
        return true;
    }

    // ==================== LOAD PROFILE FORM ====================
    function loadProfileForm() {
        // Load data from storage
        const { currentUser: user, businessInfo: biz } = loadUserDataFromStorage();
        
        // Fill form fields
        const usernameInput = document.getElementById('profileUsername');
        if (usernameInput) {
            usernameInput.value = user?.username || '';
        }
        
        const emailInput = document.getElementById('profileEmail');
        if (emailInput) {
            emailInput.value = user?.email || biz?.email || '';
        }
        
        const fullNameInput = document.getElementById('profileFullName');
        if (fullNameInput) {
            fullNameInput.value = user?.full_name || user?.fullName || biz?.owner_name || '';
        }
        
        const phoneInput = document.getElementById('profilePhone');
        if (phoneInput) {
            phoneInput.value = user?.phone || biz?.phone || biz?.shopNumber || '';
        }
        
        const addressInput = document.getElementById('profileAddress');
        if (addressInput) {
            addressInput.value = user?.address || biz?.address || '';
        }
        
        const roleInput = document.getElementById('profileRole');
        if (roleInput) {
            roleInput.value = user?.role || 'staff';
        }
        
        const businessNameInput = document.getElementById('profileBusinessName');
        if (businessNameInput) {
            businessNameInput.value = biz?.name || '';
        }
        
        const businessIdInput = document.getElementById('profileBusinessId');
        if (businessIdInput) {
            businessIdInput.value = user?.business_id || biz?.id || '';
        }
        
        // Display location info
        displayLocationInfo();
        
        console.log('✅ Profile form loaded from localStorage');
    }

    // ==================== DISPLAY LOCATION INFO ====================
    async function displayLocationInfo() {
        const locationDiv = document.getElementById('profileLocationInfo');
        if (!locationDiv) return;
        
        try {
            const location = await getUserLocation();
            locationDiv.innerHTML = `
                <div class="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                    <i class="fas fa-map-marker-alt"></i> 
                    ${location.city ? location.city + ', ' : ''}${location.country || 'Location detected'}
                    <span class="text-xs text-gray-400 ml-2">(${location.source})</span>
                </div>
            `;
        } catch(e) {
            locationDiv.innerHTML = '<div class="text-sm text-gray-400 mt-2">📍 Location access not available</div>';
        }
    }

    // ==================== SUBMIT PROFILE FORM ====================
    async function submitProfileForm() {
        try {
            // Get form values
            const profileData = {
                username: document.getElementById('profileUsername')?.value?.trim() || '',
                email: document.getElementById('profileEmail')?.value?.trim() || '',
                full_name: document.getElementById('profileFullName')?.value?.trim() || '',
                phone: document.getElementById('profilePhone')?.value?.trim() || '',
                address: document.getElementById('profileAddress')?.value?.trim() || '',
                role: document.getElementById('profileRole')?.value || 'staff',
                business_name: document.getElementById('profileBusinessName')?.value?.trim() || '',
                business_id: document.getElementById('profileBusinessId')?.value?.trim() || ''
            };
            
            // Validate required fields
            if (!profileData.username) {
                showProfileMessage('Please enter your username', 'error');
                return;
            }
            
            // Save to localStorage
            saveProfileToStorage(profileData);
            
            // Try to update Supabase if available
            const client =  getSB();
            if (client && profileData.business_id) {
                try {
                    const deviceId = await getDeviceId();
                    const location = await getUserLocation();
                    
                    // Update users table
                    const { error: userError } = await client
                        .from('users')
                        .update({
                            username: profileData.username,
                            email: profileData.email,
                            full_name: profileData.full_name,
                            phone: profileData.phone,
                            address: profileData.address,
                            role: profileData.role,
                            updated_at: new Date().toISOString()
                        })
                        .eq('business_id', profileData.business_id);
                    
                    if (userError) {
                        console.debug('Supabase update failed:', userError.message);
                    }
                    
                    // Track profile update event
                    await client
                        .from('app_events')
                        .insert({
                            device_id: deviceId,
                            event_type: 'profile_update',
                            event_data: { fields: Object.keys(profileData) },
                            username: profileData.username,
                            country: location?.country || null,
                            city: location?.city || null,
                            user_agent: navigator.userAgent,
                            created_at: new Date().toISOString()
                        });
                    
                    console.log('✅ Profile synced to Supabase');
                } catch (err) {
                    console.debug('Supabase sync failed:', err.message);
                }
            }
            
            showProfileMessage('✅ Profile saved successfully!', 'success');
            
            // Update sidebar if function exists
            if (typeof updateSidebarUserDisplay === 'function') {
                updateSidebarUserDisplay();
            }
            
            // Close modal after 1.5 seconds
            setTimeout(() => {
                closeProfileModal();
            }, 1500);
            
        } catch (error) {
            console.error('Error saving profile:', error);
            showProfileMessage('❌ Error saving profile: ' + error.message, 'error');
        }
    }

    // ==================== SHOW PROFILE MESSAGE ====================
    function showProfileMessage(message, type = 'info') {
        const messageDiv = document.getElementById('profileMessage');
        if (!messageDiv) return;
        
        const colors = {
            success: 'bg-green-100 text-green-700 border-green-200',
            error: 'bg-red-100 text-red-700 border-red-200',
            info: 'bg-blue-100 text-blue-700 border-blue-200'
        };
        
        messageDiv.className = `p-3 rounded-lg mb-4 ${colors[type] || colors.info}`;
        messageDiv.innerHTML = message;
        messageDiv.classList.remove('hidden');
        
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 3000);
    }

    // ==================== OPEN PROFILE MODAL ====================
    function openProfileModal() {
        // Load data into form
        loadProfileForm();
        
        // Show modal
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    }

    // ==================== CLOSE PROFILE MODAL ====================
    function closeProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }

    // ==================== CREATE PROFILE MODAL HTML ====================
    function createProfileModal() {
        // Check if modal already exists
        if (document.getElementById('profileModal')) return;
        
        const modalHTML = `
            <div id="profileModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50" style="display: none;">
                <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                        <h2 class="text-xl font-bold text-gray-800">
                            <i class="fas fa-user-circle text-blue-500 mr-2"></i>
                            My Profile
                        </h2>
                        <button onclick="closeProfileModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="p-6">
                        <div id="profileMessage" class="hidden"></div>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <i class="fas fa-user mr-1 text-gray-400"></i> Username *
                                </label>
                                <input type="text" id="profileUsername" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                       placeholder="Your username">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <i class="fas fa-envelope mr-1 text-gray-400"></i> Email
                                </label>
                                <input type="email" id="profileEmail" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                       placeholder="your@email.com">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <i class="fas fa-user-tag mr-1 text-gray-400"></i> Full Name
                                </label>
                                <input type="text" id="profileFullName" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                       placeholder="Your full name">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <i class="fas fa-phone mr-1 text-gray-400"></i> Phone Number
                                </label>
                                <input type="tel" id="profilePhone" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                       placeholder="Your phone number">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <i class="fas fa-map-marker-alt mr-1 text-gray-400"></i> Address
                                </label>
                                <textarea id="profileAddress" rows="2" 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="Your address"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <i class="fas fa-briefcase mr-1 text-gray-400"></i> Role
                                </label>
                                <select id="profileRole" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="administrator">Administrator</option>
                                    <option value="manager">Manager</option>
                                    <option value="staff">Staff</option>
                                </select>
                            </div>
                            
                            <div class="border-t pt-4 mt-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <i class="fas fa-store mr-1 text-gray-400"></i> Business Name
                                </label>
                                <input type="text" id="profileBusinessName" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                       readonly disabled
                                       placeholder="Business name">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    <i class="fas fa-id-card mr-1 text-gray-400"></i> Business ID
                                </label>
                                <input type="text" id="profileBusinessId" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                       readonly disabled
                                       placeholder="Business ID">
                            </div>
                            
                            <div id="profileLocationInfo"></div>
                        </div>
                    </div>
                    
                    <div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end space-x-3">
                        <button onclick="closeProfileModal()" 
                                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
                            Cancel
                        </button>
                        <button onclick="submitProfileForm()" 
                                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                            <i class="fas fa-save mr-1"></i> Save Profile
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Close modal when clicking outside
        document.getElementById('profileModal')?.addEventListener('click', function(e) {
            if (e.target === this) {
                closeProfileModal();
            }
        });
    }

    // ==================== TRACK APP EVENT ====================
    window.trackAppEvent = async function(eventType, eventData = {}, username = null) {
        try {
            const client =  getSB();
            if (!client) return;

            const deviceId =  await getDeviceId();
            let location = null;
            try {
                location = await getUserLocation();
            } catch (err) {}

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
            console.debug('Tracking error:', err.message);
        }
    };

    // ==================== EXPOSE GLOBALLY ====================
    window.openProfileModal = openProfileModal;
    window.closeProfileModal = closeProfileModal;
    window.submitProfileForm = submitProfileForm;
    window.loadProfileForm = loadProfileForm;
    window.saveProfileToStorage = saveProfileToStorage;

    // ==================== INITIALIZE ====================
    function init() {
        createProfileModal();
        console.log('✅ Profile form ready - data will be saved to localStorage');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }


    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        TARGETS: {
            sales: 3,
            stock: 2,
            customer: 3
        },
        COOLDOWN_HOURS: 24,
        UI: {
            debugMode: false,
            autoCloseDelay: 15000,
            showToastFirst: true,
            toastDelay: 2500
        }
    };

    // ============================================
    // STORAGE KEYS
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
    // COUNTERS STATE
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
    let currentSentiment = 'Positive';
    let supabaseClient = null;
    let autoCloseTimeout = null;

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function log(...args) {
        if (CONFIG.UI.debugMode) {
            console.log('[Feedback]', ...args);
        }
    }


    function hasCooldownExpired() {
        if (counters.skippedToday) {
            const today = new Date().toDateString();
            if (counters.lastFeedbackDate === today) return false;
            counters.skippedToday = false;
            localStorage.setItem(STORAGE_KEYS.skippedToday, 'false');
        }
        if (!counters.lastFeedbackTimestamp) return true;
        const hoursSinceLast = (Date.now() - counters.lastFeedbackTimestamp) / (1000 * 60 * 60);
        return hoursSinceLast >= CONFIG.COOLDOWN_HOURS;
    }

    function saveCounters() {
        localStorage.setItem(STORAGE_KEYS.sales, counters.sales);
        localStorage.setItem(STORAGE_KEYS.stock, counters.stock);
        localStorage.setItem(STORAGE_KEYS.customer, counters.customer);
        if (counters.lastFeedbackDate) localStorage.setItem(STORAGE_KEYS.lastFeedback, counters.lastFeedbackDate);
        if (counters.lastFeedbackTimestamp) localStorage.setItem(STORAGE_KEYS.lastFeedbackTimestamp, counters.lastFeedbackTimestamp);
    }

    // ============================================
    // FEEDBACK CHECK LOGIC
    // ============================================
    async function checkAndShowFeedback(type, actionName) {
        log(`Checking feedback for: ${type}`);
        
        if (!hasCooldownExpired()) return false;
        
        let target = CONFIG.TARGETS[type];
        if (!target) return false;
        
        counters[type]++;
        saveCounters();
        
        if (counters[type] >= target) {
            counters.lastFeedbackDate = new Date().toDateString();
            counters.lastFeedbackTimestamp = Date.now();
            saveCounters();
            
            if (CONFIG.UI.showToastFirst) {
                showToast(getCelebrationMessage(type, counters[type]));
                setTimeout(() => {
                    showFeedbackModal(getFeedbackMessage(type, counters[type]), type);
                }, CONFIG.UI.toastDelay);
            } else {
                await showFeedbackModal(getFeedbackMessage(type, counters[type]), type);
            }
            
            counters[type] = 0;
            saveCounters();
            return true;
        }
        return false;
    }

    function getCelebrationMessage(type, count) {
        const messages = {
            sales: `${count} sale(s) completed`,
            stock: `${count} item(s) added to inventory`,
            customer: `${count} new customer(s) added`
        };
        return messages[type] || 'Progress updated';
    }

    function getFeedbackMessage(type, count) {
        const messages = {
            sales: [
                `You have completed ${count} sales transaction(s).`,
                `Business activity detected: ${count} sale(s) processed.`,
                `Sales milestone reached: ${count} transaction(s).`
            ],
            stock: [
                `Inventory updated with ${count} item(s).`,
                `${count} new product(s) added to stock.`,
                `Stock management activity detected.`
            ],
            customer: [
                `${count} new customer(s) added to database.`,
                `Customer registry updated with ${count} entry(ies).`
            ]
        };
        const list = messages[type] || ['Please share your feedback.'];
        return list[Math.floor(Math.random() * list.length)];
    }

    // ============================================
    // TOAST NOTIFICATION
    // ============================================
    function showToast(message) {
        const existingToast = document.querySelector('.feedback-toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'feedback-toast';
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================================
    // PROFESSIONAL MODAL
    // ============================================
    function injectStyles() {
        if (document.querySelector('#feedback-system-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'feedback-system-styles';
        styles.textContent = `
            /* Toast */
            .feedback-toast {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%);
                background: #1e293b;
                color: #ffffff;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 13px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                z-index: 100000;
                animation: toastSlide 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            @keyframes toastSlide {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            
            /* Modal */
            .feedback-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 99998;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .feedback-modal-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #ffffff;
                border-radius: 12px;
                width: 90%;
                max-width: 480px;
                max-height: 85vh;
                overflow-y: auto;
                z-index: 99999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                animation: modalSlide 0.3s ease;
            }
            @keyframes modalSlide {
                from { opacity: 0; transform: translate(-50%, -48%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
            }
            
            /* Header */
            .feedback-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .feedback-modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #0f172a;
            }
            .feedback-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #94a3b8;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
            }
            .feedback-modal-close:hover {
                background: #f1f5f9;
                color: #475569;
            }
            
            /* Body */
            .feedback-modal-body {
                padding: 24px;
            }
            .feedback-message {
                font-size: 14px;
                color: #334155;
                margin-bottom: 20px;
                line-height: 1.5;
            }
            
            /* Stats */
            .feedback-stats {
                display: flex;
                gap: 16px;
                background: #f8fafc;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 24px;
            }
            .feedback-stat {
                flex: 1;
                text-align: center;
            }
            .stat-value {
                font-size: 28px;
                font-weight: 700;
                color: #0f172a;
            }
            .stat-label {
                font-size: 11px;
                color: #64748b;
                margin-top: 4px;
            }
            .stat-divider {
                width: 1px;
                background: #e2e8f0;
            }
            
            /* Sections */
            .feedback-section {
                margin-bottom: 20px;
            }
            .feedback-label {
                font-size: 12px;
                font-weight: 600;
                color: #334155;
                margin-bottom: 8px;
                display: block;
            }
            
            /* Rating Options */
            .rating-group {
                display: flex;
                gap: 12px;
            }
            .rating-option {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                background: #ffffff;
                cursor: pointer;
                font-size: 13px;
                color: #475569;
                text-align: center;
                transition: all 0.2s;
            }
            .rating-option:hover {
                border-color: #cbd5e1;
                background: #f8fafc;
            }
            .rating-option.active {
                border-color: #3b82f6;
                background: #eff6ff;
                color: #1d4ed8;
            }
            
            /* Category Tags */
            .category-group {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .category-tag {
                padding: 6px 14px;
                border: 1px solid #e2e8f0;
                border-radius: 20px;
                background: #ffffff;
                font-size: 12px;
                color: #475569;
                cursor: pointer;
                transition: all 0.2s;
            }
            .category-tag:hover {
                border-color: #3b82f6;
                background: #eff6ff;
                color: #1d4ed8;
            }
            
            /* Textarea */
            .feedback-textarea {
                width: 100%;
                padding: 12px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                font-size: 13px;
                font-family: inherit;
                resize: vertical;
                box-sizing: border-box;
            }
            .feedback-textarea:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
            }
            .char-counter {
                text-align: right;
                font-size: 11px;
                color: #94a3b8;
                margin-top: 6px;
            }
            
            /* Footer */
            .feedback-modal-footer {
                padding: 16px 24px;
                border-top: 1px solid #e2e8f0;
                background: #f8fafc;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            .btn-primary, .btn-secondary {
                padding: 8px 18px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
            }
            .btn-primary {
                background: #3b82f6;
                color: #ffffff;
            }
            .btn-primary:hover {
                background: #2563eb;
            }
            .btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .btn-secondary {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                color: #475569;
            }
            .btn-secondary:hover {
                background: #f1f5f9;
            }
            
            /* Responsive */
            @media (max-width: 640px) {
                .feedback-modal-container {
                    width: 95%;
                    max-height: 90vh;
                }
                .feedback-modal-body {
                    padding: 20px;
                }
                .rating-group {
                    flex-direction: column;
                    gap: 8px;
                }
                .feedback-modal-footer {
                    flex-wrap: wrap;
                }
                .btn-primary, .btn-secondary {
                    flex: 1;
                    text-align: center;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    function injectFeedbackModal() {
        if (document.getElementById('professionalFeedbackModal')) return;
        
        const modalHTML = `
            <div id="professionalFeedbackModal" style="display: none;">
                <div class="feedback-modal-overlay" id="feedbackOverlay"></div>
                <div class="feedback-modal-container">
                    <div class="feedback-modal-header">
                        <h3>User Feedback</h3>
                        <button class="feedback-modal-close" id="closeModalBtn">×</button>
                    </div>
                    
                    <div class="feedback-modal-body">
                        <p id="feedbackMessage" class="feedback-message"></p>
                        
                        <div class="feedback-stats">
                            <div class="feedback-stat">
                                <span class="stat-value" id="statSales">0</span>
                                <span class="stat-label">Sales</span>
                            </div>
                            <div class="stat-divider"></div>
                            <div class="feedback-stat">
                                <span class="stat-value" id="statStock">0</span>
                                <span class="stat-label">Stock Items</span>
                            </div>
                        </div>
                        
                        <div class="feedback-section">
                            <label class="feedback-label">Rating</label>
                            <div class="rating-group">
                                <button data-sentiment="Positive" class="rating-option">Positive</button>
                                <button data-sentiment="Neutral" class="rating-option">Neutral</button>
                                <button data-sentiment="Negative" class="rating-option">Negative</button>
                            </div>
                        </div>
                        
                        <div class="feedback-section">
                            <label class="feedback-label">Category</label>
                            <div class="category-group">
                                <button class="category-tag">Usability</button>
                                <button class="category-tag">Performance</button>
                                <button class="category-tag">Bug Report</button>
                                <button class="category-tag">Feature Request</button>
                            </div>
                        </div>
                        
                        <div class="feedback-section">
                            <label class="feedback-label">Comments</label>
                            <textarea id="feedbackText" rows="3" maxlength="500" class="feedback-textarea" placeholder="Please provide additional details..."></textarea>
                            <div class="char-counter"><span id="charCount">0</span> / 500 characters</div>
                        </div>
                    </div>
                    
                    <div class="feedback-modal-footer">
                        <button id="skipTodayBtn" class="btn-secondary">Remind Later</button>
                        <button id="dismissBtn" class="btn-secondary">Dismiss</button>
                        <button id="submitFeedbackBtn" class="btn-primary">Submit</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        injectStyles();
        attachModalEvents();
        setupCharacterCounter();
    }
    
    function setupCharacterCounter() {
        const textarea = document.getElementById('feedbackText');
        const charCount = document.getElementById('charCount');
        if (textarea && charCount) {
            textarea.addEventListener('input', () => {
                charCount.textContent = textarea.value.length;
                if (textarea.value.length > 500) {
                    textarea.value = textarea.value.slice(0, 500);
                    charCount.textContent = 500;
                }
            });
        }
    }
    
    function attachModalEvents() {
        document.getElementById('closeModalBtn')?.addEventListener('click', closeFeedbackModal);
        document.getElementById('dismissBtn')?.addEventListener('click', closeFeedbackModal);
        document.getElementById('feedbackOverlay')?.addEventListener('click', closeFeedbackModal);
        document.getElementById('submitFeedbackBtn')?.addEventListener('click', submitFeedback);
        
        document.getElementById('skipTodayBtn')?.addEventListener('click', () => {
            counters.skippedToday = true;
            localStorage.setItem(STORAGE_KEYS.skippedToday, 'true');
            counters.lastFeedbackTimestamp = Date.now();
            saveCounters();
            showToast('Reminder postponed until tomorrow');
            closeFeedbackModal();
        });
        
        document.querySelectorAll('.rating-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.rating-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentSentiment = btn.dataset.sentiment;
            });
        });
        
        document.querySelectorAll('.category-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const textarea = document.getElementById('feedbackText');
                const category = `[${tag.textContent}]`;
                textarea.value = textarea.value ? `${textarea.value}\n${category}` : category;
                textarea.dispatchEvent(new Event('input'));
                textarea.focus();
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('professionalFeedbackModal');
                if (modal && modal.style.display === 'flex') closeFeedbackModal();
            }
        });
    }
    
    async function showFeedbackModal(message, type) {
        if (autoCloseTimeout) clearTimeout(autoCloseTimeout);
        
        injectFeedbackModal();
        
        const modal = document.getElementById('professionalFeedbackModal');
        const messageEl = document.getElementById('feedbackMessage');
        const statSales = document.getElementById('statSales');
        const statStock = document.getElementById('statStock');
        const textarea = document.getElementById('feedbackText');
        
        currentFeedbackType = type;
        messageEl.textContent = message;
        statSales.textContent = counters.sales;
        statStock.textContent = counters.stock;
        if (textarea) textarea.value = '';
        
        document.querySelectorAll('.rating-option').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.rating-option')?.classList.add('active');
        currentSentiment = 'Positive';
        
        modal.style.display = 'block';
        
        autoCloseTimeout = setTimeout(() => closeFeedbackModal(), CONFIG.UI.autoCloseDelay);
        log(`Modal shown for type: ${type}`);
    }
    
    function closeFeedbackModal() {
        if (autoCloseTimeout) clearTimeout(autoCloseTimeout);
        const modal = document.getElementById('professionalFeedbackModal');
        if (modal) modal.style.display = 'none';
    }
    
    // ============================================
    // SUBMIT FEEDBACK
    // ============================================
    async function submitFeedback() {
        const feedbackText = document.getElementById('feedbackText')?.value?.trim();
        const submitBtn = document.getElementById('submitFeedbackBtn');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }
        
        try {
            const client =  getSB();
            const username = window.currentUser?.username || localStorage.getItem('username') || 'Anonymous';
            const deviceId = getDeviceId();
              
            
            if (client) {
                await client.from('user_feedback').insert({
                    sentiment: currentSentiment.toLowerCase(),
                    suggestions: feedbackText || `Feedback after ${currentFeedbackType}`,
                    username: username,
                    device_id: deviceId,
                    status: 'new',
                    feedback_type: currentFeedbackType,
                    created_at: new Date().toISOString()
                });
            } else {
                const localFeedbacks = JSON.parse(localStorage.getItem('local_feedbacks') || '[]');
                localFeedbacks.push({
                    sentiment: currentSentiment,
                    feedback: feedbackText,
                    type: currentFeedbackType,
                    timestamp: new Date().toISOString()
                });
                localStorage.setItem('local_feedbacks', JSON.stringify(localFeedbacks));
            }
            
            showToast('Thank you for your feedback');
            closeFeedbackModal();
            
        } catch (err) {
            console.error('Feedback error:', err);
            showToast('Feedback received');
            closeFeedbackModal();
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            }
        }
    }
    
    // ============================================
    // AUTO-HOOK FUNCTIONS
    // ============================================
    function hookFunction(obj, functionName, hookType) {
        if (typeof obj[functionName] === 'function') {
            const original = obj[functionName];
            obj[functionName] = async function(...args) {
                try {
                    const result = await original.apply(this, args);
                    const isSuccess = result !== false && result !== null && !result?.error;
                    if (isSuccess) {
                        setTimeout(() => checkAndShowFeedback(hookType, functionName), 500);
                    }
                    return result;
                } catch (err) {
                    console.error(`Error in ${functionName}:`, err);
                    throw err;
                }
            };
            log(`Hooked into ${functionName}()`);
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
        
        hooks.forEach(hook => hookFunction(hook.obj, hook.name, hook.type));
        log('Auto-hook complete');
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    window.FeedbackSystem = {
        onSale: () => checkAndShowFeedback('sales', 'Manual'),
        onStock: () => checkAndShowFeedback('stock', 'Manual'),
        onCustomer: () => checkAndShowFeedback('customer', 'Manual'),
        reset: () => {
            counters = { sales: 0, stock: 0, customer: 0, lastFeedbackDate: null, lastFeedbackTimestamp: 0, skippedToday: false };
            localStorage.setItem(STORAGE_KEYS.skippedToday, 'false');
            saveCounters();
            console.log('Counters reset');
        },
        status: () => console.log('Counters:', counters)
    };
    
    window.onSaleRecorded = () => checkAndShowFeedback('sales', 'Sale');
    window.onItemAdded = () => checkAndShowFeedback('stock', 'Stock');
    window.onCustomerAdded = () => checkAndShowFeedback('customer', 'Customer');
    
    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        log('Professional Feedback System Initialized');
        injectFeedbackModal();
        setTimeout(autoHookFunctions, 1500);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();