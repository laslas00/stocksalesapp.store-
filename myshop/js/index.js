
const MYSUPABASE_URL = 'https://axndkzmmzwpvwuftbkuw.supabase.co';
const  MY_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4bmRrem1tendwdnd1ZnRia3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTc4ODIsImV4cCI6MjA5MzI5Mzg4Mn0.RqV7d3p0FMFQn_RO_ncxHVtfQbM41eBYceJbwsrGu9A';

// Initialize Supabase client
let setupDB = null;

function getSetupDB() {
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

console.log("📡 App using Supabase:", MYSUPABASE_URL);

// ==================== PERSISTENT DEVICE ID ====================
const DB_NAME = 'StockApp*DeviceDB';
const STORE_NAME = 'device';
const DB_VERSION = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function getStoredFingerprint() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get('fingerprint');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return null;
    }
}

async function setStoredFingerprint(fp) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(fp, 'fingerprint');
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch {
        // fail silently
    }
}

function generateFingerprint() {
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.deviceMemory || 'unknown',
    ];
    const str = components.join('|||');
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return 'fp_' + (hash >>> 0).toString(36);
}

async function getDeviceId() {
    // 1. Try Electron machine ID
    if (window.electronAPI && typeof window.electronAPI.getMachineId === 'function') {
        try {
            const machineId = await window.electronAPI.getMachineId();
            if (machineId) {
                localStorage.setItem('deviceId', machineId);
                return machineId;
            }
        } catch (e) {
            console.warn('Machine ID failed:', e);
        }
    }

    // 2. Check IndexedDB
    const storedFp = await getStoredFingerprint();
    if (storedFp) {
        localStorage.setItem('deviceId', storedFp);
        return storedFp;
    }

    // 3. Generate new fingerprint
    const newFp = generateFingerprint();
    await setStoredFingerprint(newFp);
    localStorage.setItem('deviceId', newFp);
    return newFp;
}

// ==================== SUPABASE HEALTH CHECK ====================
async function checkSupabaseConnection(maxRetries = 3, retryDelay = 1500) {
    console.log('🔌 Checking Supabase connection...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const client =  getSetupDB();
            if (!client) {
                console.warn(`⚠️ Supabase client not ready (attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                continue;
            }

            // Test connection with a simple query
            const { data, error } = await client
                .from('business_info')
                .select('id')
                .limit(1);

            if (!error) {
                console.log(`✅ Supabase connected (attempt ${attempt})`);
                return true;
            }

            // If error is about table not found, that's OK - connection works
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                console.log('✅ Supabase connected (tables ready for setup)');
                return true;
            }

            console.warn(`⚠️ Connection attempt ${attempt} failed:`, error.message);

        } catch (error) {
            console.warn(`⚠️ Connection attempt ${attempt}/${maxRetries} failed:`, error.message);
        }

        if (attempt < maxRetries) {
            const waitTime = retryDelay * Math.pow(1.5, attempt - 1);
            console.log(`⏳ Retrying in ${Math.round(waitTime)}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    
    console.error('❌ Could not connect to Supabase after multiple attempts');
    return false;
}

// ==================== SETUP STATUS CHECK ====================
async function checkSetupStatus() {
    try {
        // Check localStorage first
        const localSetup = localStorage.getItem('StockApp_setup');
        if (localSetup) {
            const setup = JSON.parse(localSetup);
            if (setup.isFirstTime === false) {
                console.log('✅ Setup already complete (localStorage)');
                return true;
            }
        }

        // Check if setup_completed flag exists
        const setupCompleted = localStorage.getItem('setup_completed');
        if (setupCompleted === 'true') {
            console.log('✅ Setup already complete (setup_completed flag)');
            return true;
        }

        // Check Supabase for existing business info
        const client =  getSetupDB();
        if (client) {
            const { data, error } = await client
                .from('business_info')
                .select('name, setup_completed')
                .eq('setup_completed', true)
                .limit(1);

            if (!error && data && data.length > 0) {
                console.log('✅ Setup completed (Supabase)');
                // Update localStorage
                localStorage.setItem('setup_completed', 'true');
                localStorage.setItem('StockApp_setup', JSON.stringify({
                    isFirstTime: false,
                    completedAt: new Date().toISOString(),
                    businessName: data[0].name
                }));
                return true;
            }
        }

        console.log('🆕 Setup required - no data found');
        return false;

    } catch (error) {
        console.error('Error checking setup:', error);
        return false;
    }
}

// ==================== LANGUAGE LOADING ====================
function getLanguage() {
    // Get from URL first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang) {
        localStorage.setItem('language', urlLang);
        return urlLang;
    }

    // Get from localStorage
    const storedLang = localStorage.getItem('language');
    if (storedLang) return storedLang;

    // Get from browser
    const browserLang = navigator.language.split('-')[0];
    const supportedLangs = ['en', 'fr', 'sw', 'hi', 'ms', 'ar', 'es', 'zh'];
    if (supportedLangs.includes(browserLang)) {
        localStorage.setItem('language', browserLang);
        return browserLang;
    }

    return 'en';
}

// ==================== SPLASH SCREEN ANIMATION ====================
async function initializeSplash() {
    const currentLanguage = getLanguage();
    
    // Fallback loading messages
    const loadingMessages = [
        'Initializing system...',
        'Connecting to database...',
        'Loading preferences...',
        'Checking system status...',
        'Preparing workspace...',
        'Almost ready...'
    ];

    // Try to use translations if available
    let messages = loadingMessages;
    if (typeof translations !== 'undefined') {
        const langTranslations = translations[currentLanguage] || translations.en;
        if (langTranslations && langTranslations.loadingMessages) {
            messages = langTranslations.loadingMessages;
        }
    }

    // Create status dots
    const statusDots = document.getElementById('status-dots');
    if (statusDots) {
        statusDots.innerHTML = '';
        messages.forEach(() => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            statusDots.appendChild(dot);
        });
    }

    const progressBar = document.getElementById('progress-bar');
    const loadingText = document.getElementById('loading-text');
    const dots = document.querySelectorAll('.dot');
    
    let progress = 0;
    let msgIndex = 0;

    function updateProgress() {
        progress = Math.min(100, progress + (100 / messages.length));
        if (progressBar) progressBar.style.width = progress + "%";
        
        if (msgIndex < messages.length && loadingText) {
            loadingText.textContent = messages[msgIndex];
            loadingText.style.opacity = '0.7';
            setTimeout(() => {
                loadingText.style.opacity = '1';
            }, 10);
        }
        
        if (msgIndex > 0 && dots[msgIndex - 1]) {
            dots[msgIndex - 1].classList.remove('active');
        }
        if (msgIndex < dots.length && dots[msgIndex]) {
            dots[msgIndex].classList.add('active');
        }
        
        msgIndex++;
    }

    updateProgress();
    
    const interval = setInterval(() => {
        if (msgIndex < messages.length) {
            updateProgress();
        } else if (progress >= 100) {
            clearInterval(interval);
            if (progressBar) progressBar.style.background = 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)';
            if (loadingText) {
                loadingText.textContent = "Ready!";
                loadingText.style.fontWeight = '600';
            }
            dots.forEach(dot => {
                if (dot) {
                    dot.style.background = '#4facfe';
                    dot.style.animation = 'pulse 1s infinite';
                }
            });
        } else {
            progress = Math.min(100, progress + 2);
            if (progressBar) progressBar.style.width = progress + "%";
        }
    }, 550);
}

