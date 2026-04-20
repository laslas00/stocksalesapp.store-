// index.js - The "Smart Bridge" Fix
// index.js
const API_BASE = 'https://www.stocksalesapp.store';

console.log("📡 App connecting to API via:", API_BASE);

console.log("📡 App connecting to API via:", API_BASE);

console.log("📡 App connecting to API via:", API_BASE);

// ==================== PERSISTENT DEVICE ID ====================
// IndexedDB wrapper (promise-based)
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

// Generate a simple fingerprint (you can improve with more entropy)
function generateFingerprint() {
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.deviceMemory || 'unknown',
        // Add more stable components
    ];
    // Simple hash (djb2)
    const str = components.join('|||');
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return 'fp_' + (hash >>> 0).toString(36);
}

// Main device ID function
async function getDeviceId() {
    // 1. Try Electron machine ID (if in Electron)
    if (window.electronAPI && typeof window.electronAPI.getMachineId === 'function') {
        try {
            const machineId = await window.electronAPI.getMachineId();
            if (machineId) {
                // Cache in localStorage for speed, but rely on machineId as source of truth
                localStorage.setItem('deviceId', machineId);
                return machineId;
            }
        } catch (e) {
            console.warn('Machine ID failed:', e);
        }
    }

    // 2. Check if we already have a fingerprint in IndexedDB
    const storedFp = await getStoredFingerprint();
    if (storedFp) {
        // Also cache in localStorage for quick access
        localStorage.setItem('deviceId', storedFp);
        return storedFp;
    }

    // 3. Generate a new fingerprint
    const newFp = generateFingerprint();
    await setStoredFingerprint(newFp);
    localStorage.setItem('deviceId', newFp);
    return newFp;
}

// ==================== CONNECTION CHECKING ====================
async function checkServerConnection(maxRetries = 5, retryDelay = 1000) {
    console.log('🔌 Checking connection to server...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const response = await fetch(`${API_BASE}/api/ping`, {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log(`✅ Server connection established (attempt ${attempt})`);
                return true;
            }
        } catch (error) {
            console.warn(`⚠️ Connection attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            if (attempt < maxRetries) {
                // Wait with exponential backoff
                const waitTime = retryDelay * Math.pow(1.5, attempt - 1);
                console.log(`⏳ Retrying in ${Math.round(waitTime)}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    console.error('❌ Could not connect to server after multiple attempts');
    return false;
}

// ==================== SETUP STATUS CHECKING ====================
async function checkSetupStatus() {
    try {
        // Check if setup is already marked as complete in localStorage
        const localSetup = localStorage.getItem('StockApp*_setup');
        if (localSetup) {
            const setup = JSON.parse(localSetup);
            if (!setup.isFirstTime) {
                return true;
            }
        }
        
        // Check server
        const response = await fetch(`${API_BASE}/api/business-info`);
        if (response.ok) {
            const businessInfo = await response.json();
            const isBusinessInfoEmpty = !businessInfo.name || businessInfo.name.trim() === '';
            return !isBusinessInfoEmpty;
        }
        return false;
    } catch (error) {
        console.error('Error checking setup:', error);
        return false;
    }
}

// ==================== DEVICE BACKUP RESTORE ====================
async function checkAndRestoreDeviceBackup() {
    const deviceId = await getDeviceId();
    try {
        const response = await fetch(`${API_BASE}/api/device-backup/${deviceId}`);
        if (!response.ok) return; // No backup

        const backup = await response.json();

        // Silently restore data to localStorage
        for (const [key, value] of Object.entries(backup.data)) {
            localStorage.setItem(key, value);
        }

        console.log('✅ Restored from backup');
    } catch (err) {
        console.error('Restore check failed:', err);
    }
}

// ==================== LANGUAGE LOADING ====================
async function loadLanguage() {
    let currentLanguage = 'en';
    try {
        const response = await fetch(`${API_BASE}/api/business-info`);
        if (response.ok) {
            const data = await response.json();
            if (data.currentLanguage) {
                currentLanguage = data.currentLanguage;
                localStorage.setItem('language', currentLanguage);
            }
        }
    } catch (error) {
        console.log('Using default language from localStorage');
        currentLanguage = localStorage.getItem('language') || 'en';
    }
    return currentLanguage;
}

// ==================== SPLASH SCREEN ANIMATION ====================
async function initializeSplash() {
    // Get loading messages from translations
    const currentLanguage = localStorage.getItem('language') || 'en';
    const loadingMessages = (translations[currentLanguage] && translations[currentLanguage].loadingMessages) || 
                           translations.en.loadingMessages;

    // Create status dots
    const statusDots = document.getElementById('status-dots');
    if (statusDots) {
        loadingMessages.forEach(() => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            statusDots.appendChild(dot);
        });
    }

    // Initialize progress elements
    const progressBar = document.getElementById('progress-bar');
    const loadingText = document.getElementById('loading-text');
    const dots = document.querySelectorAll('.dot');
    
    let progress = 0;
    let msgIndex = 0;

    function updateProgress() {
        // Update progress bar
        progress = Math.min(100, progress + 12.5);
        if (progressBar) progressBar.style.width = progress + "%";
        
        // Update loading text
        if (msgIndex < loadingMessages.length && loadingText) {
            loadingText.textContent = loadingMessages[msgIndex];
            loadingText.style.opacity = '0.7';
            setTimeout(() => {
                loadingText.style.opacity = '1';
            }, 10);
        }
        
        // Update status dots
        if (msgIndex > 0 && dots[msgIndex - 1]) {
            dots[msgIndex - 1].classList.remove('active');
        }
        if (msgIndex < dots.length && dots[msgIndex]) {
            dots[msgIndex].classList.add('active');
        }
        
        msgIndex++;
    }

    // Start the progress animation
    updateProgress();
    
    const interval = setInterval(() => {
        if (msgIndex < loadingMessages.length) {
            updateProgress();
        } else if (progress >= 100) {
            clearInterval(interval);
            // Add completion animation
            if (progressBar) progressBar.style.background = 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)';
            if (loadingText) {
                loadingText.textContent = "Ready!";
                loadingText.style.fontWeight = '600';
            }
            
            // Animate all dots
            dots.forEach(dot => {
                if (dot) {
                    dot.style.background = '#4facfe';
                    dot.style.animation = 'pulse 1s infinite';
                }
            });
        } else {
            // Continue progress bar
            progress = Math.min(100, progress + 2);
            if (progressBar) progressBar.style.width = progress + "%";
        }
    }, 550);
}

