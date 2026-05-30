// ==================== SUPABASE DIRECT TRACKER ====================
// Works in packaged AppX - no localhost server required!

(function() {
    'use strict';

    let supabase = null;
    let cachedDeviceId = null;
    let currentUser = null;
    let businessInfo = null;

    // ==================== LOAD USER DATA FROM STORAGE ====================
    function loadUserDataFromStorage() {
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
        
        // Fallback if no business ID found
        const fallbackId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        cachedDeviceId = fallbackId;
        localStorage.setItem('deviceId', fallbackId);
        return fallbackId;
    }

    // ==================== GET USER LOCATION ====================
    async function getUserLocation() {
        const resultBase = { 
            source: 'unknown', 
            timestamp: new Date().toISOString(), 
            userAgent: navigator.userAgent 
        };

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

    // ==================== TRACK APP EVENT ====================
    window.trackAppEvent = async function(eventType, eventData = {}, username = null) {
        try {
            const client = getSB();
            if (!client) return;

            const deviceId = await getDeviceId();
            let location = null;
            try {
                location = await getUserLocation();
            } catch (err) {}

            const { error } = await client.from('app_events').insert({
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

            if (error) console.debug('Tracking failed:', error.message);
        } catch (err) {
            console.debug('Tracking error:', err.message);
        }
    };



    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        TARGETS: {
            sales: 3,
            stock: 2,
            customer: 3
        },
        COOLDOWN_HOURS: 152, // ~1 week cooldown between feedback prompts for each type
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
    let currentSentiment = 'neutral';


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
            sales: translate('sales_celebration').replace('{count}', count),
            stock: translate('stock_celebration').replace('{count}', count),
            customer: translate('customer_celebration').replace('{count}', count)
        };
        const defaults = {
            sales: `${count} sale(s) completed`,
            stock: `${count} item(s) added to inventory`,
            customer: `${count} new customer(s) added`
        };
        return messages[type] || defaults[type] || 'Progress updated';
    }

    function getFeedbackMessage(type, count) {
        const messages = {
            sales: [
                translate('sales_feedback_1').replace('{count}', count),
                translate('sales_feedback_2').replace('{count}', count),
                translate('sales_feedback_3').replace('{count}', count)
            ],
            stock: [
                translate('stock_feedback_1').replace('{count}', count),
                translate('stock_feedback_2').replace('{count}', count),
                translate('stock_feedback_3').replace('{count}', count)
            ],
            customer: [
                translate('customer_feedback_1').replace('{count}', count),
                translate('customer_feedback_2').replace('{count}', count)
            ]
        };
        const defaults = {
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
        const list = messages[type] || defaults[type] || ['Please share your feedback.'];
        return list[Math.floor(Math.random() * list.length)];
    }

    // ============================================
    // TOAST NOTIFICATION
    // ============================================
function showToast(message) {
    // Remove any existing toast container to prevent stacking issues
    const existingContainer = document.querySelector('.feedback-toast-container');
    if (existingContainer) existingContainer.remove();
    
    // Create container
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 50;
        pointer-events: none;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 16px;
        transition: opacity 0.2s;
    `;
    
    // Create toast card
    const toastCard = document.createElement('div');
    toastCard.style.cssText = `
        max-width: 384px;
        width: 100%;
        background-color: #1e1e1e;
        border: 1px solid #3e3e42;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        transform: translateY(96px);
        opacity: 0;
        transition: all 0.3s;
        display: flex;
        gap: 12px;
        pointer-events: auto;
    `;
    
    // Icon container
    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = `
        padding: 4px;
        background-color: #15231b;
        border-radius: 9999px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        align-self: flex-start;
        margin-top: 2px;
    `;
    iconContainer.innerHTML = '<i data-lucide="check-circle-2" style="width: 20px; height: 20px; color: #4ade80;"></i>';
    
    // Message
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        font-size: 14px;
        color: white;
        flex: 1;
        padding-top: 2px;
    `;
    messageDiv.textContent = message;
    
    toastCard.appendChild(iconContainer);
    toastCard.appendChild(messageDiv);
    container.appendChild(toastCard);
    
    // Responsive styles
    const updateResponsiveStyles = () => {
        if (window.innerWidth >= 768) {
            container.style.alignItems = 'flex-end';
            container.style.justifyContent = 'flex-end';
            container.style.padding = '24px';
        } else {
            container.style.alignItems = 'flex-end';
            container.style.justifyContent = 'center';
            container.style.padding = '16px';
        }
    };
    
    updateResponsiveStyles();
    window.addEventListener('resize', updateResponsiveStyles);
    
    document.body.appendChild(container);
    
    // Render Lucide icon
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Animate in
    requestAnimationFrame(() => {
        toastCard.style.transform = 'translateY(0)';
        toastCard.style.opacity = '1';
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
        toastCard.style.transform = 'translateY(96px)';
        toastCard.style.opacity = '0';
        setTimeout(() => {
            container.remove();
            window.removeEventListener('resize', updateResponsiveStyles);
        }, 300);
    }, 3000);
}


    // ============================================
    // FEEDBACK MODAL
    // ============================================

function injectFeedbackModal() {
    if (document.getElementById('feedbackModal')) return;
    
    const modalHTML = `
        <div id="feedbackModal" class="feedback-modal hidden" style="display: none;">
            <div class="feedback-modal-content">
                <!-- Header -->
                <div class="feedback-header">
                    <h3 class="feedback-title">${translate('feedback_title')}</h3>
                    <button id="feedbackCloseBtn" class="feedback-close-btn" aria-label="${translate('close')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                <!-- Body -->
                <div class="feedback-body">
                    <p id="feedbackMessage" class="feedback-message">${translate('feedback_question')}</p>

                    <!-- Radio Buttons -->
                    <div class="feedback-options" id="satisfactionOptions">
                        <label class="feedback-option">
                            <input type="radio" name="satisfaction" value="very-satisfied" class="satisfaction-radio">
                            <span>${translate('very_satisfied')}</span>
                        </label>
                        <label class="feedback-option">
                            <input type="radio" name="satisfaction" value="satisfied" class="satisfaction-radio">
                            <span>${translate('satisfied')}</span>
                        </label>
                        <label class="feedback-option">
                            <input type="radio" name="satisfaction" value="neutral" checked class="satisfaction-radio">
                            <span>${translate('neutral')}</span>
                        </label>
                        <label class="feedback-option">
                            <input type="radio" name="satisfaction" value="dissatisfied" class="satisfaction-radio">
                            <span>${translate('dissatisfied')}</span>
                        </label>
                        <label class="feedback-option">
                            <input type="radio" name="satisfaction" value="very-dissatisfied" class="satisfaction-radio">
                            <span>${translate('very_dissatisfied')}</span>
                        </label>
                    </div>

                    <!-- Comment -->
                    <div class="feedback-comment-section">
                        <textarea 
                            id="feedbackText"
                            rows="3" 
                            placeholder="${translate('feedback_placeholder')}"
                            class="feedback-textarea"
                        ></textarea>
                        <div class="feedback-char-count">
                            <span id="charCount">0</span>/500
                        </div>
                    </div>

                    <!-- Disclaimer -->
                    <div class="feedback-disclaimer">
                        ${translate('feedback_disclaimer')}
                        <a href="#" class="feedback-privacy-link">${translate('privacy_statement')}</a>
                    </div>
                </div>

                <!-- Footer -->
                <div class="feedback-footer">
                    <button id="skipTodayBtn" class="feedback-secondary-btn">
                        ${translate('skip_today')}
                    </button>
                    <button id="feedbackCancelBtn" class="feedback-secondary-btn">
                        ${translate('cancel')}
                    </button>
                    <button id="feedbackSubmitBtn" class="feedback-submit-btn">
                        ${translate('submit')}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add all CSS styles
    const style = document.createElement('style');
    style.innerHTML = `
        /* Modal container */
        .feedback-modal {
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: flex-end;
            justify-content: flex-end;
            padding: 16px;
            z-index: 50;
        }
        
        /* Modal content */
        .feedback-modal-content {
            background-color: #202020;
            border: 1px solid #404040;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border-radius: 8px;
            width: 100%;
            max-width: 440px;
            overflow: hidden;
        }
        
        /* Header styles */
        .feedback-header {
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #404040;
            background-color: #262626;
        }
        
        .feedback-title {
            font-size: 14px;
            font-weight: 600;
            color: #00bcf2;
            margin: 0;
        }
        
        .feedback-close-btn {
            color: #9ca3af;
            background: transparent;
            border: none;
            padding: 4px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .feedback-close-btn:hover {
            color: white;
        }
        
        /* Body styles */
        .feedback-body {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
            justify-content: flex-start;
        }
        
        .feedback-message {
            font-size: 12px;
            color: white;
            margin: 0;
        }
        
        /* Radio options */
        .feedback-options {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding-top: 4px;
        }
        
        .feedback-option {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            font-size: 12px;
            color: white;
        }
        
        .feedback-option:hover span {
            color: #e5e5e5;
        }
        
        .satisfaction-radio {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1px solid #737373;
            background-color: transparent;
            cursor: pointer;
            margin: 0;
            position: relative;
        }
        
        .satisfaction-radio:checked {
            border-color: #00bcf2;
        }
        
        .satisfaction-radio:checked::before {
            content: '';
            position: absolute;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #00bcf2;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        /* Comment section */
        .feedback-comment-section {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding-top: 4px;
            width: 100%;
        }
        
        .feedback-textarea {
            width: 100%;
            background-color: #111111;
            border: 1px solid #525252;
            border-radius: 4px;
            padding: 8px;
            font-size: 12px;
            color: white;
            resize: none;
            font-family: inherit;
        }
        
        .feedback-textarea:focus {
            border-color: #00bcf2;
            outline: none;
        }
        
        .feedback-textarea::placeholder {
            color: #666666;
        }
        
        .feedback-char-count {
            text-align: right;
            font-size: 10px;
            color: #6b7280;
        }
        
        /* Disclaimer */
        .feedback-disclaimer {
            font-size: 10px;
            color: #6b7280;
            line-height: 1.5;
        }
        
        .feedback-privacy-link {
            color: #00bcf2;
            text-decoration: none;
            display: block;
            margin-top: 4px;
        }
        
        .feedback-privacy-link:hover {
            text-decoration: underline;
        }
        
        /* Footer */
        .feedback-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            padding: 16px;
            border-top: 1px solid #404040;
            background-color: #262626;
        }
        
        .feedback-secondary-btn {
            background-color: transparent;
            border: 1px solid #525252;
            color: white;
            font-size: 12px;
            padding: 6px 16px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .feedback-secondary-btn:hover {
            background-color: #404040;
        }
        
        .feedback-submit-btn {
            background-color: #00bcf2;
            border: 1px solid transparent;
            color: white;
            font-size: 12px;
            padding: 6px 20px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .feedback-submit-btn:hover {
            background-color: #0099cc;
        }
        
        /* Hidden state */
        .feedback-modal.hidden {
            display: none;
        }
        
        /* Responsive adjustments */
        @media (min-width: 768px) {
            .feedback-modal {
                align-items: flex-end;
                justify-content: flex-end;
                padding: 24px;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    attachFeedbackEvents();
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
    
    function attachFeedbackEvents() {
        // Close buttons
        document.getElementById('feedbackCloseBtn')?.addEventListener('click', closeFeedbackModal);
        document.getElementById('feedbackCancelBtn')?.addEventListener('click', closeFeedbackModal);
        
        // Overlay click to close
        document.getElementById('feedbackModal')?.addEventListener('click', function(e) {
            if (e.target === this) closeFeedbackModal();
        });
        
        // Submit button
        document.getElementById('feedbackSubmitBtn')?.addEventListener('click', submitFeedback);
        
        // Skip today button
        document.getElementById('skipTodayBtn')?.addEventListener('click', () => {
            counters.skippedToday = true;
            localStorage.setItem(STORAGE_KEYS.skippedToday, 'true');
            counters.lastFeedbackTimestamp = Date.now();
            saveCounters();
            showToast(translate('reminder_postponed'));
            closeFeedbackModal();
        });
        
        // Satisfaction radio buttons
        document.querySelectorAll('.satisfaction-radio').forEach(radio => {
            radio.addEventListener('change', () => {
                currentSentiment = radio.value;
            });
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeFeedbackModal();
        });
    }
    
    async function showFeedbackModal(message, type) {
      
        
        injectFeedbackModal();
        
        const modal = document.getElementById('feedbackModal');
        const messageEl = document.getElementById('feedbackMessage');
        const textarea = document.getElementById('feedbackText');
        
        currentFeedbackType = type;
        
        if (messageEl) messageEl.textContent = message;
        if (textarea) textarea.value = '';
        if (document.getElementById('charCount')) {
            document.getElementById('charCount').textContent = '0';
        }
        
        // Reset radio buttons to neutral
        const neutralRadio = document.querySelector('.satisfaction-radio[value="neutral"]');
        if (neutralRadio) neutralRadio.checked = true;
        currentSentiment = 'neutral';
        
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
        }
        
      
        log(`Modal shown for type: ${type}`);
    }
    
    function closeFeedbackModal() {
      
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
    }
    
    // ============================================
    // SUBMIT FEEDBACK
    // ============================================
    async function submitFeedback() {
        const feedbackText = document.getElementById('feedbackText')?.value?.trim();
        const submitBtn = document.getElementById('feedbackSubmitBtn');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = translate('submitting');
        }
        closeFeedbackModal();
        try {
            const client = getSB();
            const username = window.currentUser?.username || localStorage.getItem('username') || 'Anonymous';
            const deviceId = await getDeviceId();
            
            if (client) {
                try {
                    await client.from('user_feedback').insert({
                        sentiment: currentSentiment,
                        suggestions: feedbackText || `Feedback after ${currentFeedbackType}`,
                        username: username,
                        device_id: deviceId,
                        status: 'new',
                        feedback_type: currentFeedbackType,
                        created_at: new Date().toISOString()
                    });
                    console.log('✅ Feedback submitted to Supabase');
                } catch (err) {
                    console.debug('Supabase submit failed:', err.message);
                    // Save locally as fallback
                    saveFeedbackLocally(feedbackText);
                }
            } else {
                saveFeedbackLocally(feedbackText);
            }
            
            showToast(translate('thank_you_feedback'));
            closeFeedbackModal();
            
        } catch (err) {
            console.error('Feedback error:', err);
            saveFeedbackLocally(feedbackText);
            showToast(translate('feedback_saved_locally'));
            closeFeedbackModal();
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = translate('submit');
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
        console.log('✅ Feedback saved locally');
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
    // SINGLE INITIALIZATION
    // ============================================
    function initAll() {
        log('Initializing all systems...');
        injectFeedbackModal();
        setTimeout(autoHookFunctions, 1500);
        console.log('✅ All systems initialized');
    
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
   
})();