// ==================== MAIN INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const loadingText = document.getElementById('loading-text');
        
        // STEP 1: Initialize Supabase
        if (loadingText) loadingText.textContent = 'Initializing database...';
        const client =  getSetupDB();
        
        if (!client) {
            throw new Error('Supabase client failed to initialize. Please refresh the page.');
        }

        // STEP 2: Check connection
        if (loadingText) loadingText.textContent = 'Connecting to server...';
        const isConnected = await checkSupabaseConnection();
        
        if (!isConnected) {
            if (loadingText) {
                loadingText.textContent = 'Cannot connect to database!';
                loadingText.style.color = '#ef4444';
            }
            
            const container = document.querySelector('.splash-container');
            if (container) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'connection-error';
                errorDiv.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 48px; margin-bottom: 20px;"></i>
                    <h3 style="color: white; margin-bottom: 10px;">Connection Failed</h3>
                    <p style="color: #94a3b8; margin-bottom: 20px;">Cannot connect to database. Check your internet connection.</p>
                    <button onclick="window.location.reload()" class="retry-btn" 
                        style="background: #3b82f6; color: white; border: none; padding: 10px 30px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-redo-alt mr-2"></i>Retry
                    </button>
                `;
                container.appendChild(errorDiv);
            }
            return;
        }

        // STEP 3: Get device ID
        if (loadingText) loadingText.textContent = 'Loading device data...';
        const deviceId = await getDeviceId();
        console.log('📱 Device ID:', deviceId);

        // STEP 4: Get language
        if (loadingText) loadingText.textContent = 'Loading language...';
        const currentLanguage = getLanguage();
        console.log('🌐 Language:', currentLanguage);

        // STEP 5: Check setup status
        if (loadingText) loadingText.textContent = 'Checking system status...';
        const isSetupComplete = await checkSetupStatus();
        console.log('📋 Setup complete?', isSetupComplete);

        // STEP 6: Start splash animation
        initializeSplash();

        // STEP 7: Redirect to appropriate page
        setTimeout(() => {
            sessionStorage.setItem('cameFromSplash', '1');
            
            const url = isSetupComplete 
                ? `shop.html?lang=${encodeURIComponent(currentLanguage)}`
                : `setup.html?lang=${encodeURIComponent(currentLanguage)}`;
            
            console.log('🚀 Redirecting to:', url);
            
            // Always use window.location for web deployment
            window.location.href = url;
            
        }, 5000);

    } catch (error) {
        console.error('❌ Fatal error during initialization:', error);
        
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = 'Initialization failed!';
            loadingText.style.color = '#ef4444';
        }
        
        const container = document.querySelector('.splash-container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'connection-error';
            errorDiv.innerHTML = `
                <i class="fas fa-exclamation-circle" style="color: #ef4444; font-size: 48px; margin-bottom: 20px;"></i>
                <h3 style="color: white; margin-bottom: 10px;">System Error</h3>
                <p style="color: #94a3b8; margin-bottom: 20px;">${error.message || 'An unexpected error occurred'}</p>
                <button onclick="window.location.reload()" class="retry-btn" 
                    style="background: #3b82f6; color: white; border: none; padding: 10px 30px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-redo-alt mr-2"></i>Retry
                </button>
            `;
            container.appendChild(errorDiv);
        }
    }
});