// ==================== MAIN INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Show initial status
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = 'Checking server connection...';
        }

        // STEP 1: Check server connection first (with retries)
        const isConnected = await checkServerConnection();
        
        if (!isConnected) {
            // Show error message
            if (loadingText) {
                loadingText.textContent = 'Cannot connect to server!';
                loadingText.style.color = '#ef4444';
            }
            
            // Create error UI
            const container = document.querySelector('.splash-container');
            if (container) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'connection-error';
                errorDiv.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 48px; margin-bottom: 20px;"></i>
                    <h3 style="color: white; margin-bottom: 10px;">Connection Failed</h3>
                    <p style="color: #94a3b8; margin-bottom: 20px;">Cannot connect to StockApp server at ${API_BASE}</p>
                    <button onclick="window.location.reload()" class="retry-btn" 
                        style="background: #3b82f6; color: white; border: none; padding: 10px 30px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-redo-alt mr-2"></i>Restart App
                    </button>
                `;
                container.appendChild(errorDiv);
            }
            
            console.error('❌ Cannot proceed without server connection');
            return; // Stop initialization
        }

        // STEP 2: Restore device backup (if any)
        if (loadingText) loadingText.textContent = 'Restoring device data...';
        await checkAndRestoreDeviceBackup();

        // STEP 3: Load language
        if (loadingText) loadingText.textContent = 'Loading language preferences...';
        const currentLanguage = await loadLanguage();

        // STEP 4: Check setup status
        if (loadingText) loadingText.textContent = 'Checking system status...';
        const isSetupComplete = await checkSetupStatus();

        // STEP 5: Start splash animation
        initializeSplash();

        // STEP 6: Redirect after animation
        setTimeout(() => {
            sessionStorage.setItem('cameFromSplash', '1');
            
            const url = isSetupComplete 
                ? `shop.html?lang=${encodeURIComponent(currentLanguage)}`
                : `setup.html?lang=${encodeURIComponent(currentLanguage)}`;
            
            console.log('Splash redirecting to:', url);
            console.log('Setup complete?', isSetupComplete);
            
            if (window.electronAPI && typeof window.electronAPI.createNewWindow === 'function') {
                window.electronAPI.createNewWindow(url);
            } else {
                window.location.href = url;
            }
        }, 5000);

    } catch (error) {
        console.error('❌ Fatal error during initialization:', error);
        
        // Show error to user
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = 'Initialization failed!';
            loadingText.style.color = '#ef4444';
        }
        
        // Create error UI
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

// Add CSS for error states
const style = document.createElement('style');
style.textContent = `
    .connection-error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        background: rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
        padding: 40px;
        border-radius: 20px;
        border: 1px solid rgba(239, 68, 68, 0.3);
        animation: fadeIn 0.5s ease;
        z-index: 100000000000000000000000000000000000000000000000000000000000000000;
    }
    
    .retry-btn {
        transition: all 0.3s ease;
    }
    
    .retry-btn:hover {
        background: #2563eb !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -40%); }
        to { opacity: 1; transform: translate(-50%, -50%); }
    }
`;
document.head.appendChild(style);
